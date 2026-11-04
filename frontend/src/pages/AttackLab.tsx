import React, { useEffect, useMemo, useState } from 'react';
import { Workspace, Finding, AttackResult } from '../types';
import { api } from '../api/client';
import {
  Swords, ShieldCheck, ShieldAlert, Loader2, Play, FileDown,
  GitCommit, Bot, AlertCircle, CircleCheck,
} from 'lucide-react';

interface Props {
  currentWorkspace: Workspace | null;
  findings: Finding[];
  attackResults: AttackResult[];
  dockerAvailable: boolean | null;
  onRefresh: () => void;
}

interface LiveStep { key: string; text: string; tone: 'info' | 'bad' | 'good'; }

export const AttackLab: React.FC<Props> = ({ currentWorkspace, findings, attackResults, dockerAvailable, onRefresh }) => {
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<LiveStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Live progress from the global SSE stream App already owns; we also listen here for attack_* events
  useEffect(() => {
    const es = new EventSource('/api/investigations/events/live');
    es.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data);
        const t = p.event_type as string;
        if (!t?.startsWith('attack') && !t?.startsWith('sandbox') && !t?.startsWith('app_') && !t?.startsWith('routes') && !t?.startsWith('fix')) return;
        const d = p.data || {};
        const push = (text: string, tone: LiveStep['tone'] = 'info') =>
          setLive((prev) => [...prev, { key: `${t}-${Date.now()}-${Math.random()}`, text, tone }]);

        if (t === 'attack_started') { setLive([]); push(`Loaded ${d.findings} findings. Preparing sandbox…`); }
        else if (t === 'app_detected') push(`Detected ${d.framework} app (${d.entry}).`);
        else if (t === 'sandbox_up') push(d.phase === 'post_fix' ? 'Sandbox rebuilt with fixes applied.' : 'Sandbox is up. App is running in an isolated container.', 'good');
        else if (t === 'sandbox_rebuilding') push('Applying fixes and rebuilding the sandbox…');
        else if (t === 'routes_discovered') push(`Discovered ${d.count} live routes.`);
        else if (t === 'attacks_planned') push(`Planned ${d.count} exploit(s) (${d.by}).`);
        else if (t === 'attack_result') push(`[${d.phase === 'post_fix' ? 'after fix' : 'attack'}] ${d.name}: ${d.verdict} — ${d.reason}`, d.verdict === 'BREACHED' ? 'bad' : d.verdict === 'SURVIVED' ? 'good' : 'info');
        else if (t === 'fix_applied_sandbox') push(`Fix applied in sandbox: ${d.name} (${d.by}).`);
        else if (t === 'fix_skipped') push(`No safe auto-fix for ${d.name}: ${d.reason}`);
        else if (t === 'attack_finished') { push(`Done. ${d.breached} breached, ${d.fixed_and_closed} fixed & proven shut, ${d.still_breached} still open.`, d.still_breached ? 'bad' : 'good'); setRunning(false); onRefresh(); }
        else if (t === 'attack_failed') { push(`Failed: ${d.error}`, 'bad'); setError(d.error); setRunning(false); }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [onRefresh]);

  const launch = async () => {
    if (!currentWorkspace) return;
    setError(null);
    setLive([]);
    setRunning(true);
    try {
      await api.runAttackLab(currentWorkspace.id);
    } catch (e: any) {
      setError(e.message);
      setRunning(false);
    }
  };

  // Group results: one row per exploit, pairing pre_fix and post_fix
  const rows = useMemo(() => {
    const byName: Record<string, { pre?: AttackResult; post?: AttackResult }> = {};
    for (const r of attackResults) {
      byName[r.exploit_name] = byName[r.exploit_name] || {};
      if (r.phase === 'post_fix') byName[r.exploit_name].post = r;
      else byName[r.exploit_name].pre = r;
    }
    return Object.entries(byName).map(([name, v]) => ({ name, ...v }));
  }, [attackResults]);

  const findingFor = (id?: string | null) => findings.find((f) => f.id === id) || null;

  const score = useMemo(() => {
    const pre = attackResults.filter((r) => r.phase === 'pre_fix');
    const breached = pre.filter((r) => r.verdict === 'BREACHED');
    const closed = breached.filter((b) => attackResults.find((r) => r.phase === 'post_fix' && r.exploit_name === b.exploit_name && r.verdict === 'SURVIVED'));
    const aiCount = breached.filter((b) => findingFor(b.finding_id)?.origin_ai_authored).length;
    return { attempted: pre.length, breached: breached.length, closed: closed.length, still: breached.length - closed.length, ai: aiCount };
  }, [attackResults, findings]);

  if (!currentWorkspace) {
    return <div className="p-12 text-center text-sm text-[#8A97AC]">Connect a project first, then run a scan, then attack it here.</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#E6EBF2] flex items-center gap-2">
            <Swords className="w-4 h-4 text-[#3B82F6]" /> Attack Lab
          </h2>
          <p className="text-xs text-[#8A97AC] mt-0.5 max-w-2xl">
            SentinelOS boots a disposable copy of this app in an isolated Docker sandbox, actually exploits each finding,
            shows which commit opened the door, fixes it, then attacks again to prove the door is shut. Your real files are never touched.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {attackResults.length > 0 && (
            <a
              href={api.attackReportUrl(currentWorkspace.id)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-[#232B38] bg-[#0A0E14] text-[#8A97AC] hover:text-[#E6EBF2] text-xs font-medium flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" /> Report
            </a>
          )}
          <button
            type="button"
            onClick={launch}
            disabled={running || dockerAvailable === false}
            className="px-4 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2F6FE0] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {running ? 'Attacking…' : 'Launch Attack'}
          </button>
        </div>
      </div>

      {dockerAvailable === false && (
        <div className="p-3 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> Docker is not running. Start Docker Desktop to enable the sandbox.
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Scorecard */}
      {attackResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Tile n={score.attempted} label="Attempted" />
          <Tile n={score.breached} label="Breached" color="#EF4444" />
          <Tile n={score.closed} label="Fixed & shut" color="#10B981" />
          <Tile n={score.still} label="Still open" color={score.still ? '#EF4444' : '#10B981'} />
          <Tile n={score.ai} label="From AI commits" color="#60A5FA" />
        </div>
      )}

      {/* Live progress */}
      {(running || live.length > 0) && (
        <div className="p-4 rounded-xl border border-[#232B38] bg-[#0A0E14] space-y-1.5 font-mono text-[11px] max-h-56 overflow-y-auto">
          {live.map((s) => (
            <div key={s.key} className={s.tone === 'bad' ? 'text-rose-300' : s.tone === 'good' ? 'text-[#10B981]' : 'text-[#8A97AC]'}>
              <span className="text-[#55627A]">›</span> {s.text}
            </div>
          ))}
          {running && <div className="text-[#3B82F6] flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> working…</div>}
        </div>
      )}

      {/* Results: breach -> fix -> re-attack per exploit */}
      {rows.map((row) => {
        const f = findingFor(row.pre?.finding_id);
        return (
          <div key={row.name} className="rounded-xl border border-[#232B38] bg-[#141A24] shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#232B38]/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {f && <span className={`sev text-[10px] font-bold px-1.5 py-0.5 rounded ${sevClass(f.severity)}`}>{f.severity}</span>}
                <span className="text-sm font-semibold text-[#E6EBF2]">{f ? f.title : row.name}</span>
              </div>
              <span className="text-[11px] font-mono text-[#8A97AC]">{row.name}</span>
            </div>

            {f?.origin_commit && (
              <div className="px-4 py-2 text-[11px] text-[#CBD5E6] flex items-center gap-2 flex-wrap bg-[#0A0E14]/40">
                <GitCommit className="w-3.5 h-3.5 text-[#8A97AC]" />
                <span>Introduced in <code className="text-[#3B82F6]">{f.origin_commit.slice(0, 8)}</code> by {f.origin_author} on {f.origin_date}</span>
                {f.origin_subject && <span className="text-[#8A97AC]">— "{f.origin_subject}"</span>}
                {f.origin_ai_authored && (
                  <span className="px-1.5 py-0.5 rounded bg-[#1A212B] text-[#60A5FA] border border-[#60A5FA]/30 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> AI-authored{f.origin_ai_agent ? ` · ${f.origin_ai_agent}` : ''}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#232B38]/40">
              {row.pre && <Phase title="Attack" r={row.pre} />}
              {row.post ? <Phase title="After fix" r={row.post} /> : (
                <div className="p-4 bg-[#141A24] text-[11px] text-[#8A97AC] flex items-center">
                  {row.pre?.verdict === 'BREACHED' ? 'No automatic fix was applied for this one.' : 'No fix needed.'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {attackResults.length === 0 && !running && (
        <div className="p-12 text-center text-xs text-[#8A97AC] rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
          No attacks run yet. Click <b className="text-[#E6EBF2]">Launch Attack</b> to exploit this project's findings in the sandbox.
        </div>
      )}
    </div>
  );
};

const Tile: React.FC<{ n: number; label: string; color?: string }> = ({ n, label, color }) => (
  <div className="p-3 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
    <div className="text-2xl font-bold" style={{ color: color || '#E6EBF2' }}>{n}</div>
    <div className="text-[10px] uppercase tracking-wide text-[#8A97AC]">{label}</div>
  </div>
);

const Phase: React.FC<{ title: string; r: AttackResult }> = ({ title, r }) => (
  <div className="p-4 bg-[#141A24] space-y-2">
    <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EBF2]">
      {title}
      {verdictChip(r.verdict)}
    </div>
    <div className="text-[11px] text-[#8A97AC] break-words"><b className="text-[#CBD5E6]">request</b> <code className="text-[#3B82F6] font-mono">{r.request_detail}</code></div>
    <div className="text-[11px] text-[#8A97AC] break-words"><b className="text-[#CBD5E6]">response</b> <code className="text-[#3B82F6] font-mono">{r.response_detail}</code></div>
    <div className="text-[11px] text-[#E6EBF2]">{r.reason}</div>
  </div>
);

function verdictChip(v: string) {
  if (v === 'BREACHED') return <span className="chip text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />BREACHED</span>;
  if (v === 'SURVIVED') return <span className="chip text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center gap-1"><ShieldCheck className="w-3 h-3" />SURVIVED</span>;
  return <span className="chip text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141A24] text-[#8A97AC] flex items-center gap-1"><CircleCheck className="w-3 h-3" />{v}</span>;
}

function sevClass(sev: string) {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 'bg-rose-500/15 text-rose-300';
  if (s === 'high') return 'bg-orange-500/15 text-orange-300';
  if (s === 'medium') return 'bg-amber-500/15 text-amber-300';
  return 'bg-[#141A24] text-[#8A97AC]';
}
