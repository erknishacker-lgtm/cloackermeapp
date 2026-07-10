import { Lock, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { api, setAdminToken, setStoredUser } from '../api/client.js';

export function LoginPage({ onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result =
        mode === 'login'
          ? await api.login(username.trim(), password)
          : await api.register({
              username: username.trim(),
              password,
              displayName: displayName.trim() || username.trim()
            });

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
      <form className="panel login-card" onSubmit={submit}>
        <div className="login-brand">
          <img src="/logo.jpg" alt="Cloaker.lol" className="brand-logo" />
          <div>
            <h1>Cloaker.lol</h1>
            <p>{mode === 'login' ? 'Entre no painel' : 'Crie sua conta'}</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>
            Cadastro
          </button>
        </div>

        {mode === 'register' && (
          <label className="field">
            <span>Nome de exibicao</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Seu nome" />
          </label>
        )}

        <label className="field">
          <span>Usuario</span>
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
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <div className="message error-banner">{error}</div>}

        <button className="submit-button" type="submit" disabled={loading || !username.trim() || !password}>
          {mode === 'login' ? <Lock size={18} /> : <UserPlus size={18} />}
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        {mode === 'login' && (
          <p className="login-hint">
            Perfil principal: <strong>louzada</strong> (acesso total liberado)
          </p>
        )}
      </form>
    </div>
  );
}
