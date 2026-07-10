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
import { TutorialPage } from './pages/TutorialPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';

function hasSeenTutorial() {
  try {
    return localStorage.getItem('cloaker_tutorial_done') === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [user, setUser] = useState(getStoredUser());
  const [activePage, setActivePage] = useState('dashboard');
  const [firstRunTutorial, setFirstRunTutorial] = useState(false);
  const data = useDashboardData({ enabled: authChecked && !needsLogin });
  const activeCampaign = data.campaigns.find((c) => c.status === 'active') || data.campaigns[0];
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'owner' || user?.role === 'admin');

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
            if (!hasSeenTutorial()) {
              setFirstRunTutorial(true);
              setActivePage('tutorial');
            }
          } else if (me.status === 401 || me.status === 403) {
            clearAdminToken();
            setUser(null);
            setNeedsLogin(true);
          } else {
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

  function enterApp(nextUser) {
    const u = nextUser || getStoredUser();
    setUser(u);
    setNeedsLogin(false);
    data.refreshData();
    if (!hasSeenTutorial()) {
      setFirstRunTutorial(true);
      setActivePage('tutorial');
    } else {
      setActivePage('dashboard');
    }
  }

  if (!authChecked) {
    return (
      <div className="login-shell">
        <div className="login-stack">
          <div className="login-brand">
            <img src="/logo.png?v=2" alt="Cloaker.lol" className="brand-logo large" />
          </div>
          <div className="panel login-card">
            <p className="login-subtitle">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (needsLogin) {
    return <LoginPage onLoggedIn={enterApp} />;
  }

  let page;
  if (activePage === 'tutorial') {
    page = (
      <TutorialPage
        isFirstRun={firstRunTutorial || !hasSeenTutorial()}
        onComplete={() => {
          setFirstRunTutorial(false);
          setActivePage('dashboard');
        }}
      />
    );
  } else if (activePage === 'dashboard') {
    page = <DashboardPage stats={data.stats} events={data.events} />;
  } else if (activePage === 'access') {
    page = <AccessPage events={data.events} stats={data.stats} refreshData={data.refreshData} />;
  } else if (activePage === 'domains' && isAdmin) {
    page = (
      <DomainsPage
        domains={data.domains}
        createDomain={data.createDomain}
        updateDomain={data.updateDomain}
        deleteDomain={data.deleteDomain}
      />
    );
  } else if (activePage === 'security' && isAdmin) {
    page = (
      <SecurityPage
        events={data.events}
        blockedIps={data.blockedIps}
        createBlockedIp={data.createBlockedIp}
        deleteBlockedIp={data.deleteBlockedIp}
        routeLists={data.routeLists}
        addRouteListEntry={data.addRouteListEntry}
        removeRouteListEntry={data.removeRouteListEntry}
        refreshData={data.refreshData}
        stats={data.stats}
      />
    );
  } else if (activePage === 'users' && isAdmin) {
    page = (
      <UsersPage
        users={data.users}
        createUser={data.createUser}
        updateUser={data.updateUser}
        deleteUser={data.deleteUser}
        refreshUsers={data.refreshUsers}
      />
    );
  } else if (activePage === 'plans' && isAdmin) {
    page = <PlansPage />;
  } else if (activePage === 'settings') {
    page = (
      <SettingsPage
        settings={data.settings}
        saveSettings={data.saveSettings}
        changePassword={data.changePassword}
        isAdmin={isAdmin}
      />
    );
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
        startCampaignTest={data.startCampaignTest}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} setActivePage={setActivePage} user={user} onLogout={logout} />
      <main className={`content page-${activePage}`}>
        <div className="topbar">
          <div className="topbar-title">
            {activePage === 'tutorial' ? 'Tutorial' : null}
          </div>
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
