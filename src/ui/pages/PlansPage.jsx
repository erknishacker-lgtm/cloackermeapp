import { Check, Crown, Shield, Zap } from 'lucide-react';
import { PageHeader } from '../components/PageHeader.jsx';

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    icon: Shield,
    features: ['1 dominio', '5 campanhas', 'Rate limit basico', 'Logs 7 dias']
  },
  {
    name: 'Pro',
    price: 'R$ 97/mes',
    icon: Zap,
    highlight: true,
    features: ['10 dominios', 'Campanhas ilimitadas', 'Auto-ban de IPs', 'Logs 90 dias', 'Prioridade suporte']
  },
  {
    name: 'Agency',
    price: 'R$ 297/mes',
    icon: Crown,
    features: ['Dominios ilimitados', 'Multi-usuario (em breve)', 'API dedicada', 'SLA', 'Whitelabel']
  }
];

export function PlansPage() {
  return (
    <>
      <PageHeader title="Planos" subtitle="Escolha o plano ideal para o volume da sua operacao" icon={Crown} />
      <section className="plans-grid">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <article className={`panel plan-card ${plan.highlight ? 'highlight' : ''}`} key={plan.name}>
              <div className="plan-head">
                <Icon size={28} />
                <h2>{plan.name}</h2>
                <strong>{plan.price}</strong>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="plan-note">Billing/checkout sera integrado na etapa de multi-tenant.</p>
            </article>
          );
        })}
      </section>
    </>
  );
}
