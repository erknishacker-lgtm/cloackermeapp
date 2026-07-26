import { ArrowRight, Check, Lock, Shield } from '../icons.jsx';
import { useState } from 'react';
import { api, setAdminToken, setStoredUser } from '../api/client.js';
import { toast } from '../toast.js';
import { LoginGhostField } from '../components/LoginGhostField.jsx';

const LOGO_SRC = '/logo.png?v=zghost8';

export function LoginPage({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [step, setStep] = useState('password'); // password | 2fa
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function finishLogin(payload) {
    setAdminToken(payload.token);
    setStoredUser(payload.user);
    onLoggedIn(payload.user);
  }

  async function submitPassword(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.login(username.trim(), password);

      if (!result.ok) {
        const msg = result.payload?.message || result.payload?.errors?.join(', ') || 'Falha na autenticacao.';
        setError(msg);
        toast.error('Login', msg);
        return;
      }

      if (result.payload?.requires2fa && result.payload?.challengeToken) {
        setChallengeToken(result.payload.challengeToken);
        setStep('2fa');
        setTotpCode('');
        toast.info('2FA', 'Digite o codigo do autenticador.');
        return;
      }

      await finishLogin(result.payload);
      toast.success('Bem-vindo', result.payload?.user?.displayName || result.payload?.user?.username || 'Sessao iniciada');
    } catch {
      setError('Backend indisponivel. Confira se o servidor esta no ar.');
      toast.error('Offline', 'Backend indisponivel.');
    } finally {
      setLoading(false);
    }
  }

  async function submit2fa(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.verify2faLogin(challengeToken, totpCode.trim());
      if (!result.ok) {
        const msg = result.payload?.message || 'Codigo 2FA invalido.';
        setError(msg);
        toast.error('2FA', msg);
        return;
      }
      await finishLogin(result.payload);
      toast.success('Login ok', 'Autenticacao em duas etapas concluida.');
    } catch {
      setError('Backend indisponivel. Confira se o servidor esta no ar.');
      toast.error('Offline', 'Backend indisponivel.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell login-split">
      <aside className="login-hero">
        <LoginGhostField />
        <div className="login-hero-inner">
          <div className="login-hero-brand login-hero-brand-stack">
            <img src={LOGO_SRC} alt="" className="login-ghost-logo lg" />
            <strong className="brand-word">zGhost</strong>
          </div>
          <h1>Console de roteamento anti-bot</h1>
          <p>
            Entre para gerenciar campanhas, dominios e requisicoes em tempo real — layout limpo, foco na
            operacao.
          </p>
          <ul className="login-hero-points">
            <li>
              <Check size={14} className="login-hero-point-icon" />
              Filtro de trafego server-side
            </li>
            <li>
              <Check size={14} className="login-hero-point-icon" />
              Mapa e log de requisicoes
            </li>
            <li>
              <Check size={14} className="login-hero-point-icon" />
              Listas e bloqueios por conta
            </li>
          </ul>
        </div>
      </aside>

      <main className="login-main">
        {step === 'password' ? (
          <form className="login-card-v2" onSubmit={submitPassword}>
            <div className="login-card-head-v2">
              <div className="login-card-icon" aria-hidden>
                <Lock size={18} />
              </div>
              <div>
                <h2>Bem-vindo de volta</h2>
                <p>Entre na sua conta para continuar</p>
              </div>
            </div>

            <label className="field">
              <span>Usuario ou e-mail</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="seu.usuario"
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
                placeholder="Sua senha"
                autoComplete="current-password"
              />
            </label>

            {error ? <div className="message error-banner">{error}</div> : null}

            <button
              className="submit-button login-submit"
              type="submit"
              disabled={loading || !username.trim() || !password}
            >
              {loading ? 'Aguarde...' : 'Entrar'}
              {!loading ? <ArrowRight size={18} /> : null}
            </button>

            <p className="login-hint">Cadastro publico fechado. Contas sao criadas pelo administrador.</p>
          </form>
        ) : (
          <form className="login-card-v2" onSubmit={submit2fa}>
            <div className="login-card-head-v2">
              <div className="login-card-icon" aria-hidden>
                <Shield size={18} />
              </div>
              <div>
                <h2>Verificacao em 2 etapas</h2>
                <p>Abra o app autenticador e digite o codigo de 6 digitos</p>
              </div>
            </div>

            <label className="field">
              <span>Codigo 2FA</span>
              <input
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className="mono"
              />
            </label>

            {error ? <div className="message error-banner">{error}</div> : null}

            <button
              className="submit-button login-submit"
              type="submit"
              disabled={loading || totpCode.length !== 6}
            >
              {loading ? 'Aguarde...' : 'Confirmar'}
              {!loading ? <ArrowRight size={18} /> : null}
            </button>

            <button
              type="button"
              className="ghost-button"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={() => {
                setStep('password');
                setChallengeToken('');
                setTotpCode('');
                setError('');
              }}
            >
              Voltar ao login
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
