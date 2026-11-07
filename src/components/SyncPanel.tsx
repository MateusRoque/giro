import { useState } from 'react';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { Field } from './Fields';

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Giro%20-%20sincronizar%20dados';

export function timeAgo(ms?: number): string {
  if (!ms) return 'nunca';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 45) return 'agora há pouco';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export function SyncPanel() {
  const { sync, connectSync, disconnectSync, syncNow, hasPreSyncBackup, restorePreSyncBackup } = useStore();
  const { toast } = useUI();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const connected = sync.state !== 'off' && !!sync.login;

  const doConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    try {
      const r = await connectSync(token);
      setToken('');
      toast(r === 'carregado' ? 'Conectado: dados da nuvem carregados neste aparelho' : 'Conectado: seus dados agora ficam salvos na nuvem');
    } catch {
      /* a mensagem aparece no painel */
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Sincronizar celular e computador</h2>
        <SyncBadge />
      </div>

      {connected ? (
        <>
          <p className="ink2" style={{ fontSize: 14, marginTop: 0 }}>
            Conectado à conta <b>@{sync.login}</b> do GitHub. Cada lançamento é enviado sozinho em poucos segundos, e o Giro busca novidades sempre que você abre o app.
            Última sincronização: {timeAgo(sync.lastSyncAt)}.
          </p>
          {sync.state === 'error' && <div className="alert">{sync.message}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}>
              {sync.state === 'syncing' ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (confirm('Desconectar este aparelho? Os dados continuam aqui e na nuvem, mas deixam de sincronizar.')) disconnectSync();
              }}
            >
              Desconectar este aparelho
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12.5, margin: '12px 0 0' }}>
            Sem internet, tudo continua salvo no aparelho e sincroniza quando a conexão voltar. Evite lançar nos dois aparelhos ao mesmo tempo sem internet: vale a versão mais recente.
          </p>
        </>
      ) : (
        <>
          <p className="ink2" style={{ fontSize: 14, marginTop: 0 }}>
            Seus dados ficam num arquivo privado da sua conta do GitHub. Faça isto uma vez em cada aparelho:
          </p>
          <ol className="steps">
            <li>
              Abra <a href={TOKEN_URL} target="_blank" rel="noreferrer">esta página do GitHub</a> (já vem preenchida).
            </li>
            <li>Em <b>Expiration</b>, escolha <b>No expiration</b>. Deixe marcada só a opção <b>gist</b>.</li>
            <li>Clique em <b>Generate token</b> no fim da página e copie o código que começa com <code>ghp_</code>.</li>
            <li>Cole abaixo e clique em Conectar. Guarde esse código no seu celular também (ex.: numa nota).</li>
          </ol>
          <form onSubmit={doConnect} style={{ marginTop: 12 }}>
            <Field label="Chave do GitHub">
              <input className="input" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_..." />
            </Field>
            {sync.state === 'error' && <div className="alert">{sync.message}</div>}
            <div className="form-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-primary" disabled={busy || !token.trim()}>{busy ? 'Conectando...' : 'Conectar'}</button>
            </div>
          </form>
          <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>
            No primeiro aparelho, o Giro cria o arquivo com os dados que estão aqui. Nos próximos, ele carrega os dados da nuvem.
            A chave só pode mexer nos seus Gists: não dá acesso a senha, e-mail nem a outras partes da sua conta.
          </p>
        </>
      )}

      {hasPreSyncBackup && (
        <p className="muted" style={{ fontSize: 12.5, margin: '14px 0 0', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          Este aparelho tinha dados antes de receber os da nuvem.{' '}
          <button
            className="link-btn"
            style={{ fontSize: 12.5, fontWeight: 600 }}
            onClick={() => {
              if (confirm('Voltar para os dados que este aparelho tinha antes de sincronizar? Eles também serão enviados para a nuvem.')) {
                restorePreSyncBackup();
                toast('Dados anteriores restaurados');
              }
            }}
          >
            Restaurar aquela versão
          </button>
        </p>
      )}
    </section>
  );
}

export function SyncBadge() {
  const { sync } = useStore();
  if (sync.state === 'off') return <span className="badge">Só neste aparelho</span>;
  if (sync.state === 'syncing') return <span className="badge">Sincronizando...</span>;
  if (sync.state === 'error') return <span className="badge badge-warn">Não sincronizado</span>;
  return <span className="badge badge-pos">Sincronizado</span>;
}
