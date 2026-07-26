import { Check, Ghost, Shield, Zap } from '../icons.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PLANS, formatPlanPrice } from '../constants/plans.js';

const ICONS = {
  start: Shield,
  platinum: Zap,
  ghost: Ghost
};

export function PlansPage({ setActivePage, currentPlanId = 'start' }) {
  return (
    <>
      <PageHeader
        title="Planos"
        breadcrumb="Conta / Planos"
        subtitle="Start, Platinum e Ghost — escolha pelo volume de dominios e requisicoes."
        icon={Ghost}
      />

      <section className="plans-how panel">
        <h2>Como funciona</h2>
        <ol className="plans-how-list">
          <li>
            <strong>Escolha o plano</strong> conforme dominios e requisicoes do mes.
          </li>
          <li>
            <strong>Ative no painel</strong> — o limite aparece em Configuracoes → Assinaturas.
          </li>
          <li>
            <strong>Escale quando precisar</strong> — suba de Start → Platinum → Ghost sem perder campanhas.
          </li>
        </ol>
        <p className="plans-how-note">
          Checkout online sera ligado na etapa de cobranca. Por enquanto o plano fica registrado na conta
          (admin pode ajustar).
        </p>
      </section>

      <section className="plans-grid">
        {PLANS.map((plan) => {
          const Icon = ICONS[plan.id] || Shield;
          const active = currentPlanId === plan.id;
          return (
            <article
              className={`panel plan-card ${plan.highlight ? 'highlight' : ''} ${active ? 'current' : ''}`}
              key={plan.id}
            >
              {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}
              <div className="plan-head">
                <Icon size={28} />
                <h2>{plan.name}</h2>
                <strong>
                  {plan.priceLabel}
                  <span className="plan-period">{plan.period}</span>
                </strong>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="plan-limits mono">
                <span>{plan.domainsLabel}</span>
                <span>{plan.requestsLabel}/mes</span>
              </div>
              {active ? (
                <button type="button" className="submit-button plan-cta" disabled>
                  Plano atual
                </button>
              ) : (
                <button
                  type="button"
                  className={`submit-button plan-cta ${plan.highlight ? '' : 'ghost'}`}
                  onClick={() => setActivePage?.('settings')}
                >
                  Assinar {plan.name}
                </button>
              )}
              <p className="plan-note">{formatPlanPrice(plan)} · renovacao mensal</p>
            </article>
          );
        })}
      </section>
    </>
  );
}
