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
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

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

  const [selectedFindingForFix, setSelectedFindingForFix] = useState<Finding | null>(null);
  const [policyNotification, setPolicyNotification] = useState<any | null>(null);
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
        // Automatically register SentinelOS Security Lab demo workspace if empty
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
      setPolicyNotification(res);
      refreshData();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      await refreshData();
      alert('SentinelOS Security Lab files and database reset to initial vulnerable state.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectFindingForFix = (finding: Finding) => {
    setSelectedFindingForFix(finding);
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
    <div className="flex flex-col h-screen w-screen bg-[#080c14] text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={(ws) => setCurrentWorkspace(ws)}
        onStartInvestigation={handleStartInvestigation}
        onTriggerPolicyBlock={handleTriggerPolicyBlock}
        onResetDemo={handleResetDemo}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        isInvestigating={isInvestigating}
      />

      {/* Main Frame */}
      <div className="flex flex-1 overflow-hidden">
        {/* Simplified Left Sidebar (6 items) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          unresolvedCount={findings.filter((f) => f.verification_status !== 'verified_fixed').length}
          blockedCount={shieldStatus?.metrics?.blocked_actions || 0}
          isInvestigating={isInvestigating}
        />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#080c14]">
          {/* Policy Notification Toast */}
          {policyNotification && (
            <div className="mb-6 p-4 rounded-xl border border-rose-600 bg-rose-950/80 text-rose-200 flex items-start justify-between animate-fadeIn shadow-lg glow-red">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
                    Host Protection Triggered: {policyNotification.scenario}
                  </div>
                  <p className="text-xs mt-1 text-slate-200 font-sans">
                    {policyNotification.reason}
                  </p>
                  <div className="mt-1 text-[11px] font-mono text-rose-400">
                    Decision: <strong>{policyNotification.decision}</strong> • Target: {policyNotification.target}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPolicyNotification(null)}
                className="text-rose-400 hover:text-rose-200 text-sm ml-4 font-bold"
              >
                &times;
              </button>
            </div>
          )}

          {/* 1. Overview Page */}
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
              onTriggerPolicyBlock={handleTriggerPolicyBlock}
              onResetDemo={handleResetDemo}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onNavigateToTab={handleNavigateWithSubTab}
              onSelectFindingForFix={handleSelectFindingForFix}
            />
          )}

          {/* 2. Projects Hub (consolidating Workspaces, Protection, Attack Paths, Fix & Verify) */}
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

          {/* 3. Investigations Center */}
          {currentTab === 'investigations' && (
            <InvestigationCenter
              currentInvestigation={currentInvestigation}
              onRefresh={refreshData}
              onStartNew={handleStartInvestigation}
            />
          )}

          {/* 4. Findings Center */}
          {currentTab === 'findings' && (
            <Findings
              findings={findings}
              onSelectFindingForFix={handleSelectFindingForFix}
            />
          )}

          {/* 5. Activity & Audit Feed */}
          {currentTab === 'activity' && (
            <ActivityAudit auditEvents={auditEvents} />
          )}

          {/* 6. Settings */}
          {currentTab === 'settings' && (
            <Settings health={health} />
          )}
        </main>
      </div>

      {/* 5-Step Guided Onboarding Setup Modal */}
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
