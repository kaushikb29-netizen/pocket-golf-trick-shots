export interface ScorecardEntry {
  id: number;
  name: string;
  par: number;
  strokes: number;
}

export interface ScorecardSharePayload {
  holes: ScorecardEntry[];
  totalStrokes: number;
  totalPar: number;
}

export function normalizeBaseUrl(appUrl: string | undefined): string {
  const trimmed = (appUrl ?? '').trim();
  if (!trimmed || trimmed === 'MY_APP_URL') {
    return 'http://localhost:3000';
  }
  return trimmed.replace(/\/+$/, '');
}

export function getGithubCallbackUrl(appUrl: string | undefined): string {
  return `${normalizeBaseUrl(appUrl)}/auth/github/callback`;
}

export function buildGithubAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user gist',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export function sanitizeHttpsUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function validateScorecardPayload(body: unknown): ScorecardSharePayload | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.holes) || record.holes.length === 0 || record.holes.length > 36) {
    return null;
  }

  const holes: ScorecardEntry[] = [];
  let sumStrokes = 0;
  let sumPar = 0;

  for (const item of record.holes) {
    if (!item || typeof item !== 'object') return null;
    const h = item as Record<string, unknown>;
    const id = Number(h.id);
    const par = Number(h.par);
    const strokes = Number(h.strokes);
    const name = typeof h.name === 'string' ? h.name.trim().slice(0, 64) : '';

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id > 100 ||
      !Number.isInteger(par) ||
      par < 1 ||
      par > 20 ||
      !Number.isInteger(strokes) ||
      strokes < 0 ||
      strokes > 99 ||
      !name
    ) {
      return null;
    }

    holes.push({ id, name, par, strokes });
    sumStrokes += strokes;
    sumPar += par;
  }

  return {
    holes,
    totalStrokes: sumStrokes,
    totalPar: sumPar,
  };
}

export function formatScorecardGistMarkdown(
  login: string,
  payload: ScorecardSharePayload
): string {
  const diff = payload.totalStrokes - payload.totalPar;
  const delta =
    diff === 0 ? 'Even Par' : diff < 0 ? `${diff} Under Par` : `+${diff} Over Par`;

  const lines: string[] = [
    `# POCKET GOLF — Trick Shots Scorecard`,
    ``,
    `- **Player:** @${login}`,
    `- **Total Strokes:** ${payload.totalStrokes}`,
    `- **Total Par:** ${payload.totalPar}`,
    `- **Performance:** ${delta}`,
    ``,
    `| Hole | Course | Par | Strokes |`,
    `| ---: | :--- | :---: | :---: |`,
  ];

  for (const hole of payload.holes) {
    const safeName = hole.name.replace(/\|/g, '/');
    lines.push(`| ${hole.id} | ${safeName} | ${hole.par} | ${hole.strokes} |`);
  }

  lines.push(`| **Total** | **${payload.holes.length} Holes** | **${payload.totalPar}** | **${payload.totalStrokes}** |`);
  lines.push(``);
  return lines.join('\n');
}
