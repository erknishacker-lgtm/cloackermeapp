import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  Cloud,
  Crown,
  Filter,
  Globe2,
  Grid2X2,
  Home,
  Settings,
  ShieldCheck,
  Star,
  UserCog
} from './icons.jsx';

export const initialForm = {
  name: '',
  slug: '',
  primaryUrl: '',
  fallbackUrl: '',
  platform: 'TikTok',
  mode: 'Protecao com fallback agressivo',
  desktopDestination: 'primary',
  mobileDestination: 'primary',
  domain: 'cloaker.lol',
  rateLimitPerMinute: 12,
  fallbackThreshold: 25,
  blockedCountries: '',
  blockedAsns: '',
  blockedUserAgents: 'bytespider, headless, selenium, puppeteer',
  blockedIps: '',
  blockDatacenterAsns: true,
  strictHeaders: true
};

/**
 * Navegacao estilo Cloakup:
 * - items top-level
 * - children = subitens expansíveis
 * - adminOnly / pinBottom
 */
export const navTree = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  {
    id: 'filtro',
    label: 'Filtro de trafego',
    icon: Filter,
    children: [
      { id: 'campaigns', label: 'Campanhas', icon: Grid2X2 },
      { id: 'access', label: 'Requisicoes', icon: Activity },
      { id: 'reports', label: 'Relatorios', icon: BarChart3 },
      { id: 'security', label: 'Seguranca', icon: ShieldCheck },
      { id: 'domains', label: 'Dominio', icon: Globe2 }
    ]
  },
  {
    id: 'admin',
    label: 'Administracao',
    icon: Cloud,
    adminOnly: true,
    children: [{ id: 'users', label: 'Usuarios', icon: UserCog, adminOnly: true }]
  },
  { id: 'plans', label: 'Planos', icon: Crown },
  { id: 'settings', label: 'Configuracoes', icon: Settings },
  { id: 'tutorial', label: 'Tutorial', icon: BookOpen, pinBottom: true }
];

/** Flat list for pages that still import navItems */
export const navItems = navTree.flatMap((item) => {
  if (item.children) {
    return item.children.map((child) => ({
      ...child,
      adminOnly: child.adminOnly || item.adminOnly,
      group: item.id
    }));
  }
  return [{ ...item, group: 'principal' }];
});

export const navGroupLabels = {
  principal: null,
  filtro: 'Filtro de trafego',
  admin: 'Administracao',
  sistema: 'Sistema',
  ajuda: 'Ajuda'
};

export const platforms = [
  'TikTok',
  'Personalizado / Outro',
  'Email',
  'Afiliados',
  'Busca Organica',
  'Parceiros',
  'Meta / Facebook',
  'Google Ads'
];

export const modes = ['Protecao server-side', 'Protecao com fallback agressivo', 'Somente logs'];

export { ChevronDown, Star };
