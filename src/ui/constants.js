import {
  Activity,
  BookOpen,
  Crown,
  Globe2,
  Grid2X2,
  Home,
  Settings,
  ShieldCheck,
  UserCog
} from 'lucide-react';

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

/** adminOnly: so admin ve. pinBottom: canto inferior do menu. */
export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'campaigns', label: 'Campanhas', icon: Grid2X2 },
  { id: 'access', label: 'Acessos', icon: Activity },
  { id: 'domains', label: 'Dominios', icon: Globe2 },
  { id: 'security', label: 'Seguranca', icon: ShieldCheck },
  { id: 'users', label: 'Usuarios', icon: UserCog, adminOnly: true },
  { id: 'plans', label: 'Planos', icon: Crown, adminOnly: true },
  { id: 'settings', label: 'Configuracoes', icon: Settings },
  { id: 'tutorial', label: 'Tutorial', icon: BookOpen, pinBottom: true }
];

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
