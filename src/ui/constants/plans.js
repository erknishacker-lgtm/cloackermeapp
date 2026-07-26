/**
 * Planos comerciais zGhost.
 * Start · Platinum · Ghost
 */
export const PLANS = [
  {
    id: 'start',
    name: 'Start',
    price: 147,
    priceLabel: 'R$ 147',
    period: '/ mes',
    domains: 1,
    requests: 10_000,
    requestsLabel: '10.000 requisicoes',
    domainsLabel: '1 dominio',
    highlight: false,
    features: [
      '1 dominio',
      'Ate 10.000 requisicoes / mes',
      'Campanhas ilimitadas',
      'Filtro anti-bot',
      'Relatorios basicos',
      'Suporte por e-mail'
    ]
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 267,
    priceLabel: 'R$ 267',
    period: '/ mes',
    domains: 3,
    requests: 50_000,
    requestsLabel: '50.000 requisicoes',
    domainsLabel: '3 dominios',
    highlight: true,
    badge: 'Mais popular',
    features: [
      '3 dominios',
      'Ate 50.000 requisicoes / mes',
      'Campanhas ilimitadas',
      'Todos os filtros',
      'Relatorios avancados',
      'Suporte via WhatsApp',
      'Historico estendido'
    ]
  },
  {
    id: 'ghost',
    name: 'Ghost',
    price: 497,
    priceLabel: 'R$ 497',
    period: '/ mes',
    domains: 10,
    requests: 350_000,
    requestsLabel: '350.000 requisicoes',
    domainsLabel: '10 dominios',
    highlight: false,
    features: [
      '10 dominios',
      'Ate 350.000 requisicoes / mes',
      'Campanhas ilimitadas',
      'Todos os filtros',
      'API e chaves',
      'Suporte prioritario',
      'Historico longo',
      'Ideal para operacao em escala'
    ]
  }
];

export function getPlanById(id) {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

export function formatPlanPrice(plan) {
  return `${plan.priceLabel}${plan.period}`;
}
