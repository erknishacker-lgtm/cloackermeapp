import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  Globe2,
  HelpCircle,
  ListChecks,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserX
} from 'lucide-react';
import { useState } from 'react';
import { MetricCard } from '../components/MetricCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

const LIST_TIPS = {
  'ua-blacklist': {
    title: 'O que colocar aqui?',
    body: 'Adicione trechos do User-Agent que voce quer bloquear. Se o visitante tiver esse texto no User-Agent, ele vai para a pagina alternativa.',
    examples: ['curl', 'wget', 'python-requests', 'scrapy', 'headless', 'selenium', 'puppeteer', 'postman'],
    tip: "Use trechos curtos, nao o User-Agent inteiro. Exemplo: 'curl' bloqueia curl/7.68.0 e curl/8.0.1."
  },
  'ip-blacklist': {
    title: 'O que colocar aqui?',
    body: 'Adicione IPs ou faixas de IP (CIDR) que voce quer bloquear. Eles vao para a pagina alternativa.',
    examples: ['203.0.113.10  (IP unico)', '198.51.100.0/24  (faixa ~256 IPs)', '10.0.0.0/8  (faixa grande — use com cuidado)'],
    tip: 'Descubra IPs suspeitos nos logs de Acessos. Comece com IPs unicos antes de usar faixas grandes.'
  },
  'ip-whitelist': {
    title: 'O que colocar aqui?',
    body: 'Adicione seu IP para sempre ver a pagina principal, mesmo se o User-Agent estiver na blacklist.',
    examples: ['SEU.IP.ATUAL  (whatismyip.com)', 'IP.DO.ESCRITORIO', 'Ou use o Tutorial: “Adicionar meu IP a whitelist”'],
    tip: 'Descubra seu IP em sites como whatismyip.com. Ideal para testar campanhas sem cair na alternativa.'
  }
};

