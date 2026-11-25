import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import {
  buildGithubAuthorizeUrl,
  formatScorecardGistMarkdown,
  getGithubCallbackUrl,
  sanitizeHttpsUrl,
  validateScorecardPayload,
} from './src/server/githubHelpers.ts';

interface GithubUserProfile {
  id: number;
  login: string;
  name: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  publicRepos: number;
}

interface GithubSession {
  accessToken: string;
  user: GithubUserProfile;
  createdAt: number;
}

const PORT = 3000;
const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const pendingOAuthStates = new Map<string, number>();
const activeSessions = new Map<string, GithubSession>();

function pruneExpiredMaps(): void {
  const now = Date.now();
  for (const [state, createdAt] of pendingOAuthStates.entries()) {
    if (now - createdAt > STATE_TTL_MS) {
      pendingOAuthStates.delete(state);
    }
  }
  for (const [token, session] of activeSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      activeSessions.delete(token);
    }
  }
}

function readBearerToken(req: Request): string | null {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length >= 32 ? token : null;
}

function getAuthenticatedSession(req: Request): GithubSession | null {
  pruneExpiredMaps();
  const token = readBearerToken(req);
  if (!token) return null;
  return activeSessions.get(token) ?? null;
}

function renderPopupResultHtml(payload: {
  type: 'GITHUB_OAUTH_SUCCESS' | 'GITHUB_OAUTH_ERROR';
  sessionToken?: string;
  message?: string;
}): string {
  // Serialize strictly via JSON and escape '<' to prevent script tag breakouts
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
  const statusText =
    payload.type === 'GITHUB_OAUTH_SUCCESS'
      ? 'GitHub connected! This window will close automatically.'
      : 'GitHub sign-in could not be completed. You may close this window.';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GitHub Connection — Pocket Golf</title>
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        background: #0e859a;
        color: #fff8e7;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        text-align: center;
        padding: 24px;
      }
      .card {
        background: #fff8e7;
        color: #3b1d0e;
        border: 4px solid #522810;
        border-radius: 20px;
        padding: 24px 28px;
        max-width: 360px;
        box-shadow: 0 8px 0 #522810;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <p>${statusText}</p>
    </div>
    <script>
      (function () {
        var msg = ${serialized};
        if (window.opener && typeof window.opener.postMessage === 'function') {
          window.opener.postMessage(msg, '*');
          window.close();
        }
      })();
    </script>
  </body>
</html>`;
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  // Returns GitHub OAuth authorization URL for popup-based sign-in
  app.get('/api/auth/github/url', (_req: Request, res: Response) => {
    pruneExpiredMaps();
    const clientId = (process.env.GITHUB_CLIENT_ID ?? '').trim();
    const clientSecret = (process.env.GITHUB_CLIENT_SECRET ?? '').trim();
    const callbackUrl = getGithubCallbackUrl(process.env.APP_URL);

    if (!clientId || !clientSecret) {
      res.status(503).json({
        configured: false,
        callbackUrl,
        error:
          'GitHub OAuth credentials are not configured yet. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in AI Studio Secrets.',
      });
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    pendingOAuthStates.set(state, Date.now());
    const url = buildGithubAuthorizeUrl(clientId, callbackUrl, state);

    res.json({ configured: true, url, callbackUrl });
  });

  // OAuth callback handler (handles both with and without trailing slash)
  const handleGithubCallback = async (req: Request, res: Response) => {
    pruneExpiredMaps();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

    if (oauthError) {
      res.status(400).send(
        renderPopupResultHtml({
          type: 'GITHUB_OAUTH_ERROR',
          message: 'GitHub authorization was cancelled.',
        })
      );
      return;
    }

    if (!code || !state || !pendingOAuthStates.has(state)) {
      res.status(400).send(
        renderPopupResultHtml({
          type: 'GITHUB_OAUTH_ERROR',
          message: 'Invalid or expired authorization state. Please try connecting again.',
        })
      );
      return;
    }
    pendingOAuthStates.delete(state);

    const clientId = (process.env.GITHUB_CLIENT_ID ?? '').trim();
    const clientSecret = (process.env.GITHUB_CLIENT_SECRET ?? '').trim();
    const redirectUri = getGithubCallbackUrl(process.env.APP_URL);

    if (!clientId || !clientSecret) {
      res.status(503).send(
        renderPopupResultHtml({
          type: 'GITHUB_OAUTH_ERROR',
          message: 'GitHub OAuth credentials are not configured on the server.',
        })
      );
      return;
    }

    try {
      const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Pocket-Golf-Trick-Shots',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResp.ok) {
        res.status(502).send(
          renderPopupResultHtml({
            type: 'GITHUB_OAUTH_ERROR',
            message: 'GitHub token exchange failed.',
          })
        );
        return;
      }

      const tokenData = (await tokenResp.json()) as {
        access_token?: string;
        error_description?: string;
      };
      if (!tokenData.access_token) {
        res.status(400).send(
          renderPopupResultHtml({
            type: 'GITHUB_OAUTH_ERROR',
            message: 'Could not obtain a GitHub access token.',
          })
        );
        return;
      }

      const userResp = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Pocket-Golf-Trick-Shots',
        },
      });

      if (!userResp.ok) {
        res.status(502).send(
          renderPopupResultHtml({
            type: 'GITHUB_OAUTH_ERROR',
            message: 'Could not load your GitHub profile.',
          })
        );
        return;
      }

      const rawUser = (await userResp.json()) as {
        id?: number;
        login?: string;
        name?: string | null;
        avatar_url?: string;
        html_url?: string;
        public_repos?: number;
      };

      if (!rawUser.login || typeof rawUser.id !== 'number') {
        res.status(502).send(
          renderPopupResultHtml({
            type: 'GITHUB_OAUTH_ERROR',
            message: 'Unexpected profile response from GitHub.',
          })
        );
        return;
      }

      const sessionToken = crypto.randomBytes(32).toString('hex');
      activeSessions.set(sessionToken, {
        accessToken: tokenData.access_token,
        createdAt: Date.now(),
        user: {
          id: rawUser.id,
          login: rawUser.login,
          name: (rawUser.name || rawUser.login).slice(0, 80),
          avatarUrl: sanitizeHttpsUrl(rawUser.avatar_url),
          profileUrl: sanitizeHttpsUrl(rawUser.html_url),
          publicRepos: typeof rawUser.public_repos === 'number' ? rawUser.public_repos : 0,
        },
      });

      res.send(
        renderPopupResultHtml({
          type: 'GITHUB_OAUTH_SUCCESS',
          sessionToken,
        })
      );
    } catch {
      res.status(500).send(
        renderPopupResultHtml({
          type: 'GITHUB_OAUTH_ERROR',
          message: 'Network error while connecting to GitHub.',
        })
      );
    }
  };

  app.get(['/auth/github/callback', '/auth/github/callback/'], handleGithubCallback);

  // Authenticated profile lookup using server-verified Bearer session token
  app.get('/api/github/me', (req: Request, res: Response) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ error: 'Not connected to GitHub.' });
      return;
    }
    res.json({ user: session.user });
  });

  // Save a completed 12-hole scorecard to the connected user's GitHub Gists
  app.post('/api/github/share-scorecard', async (req: Request, res: Response) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ error: 'Connect your GitHub account first to save scorecards.' });
      return;
    }

    const payload = validateScorecardPayload(req.body);
    if (!payload) {
      res.status(400).json({ error: 'Invalid scorecard data.' });
      return;
    }

    try {
      const markdown = formatScorecardGistMarkdown(session.user.login, payload);
      const gistResp = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Pocket-Golf-Trick-Shots',
        },
        body: JSON.stringify({
          description: `POCKET GOLF — Trick Shots Scorecard (${payload.totalStrokes} strokes / Par ${payload.totalPar})`,
          public: false,
          files: {
            'pocket-golf-scorecard.md': {
              content: markdown,
            },
          },
        }),
      });

      if (!gistResp.ok) {
        res.status(502).json({
          error: 'GitHub could not save the scorecard Gist. Ensure gist permission was granted.',
        });
        return;
      }

      const gistData = (await gistResp.json()) as { html_url?: string };
      const gistUrl = sanitizeHttpsUrl(gistData.html_url);
      if (!gistUrl) {
        res.status(502).json({ error: 'Unexpected Gist URL returned by GitHub.' });
        return;
      }

      res.json({ gistUrl });
    } catch {
      res.status(500).json({ error: 'Failed to reach GitHub API.' });
    }
  });

  // Disconnect / invalidate server-side session token
  app.post('/api/auth/github/logout', (req: Request, res: Response) => {
    const token = readBearerToken(req);
    if (token) {
      activeSessions.delete(token);
    }
    res.json({ ok: true });
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pocket Golf server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
