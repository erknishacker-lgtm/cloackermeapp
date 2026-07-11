import { Bell, CheckCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

const SHOWN_KEY = 'cloaker_toast_shown_ids';

function loadShownIds() {
  try {
    const raw = sessionStorage.getItem(SHOWN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveShownIds(set) {
  try {
    // Mantem no maximo 300 ids pra nao estourar sessionStorage
    const arr = [...set].slice(-300);
    sessionStorage.setItem(SHOWN_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function NotificationBell({ enabled, onOpenAccess }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const shownToastIds = useRef(loadShownIds());
  const toastTimers = useRef(new Map());

  function rememberShown(id) {
    if (!id || shownToastIds.current.has(id)) return;
    shownToastIds.current.add(id);
    saveShownIds(shownToastIds.current);
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    rememberShown(id);
  }

  function showToastOnce(item) {
    if (!item?.id || shownToastIds.current.has(item.id)) return;
    rememberShown(item.id);

    setToasts((current) => {
      if (current.some((t) => t.id === item.id)) return current;
      return [item, ...current].slice(0, 3);
    });

    // Some sozinho apos 5s — sem reaparecer no proximo poll
    const timer = window.setTimeout(() => {
      dismissToast(item.id);
    }, 5000);
    toastTimers.current.set(item.id, timer);
  }

  async function load() {
    if (enabled === false) {
      setItems([]);
      setUnread(0);
      setToasts([]);
      return;
    }
    try {
      const { ok, payload } = await api.getNotifications();
      if (!ok) return;

      const list = payload.items || [];
      setItems(list);
      setUnread(payload.unread || 0);

      // Popup: so itens nao lidos que ainda NUNCA mostraram toast nesta sessao
      const candidates = list
        .filter((item) => !item.read && !shownToastIds.current.has(item.id))
        .slice(0, 2);

      for (const item of candidates) {
        showToastOnce(item);
      }
    } catch {
      // ignore polling errors
    }
  }

  useEffect(() => {
    load();
    if (enabled === false) return undefined;
    const timer = window.setInterval(load, 10000);
    return () => {
      window.clearInterval(timer);
      for (const t of toastTimers.current.values()) window.clearTimeout(t);
      toastTimers.current.clear();
    };
  }, [enabled]);

  async function markAll() {
    await api.markAllNotificationsRead();
    // Marca todos como "ja mostrados" pra nao reabrir toast
    for (const item of items) rememberShown(item.id);
    setToasts([]);
    await load();
  }

  async function markOne(id) {
    rememberShown(id);
    dismissToast(id);
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
            <button
              type="button"
              className="toast-close"
              aria-label="Fechar"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={14} />
            </button>
            <strong>{toast.title}</strong>
            <span>{toast.body}</span>
          </div>
        ))}
      </div>
    </>
  );
}
