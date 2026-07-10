import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function NotificationBell({ enabled, onOpenAccess }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);

  async function load() {
    if (enabled === false) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      const { ok, payload } = await api.getNotifications();
      if (!ok) return;
      setItems(payload.items || []);
      setUnread(payload.unread || 0);

      const fresh = (payload.items || []).filter((item) => !item.read).slice(0, 3);
      setToasts((current) => {
        const known = new Set(current.map((t) => t.id));
        const incoming = fresh.filter((item) => !known.has(item.id));
        if (!incoming.length) return current;
        return [...incoming, ...current].slice(0, 4);
      });
    } catch {
      // ignore polling errors
    }
  }

  useEffect(() => {
    load();
    if (enabled === false) return undefined;
    const timer = window.setInterval(load, 8000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!toasts.length) return undefined;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(0, -1));
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  async function markAll() {
    await api.markAllNotificationsRead();
    await load();
  }

  async function markOne(id) {
    await api.markNotificationRead(id);
    await load();
  }

  if (enabled === false) {
    return (
      <button className="notif-bell muted" type="button" title="Notificacoes desativadas nas configuracoes">
        <Bell size={20} />
      </button>
    );
  }

  return (
    <>
      <div className="notif-wrap">
        <button className="notif-bell" type="button" onClick={() => setOpen((v) => !v)} title="Notificacoes de acesso">
          <Bell size={20} />
          {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
        </button>
        {open && (
          <div className="notif-panel panel">
            <div className="notif-panel-head">
              <strong>Acessos em tempo real</strong>
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

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card ${toast.decision}`}>
            <strong>{toast.title}</strong>
            <span>{toast.body}</span>
          </div>
        ))}
      </div>
    </>
  );
}
