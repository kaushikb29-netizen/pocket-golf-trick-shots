import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScorecardEntry } from '../server/githubHelpers';

export interface GithubUser {
  id: number;
  login: string;
  name: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  publicRepos: number;
}

export interface UseGithubAuthResult {
  user: GithubUser | null;
  connecting: boolean;
  error: string | null;
  callbackUrlHint: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
  shareScorecard: (holes: ScorecardEntry[]) => Promise<string>;
}

export function useGithubAuth(): UseGithubAuthResult {
  // Hold opaque server-issued session token strictly in React memory (never localStorage/sessionStorage)
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [user, setUser] = useState<GithubUser | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callbackUrlHint, setCallbackUrlHint] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = sessionToken;

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const resp = await fetch('/api/github/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        setSessionToken(null);
        setUser(null);
        setError('Could not load your GitHub profile. Please reconnect.');
        return;
      }
      const data = (await resp.json()) as { user?: GithubUser };
      if (data.user) {
        setUser(data.user);
        setError(null);
        setCallbackUrlHint(null);
      }
    } catch {
      setError('Network error while fetching GitHub profile.');
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let allowedOrigin = event.origin === window.location.origin;
      if (!allowedOrigin) {
        try {
          const parsed = new URL(event.origin);
          const isHttpsRunApp =
            parsed.protocol === 'https:' && parsed.hostname.endsWith('.run.app');
          const isLocalhost =
            parsed.protocol === 'http:' &&
            (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
          allowedOrigin = isHttpsRunApp || isLocalhost;
        } catch {
          allowedOrigin = false;
        }
      }
      if (!allowedOrigin) {
        return;
      }
      if (!event.data || typeof event.data !== 'object') return;
      const msg = event.data as {
        type?: string;
        sessionToken?: string;
        message?: string;
      };

      if (msg.type === 'GITHUB_OAUTH_SUCCESS' && typeof msg.sessionToken === 'string') {
        setSessionToken(msg.sessionToken);
        void fetchProfile(msg.sessionToken);
      } else if (msg.type === 'GITHUB_OAUTH_ERROR') {
        setConnecting(false);
        setError(msg.message || 'GitHub sign-in was cancelled or failed.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchProfile]);

  const connect = useCallback(async () => {
    setError(null);
    setCallbackUrlHint(null);
    setConnecting(true);

    try {
      const resp = await fetch('/api/auth/github/url');
      const data = (await resp.json()) as {
        url?: string;
        configured?: boolean;
        callbackUrl?: string;
        error?: string;
      };

      if (!resp.ok || !data.url) {
        setConnecting(false);
        setError(data.error || 'GitHub OAuth is not configured yet.');
        if (data.callbackUrl) {
          setCallbackUrlHint(data.callbackUrl);
        }
        return;
      }

      // Open GitHub's authorization URL directly in a popup (required in iframe preview)
      const authWindow = window.open(
        data.url,
        'github_oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        setConnecting(false);
        setError('Popup was blocked by your browser. Please allow popups and try again.');
        return;
      }

      // If user closes popup manually without finishing, reset loading spinner cleanly
      const pollId = window.setInterval(() => {
        if (authWindow.closed) {
          window.clearInterval(pollId);
          setConnecting((prev) => (tokenRef.current ? prev : false));
        }
      }, 600);
    } catch {
      setConnecting(false);
      setError('Could not reach the server to start GitHub connection.');
    }
  }, []);

  const disconnect = useCallback(async () => {
    const token = tokenRef.current;
    setSessionToken(null);
    setUser(null);
    setError(null);
    setCallbackUrlHint(null);
    if (!token) return;
    try {
      await fetch('/api/auth/github/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Best-effort server session cleanup
    }
  }, []);

  const shareScorecard = useCallback(async (holes: ScorecardEntry[]): Promise<string> => {
    const token = tokenRef.current;
    if (!token) {
      throw new Error('Connect GitHub first to save your scorecard.');
    }
    const resp = await fetch('/api/github/share-scorecard', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ holes }),
    });
    const data = (await resp.json()) as { gistUrl?: string; error?: string };
    if (!resp.ok || !data.gistUrl) {
      throw new Error(data.error || 'Could not save scorecard to GitHub.');
    }
    return data.gistUrl;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setCallbackUrlHint(null);
  }, []);

  return {
    user,
    connecting,
    error,
    callbackUrlHint,
    connect,
    disconnect,
    clearError,
    shareScorecard,
  };
}
