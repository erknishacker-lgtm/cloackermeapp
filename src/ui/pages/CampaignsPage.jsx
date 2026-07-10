import {
  AlertTriangle,
  FlaskConical,
  Monitor,
  Pause,
  Play,
  Plus,
  Smartphone,
  Trash2
} from 'lucide-react';
import { Field } from '../components/Field.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { SelectShell } from '../components/SelectShell.jsx';
import { modes, platforms } from '../constants.js';

export function CampaignsPage({
  form,
  updateField,
  submitCampaign,
  message,
  loading,
  campaigns,
  activeCampaign,
  domains,
  updateCampaign,
  deleteCampaign,
  startCampaignTest
}) {
  const publicUrl = activeCampaign ? `/r/${activeCampaign.slug}` : '';
  const domainOptions = [
    ...domains.global.filter((d) => d.active).map((d) => d.domain),
    ...domains.custom.filter((d) => d.active).map((d) => d.domain)
  ];
  if (form.domain && !domainOptions.includes(form.domain)) {
    domainOptions.unshift(form.domain);
  }

  return (
    <>
      <PageHeader title="Criar Nova Campanha" subtitle="Adicione um novo link protegido por roteamento inteligente anti-bot" />
      <div className="workspace">
        <form className="panel campaign-form" onSubmit={submitCampaign}>
          <div className="panel-title">
            <div>
              <h2>Criar Novo Cloaker</h2>
              <p>Configure um link de redirecionamento com protecao anti-bot legitima</p>
            </div>
            <span className="status-pill">Server-side</span>
          </div>

          <Field label="Nome / Descricao">
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Ex: Campanha Facebook 2024"
            />
          </Field>

          <Field label="Slug do Link" hint="Exemplo gerado: /r/minha-campanha" required>
            <input value={form.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="minha-campanha" />
          </Field>

          <Field label="URL Principal" hint="Pagina para visitante que parece real (humano/browser)" required>
            <input
              value={form.primaryUrl}
              onChange={(event) => updateField('primaryUrl', event.target.value)}
              placeholder="https://sua-pagina-real.com"
            />
          </Field>

          <Field
            label="URL Alternativa (secundaria)"
            hint="Pagina para bot, IP bloqueado, headers suspeitos ou regras da campanha"
            required
          >
            <input
              value={form.fallbackUrl}
              onChange={(event) => updateField('fallbackUrl', event.target.value)}
              placeholder="https://pagina-alternativa.com"
            />
          </Field>

          <div className="form-row">
            <Field label="Plataforma / Origem" required>
              <SelectShell>
                <select value={form.platform} onChange={(event) => updateField('platform', event.target.value)}>
                  {platforms.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </SelectShell>
            </Field>

            <Field label="Modo de Decisao">
              <SelectShell wide>
                <select value={form.mode} onChange={(event) => updateField('mode', event.target.value)}>
                  {modes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </SelectShell>
            </Field>
          </div>

          <div className="device-grid">
            <div className="device-card">
              <span className="device-title">
                <Monitor size={19} />
                Desktop
              </span>
              <SelectShell>
                <select value={form.desktopDestination} onChange={(event) => updateField('desktopDestination', event.target.value)}>
                  <option value="primary">Principal</option>
                  <option value="fallback">Fallback</option>
                </select>
              </SelectShell>
            </div>

            <div className="device-card">
              <span className="device-title mobile">
                <Smartphone size={19} />
                Mobile
              </span>
              <SelectShell>
                <select value={form.mobileDestination} onChange={(event) => updateField('mobileDestination', event.target.value)}>
                  <option value="primary">Principal</option>
                  <option value="fallback">Fallback</option>
                </select>
              </SelectShell>
            </div>
          </div>

          <div className="warning-box">
            <AlertTriangle size={20} />
            <div>
              <strong>Como o filtro funciona:</strong>
              <ul>
                <li>
                  Analisa <strong>User-Agent</strong>, <strong>IP</strong> e <strong>headers</strong> do visitante.
                </li>
                <li>Quem parece real vai para a URL principal; o resto para a URL alternativa.</li>
                <li>Cada decisao fica registrada em Acessos (metrificacao).</li>
              </ul>
            </div>
          </div>

          <div className="form-row three">
            <Field label="Dominio" required>
              <SelectShell>
                <select value={form.domain} onChange={(event) => updateField('domain', event.target.value)}>
                  {domainOptions.map((domain) => (
                    <option key={domain}>{domain}</option>
                  ))}
                </select>
              </SelectShell>
            </Field>
            <Field label="Rate limit/min" hint="Hits por IP por minuto">
              <input
                type="number"
                min="1"
                value={form.rateLimitPerMinute}
                onChange={(event) => updateField('rateLimitPerMinute', event.target.value)}
              />
            </Field>
            <Field label="Score para alternativa" hint="Acima deste score → secundaria">
              <input
                type="number"
                min="10"
                max="100"
                value={form.fallbackThreshold}
                onChange={(event) => updateField('fallbackThreshold', event.target.value)}
              />
            </Field>
          </div>

          <div className="panel-title compact-title">
            <div>
              <h2>Filtros de trafego</h2>
              <p>User-Agent, IP e headers — visitantes casados caem na pagina alternativa</p>
            </div>
          </div>

          <Field
            label="User-Agents bloqueados"
            hint="Trechos separados por virgula. Ex: curl, python, scrapy, headless"
          >
            <input
              value={form.blockedUserAgents}
              onChange={(event) => updateField('blockedUserAgents', event.target.value)}
              placeholder="curl, python-requests, headless"
            />
          </Field>

          <Field label="IPs bloqueados nesta campanha" hint="IPs exatos, separados por virgula">
            <input
              value={form.blockedIps}
              onChange={(event) => updateField('blockedIps', event.target.value)}
              placeholder="203.0.113.10, 198.51.100.20"
            />
          </Field>

          <div className="form-row">
            <Field label="Paises bloqueados" hint="Codigo ISO, ex: CN,RU">
              <input
                value={form.blockedCountries}
                onChange={(event) => updateField('blockedCountries', event.target.value)}
                placeholder="CN,RU"
              />
            </Field>
            <Field label="ASNs bloqueados" hint="Ex: AS12345">
              <input
                value={form.blockedAsns}
                onChange={(event) => updateField('blockedAsns', event.target.value)}
                placeholder="AS12345,AS13335"
              />
            </Field>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={form.blockDatacenterAsns !== false}
              onChange={(event) => updateField('blockDatacenterAsns', event.target.checked)}
            />
            <span>Bloquear redes de datacenter/nuvem conhecidas (ASN) → pagina alternativa</span>
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={form.strictHeaders === true}
              onChange={(event) => updateField('strictHeaders', event.target.checked)}
            />
            <span>Headers rigorosos (exige sinais de browser real: Sec-Fetch / client hints)</span>
          </label>

          {message && <div className="message">{message}</div>}

          <button className="submit-button" disabled={loading} type="submit">
            <Plus size={18} />
            {loading ? 'Criando...' : 'Criar Cloaker'}
          </button>
        </form>

        <aside className="side-panel">
          <div className="panel compact">
            <h2>Teste rapido</h2>
            <p>Use estes links para ver a decisao do backend em tempo real.</p>
            {publicUrl ? (
              <>
                <a className="test-link" href={`${publicUrl}?simulate=human`} target="_blank" rel="noreferrer">
                  Simular humano
                </a>
                <a className="test-link danger" href={`${publicUrl}?simulate=bot`} target="_blank" rel="noreferrer">
                  Simular robo
                </a>
              </>
            ) : (
              <div className="empty-mini">Crie uma campanha para habilitar os testes.</div>
            )}
          </div>

          <div className="panel compact">
            <h2>Campanhas ({campaigns.length})</h2>
            <div className="campaign-list">
              {campaigns.length === 0 && <div className="empty-mini">Nenhuma campanha ainda.</div>}
              {campaigns.map((campaign) => (
                <div className="campaign-item managed" key={campaign.id}>
                  <div>
                    <strong>{campaign.name}</strong>
                    <span>
                      /r/{campaign.slug} · {campaign.status}
                    </span>
                  </div>
                  <div className="campaign-actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="Testar campanha (cookie 1h → URL principal)"
                      onClick={() => startCampaignTest?.(campaign)}
                    >
                      <FlaskConical size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title={campaign.status === 'active' ? 'Pausar' : 'Ativar'}
                      onClick={() =>
                        updateCampaign(campaign.id, {
                          status: campaign.status === 'active' ? 'paused' : 'active'
                        })
                      }
                    >
                      {campaign.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      title="Excluir"
                      onClick={async () => {
                        if (window.confirm(`Excluir ${campaign.name}?`)) {
                          await deleteCampaign(campaign.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
