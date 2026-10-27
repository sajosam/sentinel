import React, { useState, useEffect } from 'react';
import {
  Workspace,
  Investigation,
  Finding,
  AttackPath,
  AuditEvent,
  ShieldStatus,
  SystemHealth
} from './types';
import { api } from './api/client';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { OnboardingModal } from './components/OnboardingModal';
import { Overview } from './pages/Overview';
import { Projects } from './pages/Projects';
import { InvestigationCenter } from './pages/InvestigationCenter';
import { Findings } from './pages/Findings';
import { ActivityAudit } from './pages/ActivityAudit';
import { Settings } from './pages/Settings';
import { ShieldAlert, X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [projectSubTab, setProjectSubTab] = useState<string>('overview');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [attackPaths, setAttackPaths] = useState<AttackPath[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [shieldStatus, setShieldStatus] = useState<ShieldStatus | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const [policyToast, setPolicyToast] = useState<any | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Load initial application data
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);

      let wsList = await api.listWorkspaces();
      if (wsList.length === 0) {
        await api.setupDemo();
        wsList = await api.listWorkspaces();
      }
      setWorkspaces(wsList);
      if (wsList.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(wsList[0]);
      }
    } catch (e) {
      console.error('App init error:', e);
    }
  };

  // Reload data when currentWorkspace changes
  useEffect(() => {
    if (currentWorkspace) {
      refreshData();
    }
  }, [currentWorkspace]);

  // Subscribe to live SSE events
  useEffect(() => {
    const eventSource = new EventSource('/api/investigations/events/live');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.event_type === 'step_completed' ||
          payload.event_type === 'finished' ||
          payload.event_type === 'finding_discovered'
        ) {
          refreshData();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };
    return () => {
      eventSource.close();
    };
  }, [currentWorkspace]);

  // Auto-dismiss policy toast after 7 seconds
  useEffect(() => {
    if (policyToast) {
      const timer = setTimeout(() => {
        setPolicyToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [policyToast]);

  const refreshData = async () => {
    if (!currentWorkspace) return;
    try {
      const [invs, fnds, paths, audits, shield] = await Promise.all([
        api.listInvestigations(currentWorkspace.id),
        api.listFindings({ workspace_id: currentWorkspace.id }),
        api.listAttackPaths(currentWorkspace.id),
        api.listAudit(currentWorkspace.id, 50),
        api.getShieldStatus(currentWorkspace.id),
      ]);
      setInvestigations(invs);
      setFindings(fnds);
      setAttackPaths(paths);
      setAuditEvents(audits);
      setShieldStatus(shield);
    } catch (e) {
      console.error('Failed to refresh data:', e);
    }
  };

  const handleStartInvestigation = async () => {
    if (!currentWorkspace) {
      setIsOnboardingOpen(true);
      return;
    }
    try {
      await api.startInvestigation(currentWorkspace.id);
      setCurrentTab('investigations');
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerPolicyBlock = async () => {
    try {
      const res = await api.triggerPolicyViolation();
      setPolicyToast(res);
      refreshData();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      await refreshData();
      alert('Security Lab files and database reset to initial vulnerable state.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectFindingForFix = (finding: Finding) => {
    setCurrentTab('projects');
    setProjectSubTab('fix_verify');
  };

  const handleNavigateWithSubTab = (tab: NavTab, subTab?: string) => {
    setCurrentTab(tab);
    if (subTab) {
      setProjectSubTab(subTab);
    }
  };

  const currentInvestigation = investigations[0] || null;
  const isInvestigating = currentInvestigation
    ? ['running', 'planning', 'pending'].includes(currentInvestigation.status)
    : false;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B1020] text-[#E8ECF5] overflow-hidden font-sans antialiased">
      {/* 1. Compact Header */}
      <Header
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={(ws) => setCurrentWorkspace(ws)}
        onTriggerPolicyBlock={handleTriggerPolicyBlock}
        onResetDemo={handleResetDemo}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* 2. Global Frame */}
      <div className="flex flex-1 overflow-hidden">
        {/* Narrow Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0B1020]">
          {/* Active Tab View */}
          {currentTab === 'overview' && (
            <Overview
              workspaces={workspaces}
              currentWorkspace={currentWorkspace}
              findings={findings}
              auditEvents={auditEvents}
              shieldStatus={shieldStatus}
              investigations={investigations}
              isInvestigating={isInvestigating}
              onStartAudit={handleStartInvestigation}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onNavigateToTab={handleNavigateWithSubTab}
              onSelectFindingForFix={handleSelectFindingForFix}
            />
          )}

          {currentTab === 'projects' && (
            <Projects
              workspaces={workspaces}
              currentWorkspace={currentWorkspace}
              onSelectWorkspace={(ws) => setCurrentWorkspace(ws)}
              findings={findings}
              attackPaths={attackPaths}
              shieldStatus={shieldStatus}
              auditEvents={auditEvents}
              investigations={investigations}
              onStartAudit={handleStartInvestigation}
              onTriggerPolicyBlock={handleTriggerPolicyBlock}
              onResetDemo={handleResetDemo}
              onRefresh={initApp}
              initialSubTab={projectSubTab}
            />
          )}

          {currentTab === 'investigations' && (
            <InvestigationCenter
              currentInvestigation={currentInvestigation}
              onRefresh={refreshData}
              onStartNew={handleStartInvestigation}
            />
          )}

          {currentTab === 'findings' && (
            <Findings
              findings={findings}
              onSelectFindingForFix={handleSelectFindingForFix}
            />
          )}

          {currentTab === 'activity' && (
            <ActivityAudit auditEvents={auditEvents} />
          )}

          {currentTab === 'settings' && (
            <Settings health={health} />
          )}
        </main>
      </div>

      {/* Temporary Toast Notification for Policy Denial Events */}
      {policyToast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl border border-rose-500/30 bg-[#141B2D] shadow-2xl text-[#E8ECF5] max-w-sm space-y-2 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-semibold text-rose-300">
                Action Blocked: Policy Denial
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPolicyToast(null)}
              className="text-[#9AA6BF] hover:text-[#E8ECF5] p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#9AA6BF] leading-relaxed">
            {policyToast.reason}
          </p>
          <div className="text-[11px] text-[#8B7CFF] font-mono truncate bg-[#0B1020] p-1.5 rounded border border-[#283149]">
            Target: {policyToast.target}
          </div>
        </div>
      )}

      {/* Guided Setup Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        health={health}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={(ws) => setCurrentWorkspace(ws)}
        onStartAudit={handleStartInvestigation}
        onRefreshWorkspaces={initApp}
      />
    </div>
  );
};
