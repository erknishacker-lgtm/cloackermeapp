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
  platform: 'Personalizado / Outro',
  mode: 'Protecao server-side',
  desktopDestination: 'primary',
  mobileDestination: 'primary',
  domain: 'cloaker.lol',
  rateLimitPerMinute: 20,
  fallbackThreshold: 45,
  blockedCountries: '',
  blockedAsns: '',
  blockedUserAgents: '',
  blockedIps: '',
  blockDatacenterAsns: true,
  strictHeaders: false
};

/** adminOnly: so admin ve no menu. pinBottom: fica no canto inferior do menu. */
export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'campaigns', label: 'Campanhas', icon: Grid2X2 },
  { id: 'access', label: 'Acessos', icon: Activity },
  { id: 'domains', label: 'Dominios', icon: Globe2, adminOnly: true },
  { id: 'security', label: 'Seguranca', icon: ShieldCheck, adminOnly: true },
  { id: 'users', label: 'Usuarios', icon: UserCog, adminOnly: true },
  { id: 'plans', label: 'Planos', icon: Crown, adminOnly: true },
  { id: 'settings', label: 'Configuracoes', icon: Settings },
  { id: 'tutorial', label: 'Tutorial', icon: BookOpen, pinBottom: true }
];

export const platforms = ['Personalizado / Outro', 'Email', 'Afiliados', 'Busca Organica', 'Parceiros'];

export const modes = ['Protecao server-side', 'Protecao com fallback agressivo', 'Somente logs'];
