import { Lock, Shield } from 'lucide-react';
import { useState } from 'react';
import { api, setAdminToken } from '../api/client.js';

export function LoginPage({ onLoggedIn }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setAdminToken(token.trim());

    try {
      const { ok, status } = await api.getCampaigns();
      if (ok) {
        onLoggedIn();
        return;
      }
      if (status === 401) {
        setError('Token invalido. Use o mesmo valor de ADMIN_TOKEN do EasyPanel.');
        setAdminToken('');
      } else {
        setError('Nao foi possivel conectar na API.');
      }
    } catch {
      setError('Backend indisponivel.');
      setAdminToken('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="panel login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="brand-mark">
            <Shield size={26} />
          </div>
          <div>
            <h1>MyCloaker</h1>
            <p>Acesso do painel (ADMIN_TOKEN)</p>
          </div>
        </div>
        <label className="field">
          <span>Token de administrador</span>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Cole o ADMIN_TOKEN"
            autoFocus
          />
        </label>
        {error && <div className="message error-banner">{error}</div>}
        <button className="submit-button" type="submit" disabled={loading || !token.trim()}>
          <Lock size={18} />
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
