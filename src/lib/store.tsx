import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultSettings, emptyData } from './defaults';
import { connect, decide, loadConfig, pull, push, saveConfig, SyncError, type SyncConfig } from './sync';
import type { Collection, Data, Settings } from './types';

const KEY = 'giro.data.v1';
const BACKUP_KEY = 'giro.backup.antes-sync';

type Item<C extends Collection> = Data[C][number];

export interface SyncStatus {
  state: 'off' | 'syncing' | 'ok' | 'error';
  message?: string;
  login?: string;
  lastSyncAt?: number;
}

interface Store {
  data: Data;
  upsert: <C extends Collection>(c: C, item: Item<C>) => void;
  remove: (c: Collection, id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  replaceAll: (d: Data) => void;
  saveError: boolean;
  sync: SyncStatus;
  connectSync: (token: string) => Promise<'criado' | 'carregado'>;
  disconnectSync: () => void;
  syncNow: () => Promise<void>;
  hasPreSyncBackup: boolean;
  restorePreSyncBackup: () => void;
}

const Ctx = createContext<Store | null>(null);

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Garante que dados antigos, importados ou vindos da nuvem tenham todos os campos atuais. */
export function normalize(raw: unknown): Data {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Data>;
  return {
    version: 1,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0,
    settings: { ...defaultSettings(), ...(r.settings ?? {}) },
    products: Array.isArray(r.products) ? r.products : [],
    purchases: Array.isArray(r.purchases) ? r.purchases : [],
    sales: Array.isArray(r.sales) ? r.sales : [],
    expenses: Array.isArray(r.expenses) ? r.expenses : [],
    goals: Array.isArray(r.goals) ? r.goals : [],
  };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* sem acesso ao armazenamento: começa vazio */
  }
  return emptyData();
}

function saveBackup(d: Data) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(d));
  } catch {
    /* ignora */
  }
}

const stamp = (d: Data): Data => ({ ...d, updatedAt: Date.now() });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(load);
  const [saveError, setSaveError] = useState(false);
  const [config, setConfig] = useState<SyncConfig | null>(loadConfig);
  const [sync, setSync] = useState<SyncStatus>(() => {
    const c = loadConfig();
    return c ? { state: 'ok', login: c.login, lastSyncAt: c.lastSyncAt } : { state: 'off' };
  });
  const [hasPreSyncBackup, setHasPreSyncBackup] = useState(() => {
    try {
      return !!localStorage.getItem(BACKUP_KEY);
    } catch {
      return false;
    }
  });

  const dataRef = useRef(data);
  dataRef.current = data;
  const configRef = useRef(config);
  configRef.current = config;
  const inFlight = useRef(false);
  const again = useRef(false);
  const localDirty = useRef(false);

  // salva no aparelho a cada mudança
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [data]);

  const updateConfig = useCallback((c: SyncConfig | null) => {
    saveConfig(c);
    setConfig(c);
  }, []);

  /** Aplica dados vindos da nuvem, guardando antes a versão deste aparelho. */
  const applyRemote = useCallback((remote: Data) => {
    const local = dataRef.current;
    if (local.products.length || local.sales.length || local.expenses.length || local.purchases.length) {
      saveBackup(local);
      setHasPreSyncBackup(true);
    }
    setData(normalize(remote));
  }, []);

  const syncNow = useCallback(async () => {
    const c = configRef.current;
    if (!c) return;
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    setSync((s) => ({ ...s, state: 'syncing', message: undefined }));
    try {
      const remote = await pull(c);
      const snap = dataRef.current;
      const action = decide(snap, remote);
      if (action === 'pull' && remote) applyRemote(remote);
      if (action === 'push') await push(c, snap);
      // se houve edição durante o envio, sincroniza de novo
      if (dataRef.current.updatedAt === snap.updatedAt || action === 'pull') localDirty.current = false;
      else again.current = true;
      const remoteAt = action === 'pull' ? remote!.updatedAt ?? 0 : snap.updatedAt ?? 0;
      const next = { ...c, lastRemoteUpdatedAt: remoteAt, lastSyncAt: Date.now() };
      updateConfig(next);
      setSync({ state: 'ok', login: c.login, lastSyncAt: next.lastSyncAt });
    } catch (e) {
      const msg = e instanceof SyncError ? e.message : 'Erro ao sincronizar.';
      setSync((s) => ({ ...s, state: 'error', message: msg }));
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void syncNow();
      }
    }
  }, [applyRemote, updateConfig]);

  // envia mudanças locais alguns segundos depois da última edição
  useEffect(() => {
    if (!config || !localDirty.current) return;
    const t = window.setTimeout(() => void syncNow(), 2500);
    return () => window.clearTimeout(t);
  }, [data, config, syncNow]);

  // ao abrir o app, voltar para ele ou a internet voltar: buscar novidades
  useEffect(() => {
    if (!config) return;
    void syncNow();
    const onVisible = () => document.visibilityState === 'visible' && void syncNow();
    const onOnline = () => void syncNow();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.gistId]);

  // mudança local: marca a hora e sinaliza que precisa enviar
  const change = useCallback((fn: (d: Data) => Data) => {
    localDirty.current = true;
    setData((d) => stamp(fn(d)));
  }, []);

  const upsert = useCallback(<C extends Collection>(c: C, item: Item<C>) => {
    change((d) => {
      const list = d[c] as Item<C>[];
      const idx = list.findIndex((x) => x.id === item.id);
      const next = idx >= 0 ? list.map((x, i) => (i === idx ? item : x)) : [...list, item];
      return { ...d, [c]: next };
    });
  }, [change]);

  const remove = useCallback((c: Collection, id: string) => {
    change((d) => ({ ...d, [c]: (d[c] as { id: string }[]).filter((x) => x.id !== id) }));
  }, [change]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    change((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, [change]);

  const replaceAll = useCallback((d: Data) => change(() => normalize(d)), [change]);

  const connectSync = useCallback(async (token: string) => {
    setSync({ state: 'syncing' });
    try {
      const local = dataRef.current.updatedAt ? dataRef.current : stamp(dataRef.current);
      const { config: c, remote } = await connect(token.trim(), local);
      if (remote) applyRemote(remote);
      else if (local !== dataRef.current) setData(local);
      updateConfig(c);
      setSync({ state: 'ok', login: c.login, lastSyncAt: c.lastSyncAt });
      return remote ? 'carregado' : 'criado';
    } catch (e) {
      const msg = e instanceof SyncError ? e.message : 'Não foi possível conectar.';
      setSync({ state: 'error', message: msg });
      throw e;
    }
  }, [applyRemote, updateConfig]);

  const disconnectSync = useCallback(() => {
    updateConfig(null);
    setSync({ state: 'off' });
  }, [updateConfig]);

  const restorePreSyncBackup = useCallback(() => {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (raw) change(() => normalize(JSON.parse(raw)));
    } catch {
      /* ignora */
    }
  }, [change]);

  const value = useMemo(
    () => ({ data, upsert, remove, setSettings, replaceAll, saveError, sync, connectSync, disconnectSync, syncNow, hasPreSyncBackup, restorePreSyncBackup }),
    [data, upsert, remove, setSettings, replaceAll, saveError, sync, connectSync, disconnectSync, syncNow, hasPreSyncBackup, restorePreSyncBackup],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}
