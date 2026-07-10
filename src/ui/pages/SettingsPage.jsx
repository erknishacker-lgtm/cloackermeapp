import { Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field } from '../components/Field.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function SettingsPage({ settings, saveSettings }) {
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function onSubmit(event) {
    event.preventDefault();
    const result = await saveSettings(form);
    setMessage(result.ok ? 'Configuracoes salvas.' : result.message);
  }

  return (
    <>
      <PageHeader title="Configuracoes" subtitle="Preferencias do painel e do motor anti-bot" icon={Settings} />
      <form className="panel settings-panel" onSubmit={onSubmit}>
        <Field label="E-mail do operador">
          <input
            value={form.operatorEmail || ''}
            onChange={(event) => setForm((current) => ({ ...current, operatorEmail: event.target.value }))}
            placeholder="voce@empresa.com"
          />
        </Field>
        <Field label="WhatsApp suporte (somente numeros, com DDI)" hint="Ex: 5511999999999">
          <input
            value={form.supportWhatsapp || ''}
            onChange={(event) => setForm((current) => ({ ...current, supportWhatsapp: event.target.value }))}
            placeholder="5511999999999"
          />
        </Field>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.accessNotificationsEnabled !== false}
            onChange={(event) =>
              setForm((current) => ({ ...current, accessNotificationsEnabled: event.target.checked }))
            }
          />
          <span>Notificacoes de acessos reais (sino + toasts no painel)</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.allowSimulate !== false}
            onChange={(event) => setForm((current) => ({ ...current, allowSimulate: event.target.checked }))}
          />
          <span>Permitir `?simulate=human|bot` nos links (somente dev/teste)</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.autoBlockEnabled !== false}
            onChange={(event) => setForm((current) => ({ ...current, autoBlockEnabled: event.target.checked }))}
          />
          <span>Auto-ban de IPs apos violacoes repetidas</span>
        </label>
        {message && <div className="message">{message}</div>}
        <button className="submit-button settings-save" type="submit">
          <Save size={18} />
          Salvar configuracoes
        </button>
      </form>
    </>
  );
}
