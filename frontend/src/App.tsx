import React, { useState, useEffect } from 'react';
import {
  Workspace,
  Investigation,
  Finding,
  AttackPath,
  AuditEvent,
  ShieldStatus,
  SystemHealth,
  AttackResult
} from './types';
import { api } from './api/client';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { OnboardingModal } from './components/OnboardingModal';
import { Overview } from './pages/Overview';
import { InvestigationCenter, InvestigationSubTab } from './pages/InvestigationCenter';
import { Findings } from './pages/Findings';
import { AttackLab } from './pages/AttackLab';
import { Settings } from './pages/Settings';
import { ShieldAlert, X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [investigationSubTab, setInvestigationSubTab] = useState<InvestigationSubTab>('timeline');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [attackPaths, setAttackPaths] = useState<AttackPath[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [shieldStatus, setShieldStatus] = useState<ShieldStatus | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [attackResults, setAttackResults] = useState<AttackResult[]>([]);
  const [dockerAvailable, setDockerAvailable] = useState<boolean | null>(null);

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
      try { setDockerAvailable((await api.attackLabStatus()).docker_available); } catch { setDockerAvailable(null); }

      const wsList = await api.listWorkspaces();
      setWorkspaces(wsList);
      if (wsList.length > 0) {
        if (!currentWorkspace || !wsList.find((w) => w.id === currentWorkspace.id)) {
          setCurrentWorkspace(wsList[0]);
        }
      } else {
        setCurrentWorkspace(null);
        setInvestigations([]);
        setFindings([]);
        setAttackPaths([]);
        setAuditEvents([]);
        setShieldStatus(null);
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
        if (payload.event_type === 'agent_fence_decision') {
          // A real AI agent (Claude Code hook) was just blocked by AgentFence
          setPolicyToast({ reason: payload.data.reason, target: payload.data.target_path, agent: 'Claude Code' });
          refreshData();
        } else if (payload.event_type === 'attack_finished') {
          refreshData();
        } else if (
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
      const [invs, fnds, paths, audits, shield, attacks] = await Promise.all([
        api.listInvestigations(currentWorkspace.id),
        api.listFindings({ workspace_id: currentWorkspace.id }),
        api.listAttackPaths(currentWorkspace.id),
        api.listAudit(currentWorkspace.id, 50),
        api.getShieldStatus(currentWorkspace.id),
        api.listAttackResults(currentWorkspace.id),
      ]);
      setInvestigations(invs);
      setFindings(fnds);
      setAttackPaths(paths);
      setAuditEvents(audits);
      setShieldStatus(shield);
      setAttackResults(attacks);
    } catch (e) {
      console.error('Failed to refresh data:', e);
    }
  };

  const handleStartInvestigation = async (goal?: string, overrideWorkspaceId?: string) => {
    let wsId = overrideWorkspaceId || currentWorkspace?.id;
    if (!wsId) {
      try {
        const setupRes = await api.setupDemo();
        const ws = await api.getWorkspace(setupRes.workspace_id);
        setCurrentWorkspace(ws);
        wsId = ws.id;
      } catch (e) {
        setIsOnboardingOpen(true);
        return;
      }
    }
    try {
      await api.startInvestigation(wsId, goal);
      setCurrentTab('investigations');
      setInvestigationSubTab('timeline');
      await refreshData();
    } catch (e) {
      console.error('Failed to start investigation:', e);
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

  const handleClearAllWorkspaces = async () => {
    try {
      await api.clearAllWorkspaces();
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setInvestigations([]);
      setFindings([]);
      setAttackPaths([]);
      setAuditEvents([]);
      setShieldStatus(null);
      setCurrentTab('overview');
    } catch (e) {
      console.error('Failed to clear workspaces:', e);
    }
  };

  const handleSelectFindingForFix = (finding: Finding) => {
    setSelectedFindingId(finding.id);
    setCurrentTab('investigations');
    setInvestigationSubTab('fix_verify');
  };

  const handleNavigateWithSubTab = (tab: NavTab, subTab?: string) => {
    setCurrentTab(tab);
    if (subTab) {
      setInvestigationSubTab(subTab as InvestigationSubTab);
    }
  };

  const currentInvestigation = investigations[0] || null;
  const isInvestigating = currentInvestigation
    ? ['running', 'planning', 'pending'].includes(currentInvestigation.status)
    : false;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A0E14] text-[#E6EBF2] overflow-hidden font-sans antialiased">
      {/* 1. Compact Header */}
      <Header
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={(ws) => setCurrentWorkspace(ws)}
        onTriggerPolicyBlock={handleTriggerPolicyBlock}
        onResetDemo={handleResetDemo}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onClearAll={handleClearAllWorkspaces}
      />

      {/* 2. Global Frame */}
      <div className="flex flex-1 overflow-hidden">
        {/* Narrow Sidebar (Exactly 4 items) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          modelLabel={health?.model_gateway?.configured ? health.model_gateway.model_name : 'Offline fallback'}
          modelConfigured={!!health?.model_gateway?.configured}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0A0E14]">
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

          {currentTab === 'investigations' && (
            <InvestigationCenter
              currentInvestigation={currentInvestigation}
              investigations={investigations}
              findings={findings}
              attackPaths={attackPaths}
              auditEvents={auditEvents}
              currentWorkspace={currentWorkspace}
              onRefresh={refreshData}
              onStartNew={handleStartInvestigation}
              initialSubTab={investigationSubTab}
              selectedFindingId={selectedFindingId}
              onTriggerPolicyBlock={handleTriggerPolicyBlock}
              health={health}
              shieldStatus={shieldStatus}
            />
          )}

          {currentTab === 'attacklab' && (
            <AttackLab
              currentWorkspace={currentWorkspace}
              findings={findings}
              attackResults={attackResults}
              dockerAvailable={dockerAvailable}
              onRefresh={refreshData}
            />
          )}

          {currentTab === 'findings' && (
            <Findings
              findings={findings}
              onSelectFindingForFix={handleSelectFindingForFix}
            />
          )}

          {currentTab === 'settings' && (
            <Settings health={health} />
          )}
        </main>
      </div>

      {/* Temporary Toast Notification for Policy Denial Events */}
      {policyToast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl border border-rose-500/30 bg-[#141A24] shadow-2xl text-[#E6EBF2] max-w-sm space-y-2 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-semibold text-rose-300">
                {policyToast.agent ? `${policyToast.agent} blocked by AgentFence` : 'Action Blocked: Policy Denial'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPolicyToast(null)}
              className="text-[#8A97AC] hover:text-[#E6EBF2] p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#8A97AC] leading-relaxed">
            {policyToast.reason}
          </p>
          <div className="text-[11px] text-[#3B82F6] font-mono truncate bg-[#0A0E14] p-1.5 rounded border border-[#232B38]">
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
