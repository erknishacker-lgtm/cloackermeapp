import { BookOpen, CheckCircle2, FlaskConical, Globe, Link2, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import { api } from '../api/client.js';

const STEPS = [
  {
    title: 'O que e o cloaker',
    body: 'Seu link publico e /r/seu-slug. Visitante “ok” vai para a URL principal. Trafego suspeito vai para a URL alternativa. Voce configura tudo sozinho — sem depender do admin.'
  },
  {
    title: 'Dominios (menu Dominios)',
    body: 'Pode usar o dominio da plataforma (ex: cloaker.lol) sem configurar nada. Se quiser dominio proprio, aponte o DNS no registrador/Cloudflare e cadastre o nome em Dominios para ele aparecer nas campanhas.'
  },
  {
    title: 'Seguranca (menu Seguranca)',
    body: 'Cada usuario tem listas proprias: blacklist de User-Agent, blacklist de IP e whitelist de IP. Elas valem so nas SUAS campanhas. Outros clientes nao veem nem usam as suas listas.'
  },
  {
    title: 'Whitelist do seu IP',
    body: 'Para testar sem cair na alternativa, adicione seu IP na whitelist (botao abaixo ou em Seguranca). No celular 4G o IP muda — adicione de novo se precisar.'
  },
  {
    title: 'Campanha + teste',
    body: 'Em Campanhas, crie principal + alternativa, escolha o dominio e copie o link mascarado. Use o botao de teste (frasco) para abrir /r/slug com cookie de 1 hora.'
  }
];

export function TutorialPage({ onComplete, isFirstRun }) {
  const [ipInfo, setIpInfo] = useState({ ip: '', onWhitelist: false });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadIp() {
    try {
      const { ok, payload } = await api.getMyIp();
      if (ok && payload) setIpInfo({ ip: payload.ip || '', onWhitelist: Boolean(payload.onWhitelist) });
    } catch {
      setIpInfo({ ip: '', onWhitelist: false });
    }
  }

  useEffect(() => {
    loadIp();
  }, []);

  async function addMyIp() {
    setLoading(true);
    setMessage('');
    try {
      const { ok, payload } = await api.addMyIpToWhitelist();
      if (ok) {
        setIpInfo({ ip: payload.ip || ipInfo.ip, onWhitelist: true });
        setMessage(payload.message || 'IP adicionado a SUA whitelist.');
      } else {
        setMessage(payload?.message || 'Nao foi possivel adicionar o IP.');
      }
    } catch {
      setMessage('Falha ao conectar no backend.');
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    try {
      localStorage.setItem('cloaker_tutorial_done', '1');
    } catch {
      // ignore
    }
    onComplete?.();
  }

  return (
    <>
      <PageHeader
        title="Tutorial"
        subtitle={
          isFirstRun
            ? 'Bem-vindo! Em 5 passos voce usa o cloaker sozinho (sem admin).'
            : 'Guia rapido: dominios, listas, whitelist e campanha'
        }
        icon={BookOpen}
      />

      {isFirstRun && (
        <div className="panel tutorial-welcome">
          <strong>Primeiro acesso</strong>
          <p>
            Voce tem o mesmo poder operacional do dono da conta nas suas campanhas: Dominios, Seguranca, Campanhas e
            Acessos. So Usuarios e Planos ficam com o admin da plataforma.
          </p>
        </div>
      )}

      <ol className="tutorial-steps">
        {STEPS.map((step, index) => (
          <li className="panel tutorial-step" key={step.title}>
            <span className="tutorial-num">{index + 1}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="panel tutorial-ip-card">
        <div className="tutorial-ip-head">
          <Globe size={22} />
          <div>
            <h2>Seu IP agora</h2>
            <p>Entra na SUA whitelist (so nas suas campanhas)</p>
          </div>
        </div>
        <div className="tutorial-ip-value">
          <code>{ipInfo.ip || 'detectando…'}</code>
          {ipInfo.onWhitelist ? (
            <span className="status-pill success">
              <CheckCircle2 size={14} /> Na whitelist
            </span>
          ) : (
            <span className="status-pill warn">Fora da whitelist</span>
          )}
        </div>
        <div className="tutorial-actions">
          <button className="submit-button" type="button" onClick={addMyIp} disabled={loading || !ipInfo.ip}>
            <ShieldCheck size={18} />
            {loading ? 'Adicionando…' : 'Adicionar meu IP a whitelist'}
          </button>
          <button className="ghost-button" type="button" onClick={loadIp}>
            Atualizar IP
          </button>
        </div>
        {message && <div className="message">{message}</div>}
        <ul className="tutorial-tips">
          <li>
            <Smartphone size={16} /> No celular (4G/5G) o IP muda — adicione de novo se precisar.
          </li>
          <li>
            <FlaskConical size={16} /> Alternativa rapida: em Campanhas, use o botao de teste (cookie 1h).
          </li>
          <li>
            <Link2 size={16} /> Depois de criar a campanha, o link completo (https://dominio/r/slug) aparece para copiar.
          </li>
        </ul>
      </section>

      <div className="tutorial-footer-actions">
        <button className="submit-button" type="button" onClick={finish}>
          {isFirstRun ? 'Concluir e ir ao painel' : 'Marcar como visto'}
        </button>
      </div>
    </>
  );
}
