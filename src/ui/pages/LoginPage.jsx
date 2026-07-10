import { Lock } from 'lucide-react';
import { useState } from 'react';
import { api, setAdminToken, setStoredUser } from '../api/client.js';

export function LoginPage({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.login(username.trim(), password);

      if (!result.ok) {
        setError(result.payload?.message || result.payload?.errors?.join(', ') || 'Falha na autenticacao.');
        return;
      }

      setAdminToken(result.payload.token);
      setStoredUser(result.payload.user);
      onLoggedIn(result.payload.user);
    } catch {
      setError('Backend indisponivel. Confira se o servidor esta no ar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-stack">
        {/* Logo fora do card — fundo transparente do site */}
        <div className="login-brand">
          <img src="/logo.png?v=2" alt="Cloaker.lol" className="brand-logo large" />
        </div>

        <form className="panel login-card" onSubmit={submit}>
          <p className="login-subtitle">Entre no painel</p>

          <label className="field">
            <span>Usuario ou e-mail</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="louzada"
              autoFocus
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && <div className="message error-banner">{error}</div>}

          <button className="submit-button" type="submit" disabled={loading || !username.trim() || !password}>
            <Lock size={18} />
            {loading ? 'Aguarde...' : 'Entrar'}
          </button>

          <p className="login-hint">Cadastro publico fechado. Contas sao criadas pelo administrador.</p>
        </form>
      </div>
    </div>
  );
}
