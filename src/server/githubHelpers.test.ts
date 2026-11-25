import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGithubAuthorizeUrl,
  formatScorecardGistMarkdown,
  getGithubCallbackUrl,
  normalizeBaseUrl,
  sanitizeHttpsUrl,
  validateScorecardPayload,
} from './githubHelpers';

test('normalizeBaseUrl and getGithubCallbackUrl handle APP_URL and trailing slashes safely', () => {
  assert.equal(normalizeBaseUrl(undefined), 'http://localhost:3000');
  assert.equal(normalizeBaseUrl('MY_APP_URL'), 'http://localhost:3000');
  assert.equal(
    getGithubCallbackUrl('https://example.run.app///'),
    'https://example.run.app/auth/github/callback'
  );
});

test('buildGithubAuthorizeUrl points directly to GitHub OAuth authorize endpoint with state and scopes', () => {
  const url = buildGithubAuthorizeUrl(
    'client-123',
    'https://example.run.app/auth/github/callback',
    'state-abc'
  );
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://github.com');
  assert.equal(parsed.pathname, '/login/oauth/authorize');
  assert.equal(parsed.searchParams.get('client_id'), 'client-123');
  assert.equal(
    parsed.searchParams.get('redirect_uri'),
    'https://example.run.app/auth/github/callback'
  );
  assert.equal(parsed.searchParams.get('state'), 'state-abc');
  assert.equal(parsed.searchParams.get('scope'), 'read:user gist');
});

test('sanitizeHttpsUrl blocks non-https schemes including javascript and data URLs', () => {
  assert.equal(sanitizeHttpsUrl('https://avatars.githubusercontent.com/u/1'), 'https://avatars.githubusercontent.com/u/1');
  assert.equal(sanitizeHttpsUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeHttpsUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeHttpsUrl('http://insecure.example.com'), null);
});

test('validateScorecardPayload rejects malformed input and formats clean Markdown Gist', () => {
  assert.equal(validateScorecardPayload(null), null);
  assert.equal(validateScorecardPayload({ holes: [] }), null);
  assert.equal(
    validateScorecardPayload({ holes: [{ id: 1, name: 'Test', par: -1, strokes: 2 }] }),
    null
  );

  const valid = validateScorecardPayload({
    holes: [
      { id: 1, name: 'Sunny Straightaway', par: 2, strokes: 1 },
      { id: 2, name: 'Timber Ricochet', par: 3, strokes: 3 },
    ],
  });
  assert.ok(valid);
  assert.equal(valid.totalPar, 5);
  assert.equal(valid.totalStrokes, 4);

  const md = formatScorecardGistMarkdown('octocat', valid);
  assert.ok(md.includes('@octocat'));
  assert.ok(md.includes('-1 Under Par'));
  assert.ok(md.includes('Sunny Straightaway'));
});
