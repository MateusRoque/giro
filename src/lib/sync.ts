import type { Data } from './types';

/**
 * Sincronização sem banco de dados: os dados ficam num Gist secreto
 * (arquivo privado) da conta GitHub do usuário. Cada aparelho lê e grava
 * o mesmo arquivo. Vale a versão mais recente (campo updatedAt).
 */

export const SYNC_FILE = 'giro-dados.json';
const CONFIG_KEY = 'giro.sync.v1';
const API = 'https://api.github.com';

export interface SyncConfig {
  token: string;
  gistId: string;
  login: string;
  /** updatedAt da última versão que este aparelho viu na nuvem. */
  lastRemoteUpdatedAt: number;
  lastSyncAt: number;
}

export function loadConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SyncConfig) : null;
  } catch {
    return null;
  }
}

export function saveConfig(c: SyncConfig | null): void {
  try {
    if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
    else localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* sem armazenamento */
  }
}

export class SyncError extends Error {
  constructor(message: string, public readonly kind: 'auth' | 'network' | 'other') {
    super(message);
  }
}

async function gh(token: string, path: string, init?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new SyncError('Sem internet. Os dados ficam salvos neste aparelho e sincronizam quando a conexão voltar.', 'network');
  }
  if (res.status === 401) throw new SyncError('Chave do GitHub inválida ou expirada. Gere uma nova chave e conecte de novo.', 'auth');
  if (res.status === 403) {
    throw new SyncError('A chave não tem permissão para Gists. Gere a chave marcando a opção "gist".', 'auth');
  }
  if (res.status === 404) {
    throw new SyncError('Não encontrei o arquivo do Giro na sua conta do GitHub. Desconecte e conecte de novo.', 'auth');
  }
  if (!res.ok) throw new SyncError(`GitHub respondeu com erro ${res.status}. Tente de novo em alguns minutos.`, 'other');
  return res.json();
}

/** Valida a chave, acha o arquivo do Giro na conta (ou cria um). */
export async function connect(token: string, current: Data): Promise<{ config: SyncConfig; remote: Data | null }> {
  const user = await gh(token, '/user');
  // procura um gist que já tenha o arquivo do Giro (caso de um segundo aparelho)
  for (let page = 1; page <= 5; page++) {
    const gists: any[] = await gh(token, `/gists?per_page=100&page=${page}`);
    const found = gists.find((g) => g.files && g.files[SYNC_FILE]);
    if (found) {
      const remote = await pull({ token, gistId: found.id });
      return {
        config: { token, gistId: found.id, login: user.login, lastRemoteUpdatedAt: remote?.updatedAt ?? 0, lastSyncAt: Date.now() },
        remote,
      };
    }
    if (gists.length < 100) break;
  }
  const created = await gh(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Giro: dados da revenda (não apague)',
      public: false,
      files: { [SYNC_FILE]: { content: JSON.stringify(current) } },
    }),
  });
  return {
    config: { token, gistId: created.id, login: user.login, lastRemoteUpdatedAt: current.updatedAt ?? 0, lastSyncAt: Date.now() },
    remote: null,
  };
}

export async function pull(c: Pick<SyncConfig, 'token' | 'gistId'>): Promise<Data | null> {
  const gist = await gh(c.token, `/gists/${c.gistId}`);
  const file = gist.files?.[SYNC_FILE];
  if (!file) return null;
  let content: string = file.content ?? '';
  if (file.truncated && file.raw_url) {
    try {
      content = await (await fetch(file.raw_url, { cache: 'no-store' })).text();
    } catch {
      throw new SyncError('Não consegui baixar os dados da nuvem.', 'network');
    }
  }
  try {
    return JSON.parse(content) as Data;
  } catch {
    return null;
  }
}

export async function push(c: Pick<SyncConfig, 'token' | 'gistId'>, data: Data): Promise<void> {
  await gh(c.token, `/gists/${c.gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [SYNC_FILE]: { content: JSON.stringify(data) } } }),
  });
}

/**
 * Decide o que fazer comparando os dois lados.
 * - 'pull': a nuvem tem algo mais novo que este aparelho → baixar.
 * - 'push': este aparelho tem mudanças que a nuvem não tem → enviar.
 * - 'none': iguais.
 */
export function decide(local: Data, remote: Data | null): 'pull' | 'push' | 'none' {
  const l = local.updatedAt ?? 0;
  const r = remote?.updatedAt ?? -1;
  if (!remote) return 'push';
  if (r > l) return 'pull';
  if (l > r) return 'push';
  return 'none';
}
