import { useEffect, useState } from 'react';
import { api, clearAdminToken, getAdminToken, getStoredUser, setStoredUser } from './api/client.js';
import { NotificationBell } from './components/NotificationBell.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { useDashboardData } from './hooks/useDashboardData.js';
import { AccessPage } from './pages/AccessPage.jsx';
import { CampaignsPage } from './pages/CampaignsPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DomainsPage } from './pages/DomainsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PlansPage } from './pages/PlansPage.jsx';
import { SecurityPage } from './pages/SecurityPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [user, setUser] = useState(getStoredUser());
  const [activePage, setActivePage] = useState('dashboard');
  const data = useDashboardData({ enabled: authChecked && !needsLogin });
  const activeCampaign = data.campaigns.find((c) => c.status === 'active') || data.campaigns[0];

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        if (!getAdminToken()) {
          if (!cancelled) {
            setNeedsLogin(true);
            setAuthChecked(true);
          }
          return;
        }

        const me = await api.me();
        if (!cancelled) {
          if (me.ok && me.payload?.user) {
            setUser(me.payload.user);
            setStoredUser(me.payload.user);
            setNeedsLogin(false);
          } else if (me.status === 401) {
            clearAdminToken();
            setUser(null);
            setNeedsLogin(true);
          } else {
            // token legado / backend sem /me ainda
            const probe = await api.getCampaigns();
            if (probe.status === 401) {
              clearAdminToken();
              setNeedsLogin(true);
            } else {
              setNeedsLogin(false);
            }
          }
          setAuthChecked(true);
        }
      } catch {
        if (!cancelled) {
          setNeedsLogin(true);
          setAuthChecked(true);
        }
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    clearAdminToken();
    setUser(null);
    setNeedsLogin(true);
  }

  if (!authChecked) {
    return (
      <div className="login-shell">
        <div className="panel login-card">
          <img src="/logo.jpg" alt="Cloaker.lol" className="brand-logo large" />
          <p>Carregando Cloaker.lol...</p>
        </div>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <LoginPage
        onLoggedIn={(nextUser) => {
          setUser(nextUser || getStoredUser());
          setNeedsLogin(false);
          data.refreshData();
        }}
      />
    );
  }

  let page;
  if (activePage === 'dashboard') {
    page = <DashboardPage stats={data.stats} events={data.events} />;
  } else if (activePage === 'access') {
    page = <AccessPage events={data.events} stats={data.stats} refreshData={data.refreshData} />;
  } else if (activePage === 'domains') {
    page = (
      <DomainsPage
        domains={data.domains}
        createDomain={data.createDomain}
        updateDomain={data.updateDomain}
        deleteDomain={data.deleteDomain}
      />
    );
  } else if (activePage === 'security') {
    page = (
      <SecurityPage
        events={data.events}
        blockedIps={data.blockedIps}
        createBlockedIp={data.createBlockedIp}
        deleteBlockedIp={data.deleteBlockedIp}
        refreshData={data.refreshData}
        stats={data.stats}
      />
    );
  } else if (activePage === 'plans') {
    page = <PlansPage />;
  } else if (activePage === 'settings') {
    page = <SettingsPage settings={data.settings} saveSettings={data.saveSettings} />;
  } else {
    page = (
      <CampaignsPage
        form={data.form}
        updateField={data.updateField}
        submitCampaign={data.submitCampaign}
        message={data.message}
        loading={data.loading}
        campaigns={data.campaigns}
        activeCampaign={activeCampaign}
        domains={data.domains}
        updateCampaign={data.updateCampaign}
        deleteCampaign={data.deleteCampaign}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        settings={data.settings}
        user={user}
        onLogout={logout}
      />
      <main className={`content page-${activePage}`}>
        <div className="topbar">
          <div />
          <NotificationBell
            enabled={data.settings?.accessNotificationsEnabled !== false}
            onOpenAccess={() => {
              setActivePage('access');
              data.refreshData();
            }}
          />
        </div>
        {data.error && <div className="message error-banner">{data.error}</div>}
        {page}
      </main>
    </div>
  );
}
