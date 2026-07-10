import { BookOpen, CheckCircle2, FlaskConical, Globe, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import { api } from '../api/client.js';

const STEPS = [
  {
    title: 'Entenda o fluxo',
    body: 'Seu link publico e /r/seu-slug. Visitantes “reais” vao para a URL principal. Trafego bloqueado vai para a URL alternativa.'
  },
  {
    title: 'Descubra seu IP',
    body: 'Para testar como humano sem cair na alternativa, seu IP precisa estar na whitelist. O sistema detecta o IP desta conexao automaticamente.'
  },
  {
    title: 'Coloque o IP na whitelist',
    body: 'Clique em “Adicionar meu IP a whitelist”. Isso libera a URL principal para o seu aparelho/rede atual por regra global de IP.'
  },
  {
    title: 'Crie e teste a campanha',
    body: 'Em Campanhas, crie principal + alternativa. Use o botao de teste (frasco) para abrir /r/slug com cookie de teste de 1 hora — sem depender so da whitelist.'
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
        setMessage(payload.message || 'IP adicionado a whitelist.');
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
            ? 'Bem-vindo! Siga estes passos antes de colocar trafego real.'
            : 'Guia rapido: whitelist, campanha e teste'
        }
        icon={BookOpen}
      />

      {isFirstRun && (
        <div className="panel tutorial-welcome">
          <strong>Primeiro acesso</strong>
          <p>Leia o passo a passo abaixo. Depois o Tutorial fica sempre no menu, no canto.</p>
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
            <p>Detectado pelo servidor a partir desta conexao</p>
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
