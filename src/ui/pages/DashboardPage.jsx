import {
  Activity,
  BookOpen,
  Filter,
  Globe2,
  Grid2X2,
  Settings,
  ShieldCheck,
  Crown,
  ArrowRight
} from '../icons.jsx';
import { UiCard, UiCardFooter, UiCardHeader } from '../components/UiCard.jsx';
import { VisitorsChart } from '../components/VisitorsChart.jsx';

function HubCard({ icon: Icon, title, description, actionLabel, onAction, highlight }) {
  return (
    <UiCard variant={highlight ? 'soft' : 'interactive'} className="hub-card">
      <UiCardHeader icon={Icon} title={title} description={description} />
      <UiCardFooter>
        <button
          type="button"
          className={highlight ? 'hub-btn primary' : 'hub-btn'}
          onClick={onAction}
        >
          {actionLabel}
          <ArrowRight size={14} />
        </button>
      </UiCardFooter>
    </UiCard>
  );
}

export function DashboardPage({ setActivePage, isAdmin, events = [] }) {
  const go = (id) => () => setActivePage?.(id);

  return (
    <div className="cloakup-page wide">
      <header className="cloakup-page-head">
        <h1>Dashboard</h1>
      </header>

      <UiCard variant="soft" className="help-banner">
        <div className="help-banner-copy">
          <strong>Precisa de ajuda?</strong>
          <span>Use o Tutorial para configurar dominio, listas e campanha em poucos passos.</span>
        </div>
        <button type="button" className="ghost-button" onClick={go('tutorial')}>
          Abrir tutorial
        </button>
      </UiCard>

      <section className="hub-section">
        <VisitorsChart events={events} />
      </section>

      <section className="hub-section">
        <h2 className="hub-section-title">Produtos</h2>
        <div className="hub-grid hub-grid-2">
          <HubCard
            icon={Filter}
            title="Filtro de trafego"
            description="Proteja o link de bots, scrapers e trafego indesejado com campanhas e regras."
            actionLabel="Acessar"
            onAction={go('campaigns')}
          />
          <HubCard
            icon={ShieldCheck}
            title="Seguranca"
            description="Listas de bloqueio, IPs e regras de User-Agent por conta."
            actionLabel="Acessar"
            onAction={go('security')}
          />
        </div>
      </section>

      <section className="hub-section">
        <h2 className="hub-section-title">Links uteis</h2>
        <div className="hub-grid hub-grid-3">
          <HubCard
            icon={BookOpen}
            title="Central de ajuda"
            description="Tutorial completo de uso do sistema."
            actionLabel="Acessar"
            onAction={go('tutorial')}
          />
          <HubCard
            icon={Settings}
            title="Configuracoes"
            description="Conta, senha e preferencias do painel."
            actionLabel="Acessar"
            onAction={go('settings')}
          />
          <HubCard
            icon={Activity}
            title="Requisicoes"
            description="Log em tempo real de acessos e decisoes."
            actionLabel="Acessar"
            onAction={go('access')}
            highlight
          />
        </div>
      </section>

      <section className="hub-section">
        <h2 className="hub-section-title">Atalhos</h2>
        <div className="hub-grid hub-grid-2">
          <HubCard
            icon={Grid2X2}
            title="Campanhas"
            description="Crie e gerencie cloakers com link mascarado."
            actionLabel="Acessar"
            onAction={go('campaigns')}
          />
          <HubCard
            icon={Globe2}
            title="Dominios"
            description="Cadastre dominios para os links /r/slug."
            actionLabel="Acessar"
            onAction={go('domains')}
          />
          {isAdmin ? (
            <HubCard
              icon={Crown}
              title="Planos e usuarios"
              description="Gestao de clientes e planos (admin)."
              actionLabel="Acessar"
              onAction={go('users')}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
