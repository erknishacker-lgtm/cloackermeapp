import { LogOut, User, Zap } from 'lucide-react';
import { navItems } from '../constants.js';

export function Sidebar({ activePage, setActivePage, settings, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.jpg" alt="Cloaker.lol" className="brand-logo" />
        <strong>Cloaker.lol</strong>
      </div>

      <nav className="nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={item.id === activePage ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => setActivePage(item.id)}
              type="button"
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {settings?.supportWhatsapp ? (
          <a
            className="support"
            href={`https://wa.me/${settings.supportWhatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
          >
            <Zap size={18} />
            <span>Suporte WhatsApp</span>
          </a>
        ) : (
          <button className="support" type="button" disabled title="Configure o WhatsApp em Configuracoes">
            <Zap size={18} />
            <span>Suporte WhatsApp</span>
          </button>
        )}
        <div className="account">
          <User size={17} />
          <span>
            {user?.displayName || user?.username || settings?.operatorEmail || 'operador'}
            {user?.role === 'owner' ? ' · owner' : ''}
          </span>
        </div>
        <button className="logout" type="button" onClick={onLogout} title="Sair do painel">
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
