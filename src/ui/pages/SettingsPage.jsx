import { KeyRound, Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field } from '../components/Field.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function SettingsPage({ settings, saveSettings, changePassword, isAdmin }) {
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState('');
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function onSubmit(event) {
    event.preventDefault();
    const result = await saveSettings(form);
    setMessage(result.ok ? 'Configuracoes salvas.' : result.message);
  }

  async function onChangePassword(event) {
    event.preventDefault();
    setPwdLoading(true);
    setPwdMessage('');
    const result = await changePassword(pwd);
    setPwdLoading(false);
    if (result.ok) {
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwdMessage('Senha atualizada. Voce continua logado.');
    } else {
      setPwdMessage(result.message || 'Nao foi possivel trocar a senha.');
    }
  }

  return (
    <>
      <PageHeader title="Configuracoes" subtitle="Preferencias da conta e do painel" icon={Settings} />

      <form className="panel settings-panel" onSubmit={onChangePassword}>
        <h2>
          <KeyRound size={18} /> Trocar senha
        </h2>
        <Field label="Senha atual" required>
          <input
            type="password"
            value={pwd.currentPassword}
            onChange={(event) => setPwd((c) => ({ ...c, currentPassword: event.target.value }))}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="Nova senha" hint="Minimo 6 caracteres" required>
          <input
            type="password"
            value={pwd.newPassword}
            onChange={(event) => setPwd((c) => ({ ...c, newPassword: event.target.value }))}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </Field>
        <Field label="Confirmar nova senha" required>
          <input
            type="password"
            value={pwd.confirmPassword}
            onChange={(event) => setPwd((c) => ({ ...c, confirmPassword: event.target.value }))}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </Field>
        {pwdMessage && <div className="message">{pwdMessage}</div>}
        <button
          className="submit-button settings-save"
          type="submit"
          disabled={pwdLoading || !pwd.currentPassword || !pwd.newPassword || !pwd.confirmPassword}
        >
          <KeyRound size={18} />
          {pwdLoading ? 'Salvando...' : 'Atualizar senha'}
        </button>
      </form>

      <form className="panel settings-panel" onSubmit={onSubmit} style={{ marginTop: 18 }}>
        <h2>Preferencias</h2>
        <Field label="E-mail do operador">
          <input
            value={form.operatorEmail || ''}
            onChange={(event) => setForm((current) => ({ ...current, operatorEmail: event.target.value }))}
            placeholder="voce@empresa.com"
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
        {isAdmin && (
          <>
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
          </>
        )}
        {message && <div className="message">{message}</div>}
        <button className="submit-button settings-save" type="submit">
          <Save size={18} />
          Salvar configuracoes
        </button>
      </form>
    </>
  );
}
