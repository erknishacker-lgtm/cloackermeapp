import { Bell, CheckCheck } from '../icons.jsx';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { toast } from '../toast.js';

/**
 * Sino de acessos + toasts Sileo para itens novos (sem spam no poll).
 */
export function NotificationBell({ enabled, onOpenAccess }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const seenIds = useRef(new Set());
  const primed = useRef(false);

  async function load({ announce } = { announce: true }) {
    if (enabled === false) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      const { ok, payload } = await api.getNotifications();
      if (!ok) return;
      const nextItems = payload.items || [];
      setItems(nextItems);
      setUnread(payload.unread || 0);

      // Primeira carga: so marca como vistos (evita rajada de toasts no login)
      if (!primed.current) {
        nextItems.forEach((item) => seenIds.current.add(item.id));
        primed.current = true;
        return;
      }

      if (!announce) return;

      const fresh = nextItems.filter((item) => !item.read && !seenIds.current.has(item.id));
      for (const item of fresh.slice(0, 3)) {
        seenIds.current.add(item.id);
        const isBlock = /block|fallback|negad|suspei/i.test(`${item.title} ${item.body}`);
        const fn = isBlock ? toast.warning : toast.success;
        fn(item.title || 'Novo acesso', item.body || '');
      }
      // Marca o resto como visto sem toast
      nextItems.forEach((item) => seenIds.current.add(item.id));
    } catch {
      // ignore polling errors
    }
  }

  useEffect(() => {
    primed.current = false;
    seenIds.current = new Set();
    load({ announce: false });
    if (enabled === false) return undefined;
    const timer = window.setInterval(() => load({ announce: true }), 12000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  async function markAll() {
    await api.markAllNotificationsRead();
    await load({ announce: false });
    toast.info('Notificacoes', 'Todas marcadas como lidas.');
  }

  async function markOne(id) {
    await api.markNotificationRead(id);
    await load({ announce: false });
  }

  if (enabled === false) {
    return (
      <button className="notif-bell muted" type="button" title="Notificacoes desativadas nas configuracoes">
        <Bell size={20} />
      </button>
    );
  }

  return (
    <div className="notif-wrap">
      <button className="notif-bell" type="button" onClick={() => setOpen((v) => !v)} title="Notificacoes de acesso">
        <Bell size={20} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel panel">
          <div className="notif-panel-head">
            <strong>Acessos recentes</strong>
            <button type="button" className="ghost-button compact" onClick={markAll}>
              <CheckCheck size={16} />
              Ler tudo
            </button>
          </div>
          {items.length === 0 ? (
            <div className="empty-mini">Nenhum acesso notificado ainda.</div>
          ) : (
            <ul className="notif-list">
              {items.slice(0, 12).map((item) => (
                <li key={item.id} className={item.read ? '' : 'unread'}>
                  <button
                    type="button"
                    onClick={async () => {
                      await markOne(item.id);
                      onOpenAccess?.();
                      setOpen(false);
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                    <small>{new Date(item.createdAt).toLocaleString('pt-BR')}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