function ListManager({
  title,
  hint,
  icon: Icon,
  placeholder,
  items,
  listKey,
  addRouteListEntry,
  removeRouteListEntry,
  tone = 'red'
}) {
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const tips = LIST_TIPS[listKey];

  async function onAdd(event) {
    event.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setMessage('');
    const result = await addRouteListEntry(listKey, value.trim());
    setLoading(false);
    if (result.ok) {
      setValue('');
      setMessage('Adicionado.');
    } else {
      setMessage(result.message || 'Erro ao adicionar.');
    }
  }

  async function onRemove(entry) {
    const result = await removeRouteListEntry(listKey, entry);
    if (!result.ok) setMessage(result.message || 'Erro ao remover.');
  }

  return (
    <div className={`panel list-manager tone-${tone}`}>
      <div className="list-manager-head">
        <h2>
          <Icon size={20} />
          {title}
        </h2>
        {tips && (
          <div className="list-tips-actions">
            <button
              type="button"
              className="list-tip-info"
              title={tips.title}
              aria-label={`Ajuda: ${title}`}
              onClick={() => setTipsOpen((open) => !open)}
            >
              <HelpCircle size={18} />
            </button>
            <button type="button" className="list-tip-toggle" onClick={() => setTipsOpen((open) => !open)}>
              <BookOpen size={15} />
              Ver dicas
              {tipsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        )}
      </div>
      <p className="list-manager-hint">{hint}</p>

      {tipsOpen && tips && (
        <div className="list-tips-panel">
          <strong>{tips.title}</strong>
          <p>{tips.body}</p>
          <div className="list-tips-examples">
            <span>Exemplos:</span>
            <ul>
              {tips.examples.map((ex) => (
                <li key={ex}>
                  <code>{ex}</code>
                </li>
              ))}
            </ul>
          </div>
          <p className="list-tips-note">
            <AlertTriangle size={14} /> {tips.tip}
          </p>
        </div>
      )}

      {!items.length && (
        <div className="list-empty-warn">
          <AlertTriangle size={16} />
          <span>Nenhum item adicionado. Adicione alguns itens para comecar a filtrar.</span>
        </div>
      )}

      <form className="block-form" onSubmit={onAdd}>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} />
        <button type="submit" disabled={loading || !value.trim()}>
          {loading ? '...' : 'Adicionar'}
        </button>
      </form>
      {message && <div className="message compact-message">{message}</div>}
      {items.length ? (
        <div className="blocked-list">
          {items.map((item) => (
            <div className="blocked-row" key={item}>
              <strong>{item}</strong>
              <span>{listKey.includes('ua') ? 'User-Agent' : item.includes('/') ? 'CIDR' : 'IP'}</span>
              <button type="button" onClick={() => onRemove(item)}>
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SecurityPage({
  events,
  blockedIps,
  createBlockedIp,
  deleteBlockedIp,
  routeLists = { uaBlacklist: [], ipBlacklist: [], ipWhitelist: [] },
  addRouteListEntry,
  removeRouteListEntry,
  refreshData,
  stats
}) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const blocked = events.filter((event) => event.decision === 'fallback');
  const topIps = stats.topIps || [];
  const topReasons = stats.topReasons || [];
  const topCampaigns = stats.topCampaigns || [];

  async function submitBlock(event) {
    event.preventDefault();
    if (!ip.trim()) return;
    const result = await createBlockedIp(ip, reason);
    if (result.ok) {
      setIp('');
      setReason('');
      setSecurityMessage('IP/CIDR bloqueado.');
    } else {
      setSecurityMessage(result.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Seguranca"
        subtitle="Listas de roteamento: blacklist / whitelist → real ou blocked"
        action={
          <button className="ghost-button" onClick={refreshData} type="button">
            <RefreshCw size={18} />
            Atualizar
          </button>
        }
      />

      <section className="panel security-banner">
        <h2>
          <ListChecks size={22} />
          Como o roteamento decide
        </h2>
        <div className="security-tags">
          <span className="green">
            <ShieldCheck size={16} />
            IP whitelist → URL real (principal)
          </span>
          <span className="red">
            <Ban size={16} />
            IP blacklist → URL blocked (alternativa)
          </span>
          <span className="amber">
            <UserX size={16} />
            UA blacklist → URL blocked
          </span>
          <span className="blue">
            <Globe2 size={16} />
            Demais visitantes → URL real
          </span>
          <span className="purple">
            <Clock3 size={16} />
            CIDR suportado (ex: 10.0.0.0/8)
          </span>
        </div>
        <p className="security-note">
          Na campanha: <strong>URL Principal</strong> = destino real · <strong>URL Alternativa</strong> = destino
          blocked. O link publico continua sendo <code>/r/seu-slug</code>.
        </p>
      </section>

      <section className="lists-grid">
        <ListManager
          title="Blacklist de User-Agents"
          hint="Se o User-Agent contiver o texto, vai para blocked (alternativa)."
          icon={UserX}
          placeholder="Ex: curl, python-requests, headless"
          items={routeLists.uaBlacklist || []}
          listKey="ua-blacklist"
          addRouteListEntry={addRouteListEntry}
          removeRouteListEntry={removeRouteListEntry}
          tone="amber"
        />
        <ListManager
          title="Blacklist de IPs (CIDR)"
          hint="IP exato ou faixa CIDR. Casa → blocked (alternativa)."
          icon={Ban}
          placeholder="Ex: 203.0.113.10 ou 10.0.0.0/8"
          items={routeLists.ipBlacklist || []}
          listKey="ip-blacklist"
          addRouteListEntry={addRouteListEntry}
          removeRouteListEntry={removeRouteListEntry}
          tone="red"
        />
        <ListManager
          title="Whitelist de IPs (CIDR)"
          hint="Sempre vai para real (principal), mesmo se o UA estiver na blacklist."
          icon={ShieldCheck}
          placeholder="Ex: 198.51.100.20 ou 192.168.0.0/16"
          items={routeLists.ipWhitelist || []}
          listKey="ip-whitelist"
          addRouteListEntry={addRouteListEntry}
          removeRouteListEntry={removeRouteListEntry}
          tone="green"
        />
      </section>

      <section className="security-stats">
        <MetricCard label="Bloqueios Hoje" value={stats.today?.fallback ?? blocked.length} tone="red" icon={ShieldAlert} />
        <MetricCard label="Ultimos 7 dias" value={stats.week?.fallback ?? blocked.length} tone="amber" icon={Activity} />
        <MetricCard label="Ultimos 30 dias" value={stats.month?.fallback ?? blocked.length} tone="blue" icon={BarChart3} />
      </section>

      <section className="panel block-manager">
        <h2>
          <Lock size={22} />
          Bloqueios manuais com expiracao (legado)
        </h2>
        <p>
          IP ou CIDR com motivo e ban automatico (3 em 15 min / 10 em 24h). Preferira as listas acima para roteamento
          permanente.
        </p>
        <form className="block-form" onSubmit={submitBlock}>
          <input
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder="IP ou CIDR (ex: 192.168.1.1 ou 10.0.0.0/8)"
          />
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo (opcional)" />
          <button type="submit">Bloquear</button>
        </form>
        {securityMessage && <div className="message compact-message">{securityMessage}</div>}
        {blockedIps.length ? (
          <div className="blocked-list">
            {blockedIps.map((item) => (
              <div className="blocked-row" key={item.ip}>
                <strong>{item.ip}</strong>
                <span>
                  {item.reason || 'Bloqueio manual'}
                  {item.expiresAt ? ` · expira ${new Date(item.expiresAt).toLocaleString('pt-BR')}` : ''}
                  {item.source === 'auto' ? ' · auto' : ''}
                </span>
                <button type="button" onClick={() => deleteBlockedIp(item.ip)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-security">
            <ShieldCheck size={56} />
            <p>Nenhum bloqueio temporario no momento</p>
          </div>
        )}
      </section>

      <section className="security-grid">
        <div className="panel compact">
          <h2>
            <AlertTriangle size={20} />
            IPs com Mais Tentativas
          </h2>
          <p>Clique para bloquear rapidamente</p>
          {topIps.length ? (
            topIps.slice(0, 5).map((item, index) => (
              <button
                key={item.key}
                type="button"
                className="mini-row as-button"
                onClick={() => createBlockedIp(item.key, 'bloqueio rapido do painel')}
              >
                <span>#{index + 1}</span>
                <strong>{item.key}</strong>
                <b>{item.count}</b>
              </button>
            ))
          ) : (
            <div className="empty-mini">Nenhuma tentativa registrada.</div>
          )}
        </div>
        <div className="panel compact">
          <h2>
            <Eye size={20} />
            Motivos de Bloqueio
          </h2>
          {topReasons.length ? (
            topReasons.slice(0, 5).map((item, index) => (
              <div className="mini-row" key={item.key}>
                <span>#{index + 1}</span>
                <strong>{item.key}</strong>
                <b>{item.count}</b>
              </div>
            ))
          ) : (
            <div className="empty-mini">Nenhum motivo registrado.</div>
          )}
        </div>
      </section>

      <section className="panel domains-panel">
        <h2>
          <Globe2 size={22} />
          Bloqueios por Cloaker
        </h2>
        <p>Quantidade de tentativas bloqueadas em cada cloaker</p>
        {topCampaigns.length ? (
          topCampaigns.slice(0, 6).map((item) => (
            <div className="block-card" key={item.key}>
              <strong>{item.key}</strong>
              <span>campanha</span>
              <b>{item.count}</b>
              <small>bloqueios</small>
            </div>
          ))
        ) : (
          <div className="empty-mini">Nenhum bloqueio por campanha registrado.</div>
        )}
      </section>
    </>
  );
}
