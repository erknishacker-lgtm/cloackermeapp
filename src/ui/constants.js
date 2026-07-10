import {
  Activity,
  Crown,
  Globe2,
  Grid2X2,
  Home,
  Settings,
  ShieldCheck
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

export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'campaigns', label: 'Campanhas', icon: Grid2X2 },
  { id: 'access', label: 'Acessos Agora', icon: Activity },
  { id: 'domains', label: 'Meus Dominios', icon: Globe2 },
  { id: 'security', label: 'Seguranca', icon: ShieldCheck },
  { id: 'plans', label: 'Planos', icon: Crown },
  { id: 'settings', label: 'Configuracoes', icon: Settings }
];

export const platforms = ['Personalizado / Outro', 'Email', 'Afiliados', 'Busca Organica', 'Parceiros'];

export const modes = ['Protecao server-side', 'Protecao com fallback agressivo', 'Somente logs'];
