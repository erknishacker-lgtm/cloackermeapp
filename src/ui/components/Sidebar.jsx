import { ChevronDown, LogOut, Menu, X } from '../icons.jsx';
import { useEffect, useMemo, useState } from 'react';
import { navTree } from '../constants.js';

const LOGO_SRC = '/logo.png?v=zghost8';

function isChildActive(node, activePage) {
  if (!node.children) return node.id === activePage;
  return node.children.some((c) => c.id === activePage);
}

export function Sidebar({ activePage, setActivePage, user, onLogout, campaignCount = 0 }) {
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'owner' || user?.role === 'admin');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => ({ filtro: true, admin: false }));

  const tree = useMemo(
    () =>
      navTree.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.children) {
          return item.children.some((c) => !c.adminOnly || isAdmin);
        }
        return true;
      }),
    [isAdmin]
  );

  const main = tree.filter((i) => !i.pinBottom);
  const bottom = tree.filter((i) => i.pinBottom);

  useEffect(() => {
    setOpen(false);
  }, [activePage]);

  useEffect(() => {
    for (const node of navTree) {
      if (node.children?.some((c) => c.id === activePage)) {
        setExpanded((prev) => ({ ...prev, [node.id]: true }));
      }
    }
  }, [activePage]);

  function accountLabel() {
    if (isAdmin) return user?.displayName || user?.username || 'Admin';
    return user?.displayName || user?.username || 'Cliente';
  }

  function NavLeaf({ item, nested }) {
    const Icon = item.icon;
    return (
      <button
        type="button"
        className={`nav-item ${nested ? 'nested' : ''} ${item.id === activePage ? 'active' : ''}`}
        onClick={() => setActivePage(item.id)}
        title={item.label}
      >
        <Icon size={16} />
        <span>{item.label}</span>
      </button>
    );
  }

  function NavBranch({ node }) {
    const Icon = node.icon;
    const kids = (node.children || []).filter((c) => !c.adminOnly || isAdmin);
    const isOpen = Boolean(expanded[node.id]);
    const active = isChildActive(node, activePage);

    return (
      <div className={`nav-branch ${active ? 'has-active' : ''}`}>
        <button
          type="button"
          className={`nav-item nav-parent ${active ? 'parent-active' : ''}`}
          onClick={() => setExpanded((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
        >
          <Icon size={16} />
          <span>{node.label}</span>
          <ChevronDown size={14} className={`nav-chevron ${isOpen ? 'open' : ''}`} />
        </button>
        {isOpen ? (
          <div className="nav-children">
            {kids.map((child) => (
              <NavLeaf key={child.id} item={child} nested />
            ))}
          </div>
        ) : null}
      </div>
    );
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
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="mobile-brand">
          <img src={LOGO_SRC} alt="" className="mobile-logo" />
          <strong className="brand-word">zGhost Cloaker</strong>
        </div>
        <span className="mobile-user-initial" title={accountLabel()}>
          {(accountLabel().charAt(0) || 'U').toUpperCase()}
        </span>
      </header>

      {open ? (
        <button type="button" className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} />
      ) : null}

      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <img src={LOGO_SRC} alt="" className="brand-logo" />
          <strong className="brand-word">zGhost Cloaker</strong>
        </div>

        <nav className="nav" aria-label="Principal">
          {main.map((node) =>
            node.children ? <NavBranch key={node.id} node={node} /> : <NavLeaf key={node.id} item={node} />
          )}
        </nav>

        <div className="sidebar-footer">
          {bottom.length > 0 ? (
            <nav className="nav nav-bottom" aria-label="Ajuda">
              {bottom.map((node) => (
                <NavLeaf key={node.id} item={node} />
              ))}
            </nav>
          ) : null}

          <div className="plan-chip">
            <div className="plan-chip-head">
              <span>Starter</span>
              <span className="plan-chip-meta">{campaignCount} camp.</span>
            </div>
            <div className="plan-chip-bar">
              <div className="plan-chip-fill" style={{ width: '12%' }} />
            </div>
          </div>

          <div className="account-card">
            <div className="account-avatar" aria-hidden>
              {(accountLabel().charAt(0) || 'U').toUpperCase()}
            </div>
            <div className="account-meta">
              <span className="account-name">{accountLabel()}</span>
              <span className="account-role">{isAdmin ? 'Admin' : 'Cliente'}</span>
            </div>
            <button className="account-logout" type="button" onClick={onLogout} title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
