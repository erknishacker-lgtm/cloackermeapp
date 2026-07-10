import {
  AlertTriangle,
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
  deleteCampaign
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

          <Field label="URL Principal" hint="Destino real para trafego aprovado" required>
            <input
              value={form.primaryUrl}
              onChange={(event) => updateField('primaryUrl', event.target.value)}
              placeholder="https://sua-pagina-real.com"
            />
          </Field>

          <Field label="URL Fallback" hint="Destino seguro para trafego suspeito, campanha pausada ou erro" required>
            <input
              value={form.fallbackUrl}
              onChange={(event) => updateField('fallbackUrl', event.target.value)}
              placeholder="https://site-seguro.com"
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
              <strong>Avisos de seguranca:</strong>
              <ul>
                <li>Robos, scrapers e requests suspeitos sao enviados ao fallback.</li>
                <li>A URL real tambem deve ser protegida por token, origem ou proxy.</li>
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
            <Field label="Rate limit/min">
              <input
                type="number"
                min="1"
                value={form.rateLimitPerMinute}
                onChange={(event) => updateField('rateLimitPerMinute', event.target.value)}
              />
            </Field>
            <Field label="Score fallback">
              <input
                type="number"
                min="10"
                max="100"
                value={form.fallbackThreshold}
                onChange={(event) => updateField('fallbackThreshold', event.target.value)}
              />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Paises bloqueados">
              <input
                value={form.blockedCountries}
                onChange={(event) => updateField('blockedCountries', event.target.value)}
                placeholder="CN,RU"
              />
            </Field>
            <Field label="ASNs bloqueados">
              <input
                value={form.blockedAsns}
                onChange={(event) => updateField('blockedAsns', event.target.value)}
                placeholder="AS12345,AS13335"
              />
            </Field>
          </div>

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
