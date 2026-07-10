import { LogOut, Menu, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { navItems } from '../constants.js';

export function Sidebar({ activePage, setActivePage, user, onLogout }) {
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'owner' || user?.role === 'admin');
  const items = navItems.filter((item) => !item.adminOnly || isAdmin);
  const mainItems = items.filter((item) => !item.pinBottom);
  const bottomItems = items.filter((item) => item.pinBottom);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [activePage]);

  function accountLabel() {
    if (isAdmin) {
      return user?.displayName || user?.username || 'Admin';
    }
    // Nunca cair em e-mail/settings do admin para clientes
    return user?.displayName || user?.username || 'Cliente';
  }

  function NavButtons({ list, compact }) {
    return list.map((item) => {
      const Icon = item.icon;
      return (
        <button
          className={item.id === activePage ? 'nav-item active' : 'nav-item'}
          key={item.id}
          onClick={() => setActivePage(item.id)}
          type="button"
        >
          <Icon size={compact ? 20 : 22} />
          <span>{item.label}</span>
        </button>
      );
    });
  }

  return (
    <>
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <img src="/logo.png" alt="Cloaker.lol" className="mobile-logo" />
        <div className="mobile-user" title={accountLabel()}>
          <User size={16} />
        </div>
      </header>

      {open && <button type="button" className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} />}

      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <img src="/logo.png" alt="Cloaker.lol" className="brand-logo" />
        </div>

        <nav className="nav" aria-label="Principal">
          <NavButtons list={mainItems} />
        </nav>

        <div className="sidebar-footer">
          {bottomItems.length > 0 && (
            <nav className="nav nav-bottom" aria-label="Ajuda">
              <NavButtons list={bottomItems} compact />
            </nav>
          )}

          <div className="account">
            <User size={17} />
            <span>
              {accountLabel()}
              {isAdmin ? ' · admin' : ''}
            </span>
          </div>
          <button className="logout" type="button" onClick={onLogout} title="Sair do painel">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
