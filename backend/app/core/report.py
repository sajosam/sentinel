"""Self-contained HTML report for an Attack Lab run: scorecard, origin, and breach -> fix -> re-attack per finding."""
import html
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import AttackResult, Finding, Workspace


def _esc(v) -> str:
    return html.escape(str(v if v is not None else ""))


def _verdict_chip(verdict: str) -> str:
    colors = {
        "BREACHED": ("#2a0f17", "#ff6b81"),
        "SURVIVED": ("#0f241d", "#36D6B0"),
        "NOT_REACHABLE": ("#1a1f2e", "#9AA6BF"),
        "ERROR": ("#2a230f", "#f0c674"),
    }
    bg, fg = colors.get(verdict, ("#1a1f2e", "#9AA6BF"))
    return f'<span class="chip" style="background:{bg};color:{fg}">{_esc(verdict)}</span>'


def build_report(db: Session, workspace_id: str, investigation_id: Optional[str] = None) -> str:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    ws_name = workspace.display_name if workspace else workspace_id

    rq = db.query(AttackResult).filter(AttackResult.workspace_id == workspace_id)
    if investigation_id:
        rq = rq.filter(AttackResult.investigation_id == investigation_id)
    results: List[AttackResult] = rq.order_by(AttackResult.created_at.asc()).all()

    pre = [r for r in results if r.phase == "pre_fix"]
    post_by_name: Dict[str, AttackResult] = {r.exploit_name: r for r in results if r.phase == "post_fix"}

    breached = sum(1 for r in pre if r.verdict == "BREACHED")
    closed = sum(1 for r in pre if r.verdict == "BREACHED"
                 and post_by_name.get(r.exploit_name) and post_by_name[r.exploit_name].verdict == "SURVIVED")
    still = breached - closed

    findings = {f.id: f for f in db.query(Finding).filter(Finding.workspace_id == workspace_id).all()}
    ai_origin = sum(1 for r in pre if r.finding_id and findings.get(r.finding_id) and findings[r.finding_id].origin_ai_authored)

    cards = []
    for r in pre:
        f: Optional[Finding] = findings.get(r.finding_id) if r.finding_id else None
        post = post_by_name.get(r.exploit_name)
        origin_html = ""
        if f and f.origin_commit:
            ai = ('<span class="chip" style="background:#241a2e;color:#c08bff">AI-AUTHORED'
                  f' · {_esc(f.origin_ai_agent)}</span>') if f.origin_ai_authored else ""
            origin_html = (
                f'<div class="origin">Introduced in <code>{_esc(f.origin_commit[:8])}</code> '
                f'by {_esc(f.origin_author)} on {_esc(f.origin_date)} — "{_esc(f.origin_subject)}" {ai}</div>'
            )
        post_block = ""
        if post:
            post_block = f"""
            <div class="phase">
              <div class="phase-head">After fix &nbsp; {_verdict_chip(post.verdict)}</div>
              <div class="ev"><b>request</b> <code>{_esc(post.request_detail)}</code></div>
              <div class="ev"><b>response</b> <code>{_esc(post.response_detail)}</code></div>
              <div class="why">{_esc(post.reason)}</div>
            </div>"""
        title = _esc(f.title if f else r.exploit_name)
        sev = _esc(f.severity if f else "")
        cards.append(f"""
        <div class="card">
          <div class="card-top">
            <div><span class="sev sev-{sev.lower()}">{sev}</span> <span class="title">{title}</span></div>
            <div class="exploit">{_esc(r.exploit_name)}</div>
          </div>
          {origin_html}
          <div class="phases">
            <div class="phase">
              <div class="phase-head">Attack &nbsp; {_verdict_chip(r.verdict)}</div>
              <div class="ev"><b>request</b> <code>{_esc(r.request_detail)}</code></div>
              <div class="ev"><b>response</b> <code>{_esc(r.response_detail)}</code></div>
              <div class="why">{_esc(r.reason)}</div>
            </div>
            {post_block}
          </div>
        </div>""")

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SentinelOS Attack Report — {_esc(ws_name)}</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin:0; background:#0B1020; color:#E8ECF5; font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif; }}
  .wrap {{ max-width:900px; margin:0 auto; padding:28px 16px 60px; }}
  h1 {{ font-size:20px; margin:0 0 2px; }}
  .sub {{ color:#9AA6BF; font-size:12px; margin-bottom:20px; }}
  .score {{ display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px; }}
  .tile {{ flex:1; min-width:130px; background:#141B2D; border:1px solid #283149; border-radius:12px; padding:14px; }}
  .tile .n {{ font-size:26px; font-weight:700; }}
  .tile .l {{ color:#9AA6BF; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }}
  .card {{ background:#141B2D; border:1px solid #283149; border-radius:12px; padding:16px; margin-bottom:14px; }}
  .card-top {{ display:flex; justify-content:space-between; gap:10px; align-items:baseline; flex-wrap:wrap; }}
  .title {{ font-weight:600; }}
  .exploit {{ color:#9AA6BF; font-size:12px; font-family:ui-monospace,Menlo,monospace; }}
  .sev {{ font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; }}
  .sev-critical {{ background:#2a0f17; color:#ff6b81; }} .sev-high {{ background:#2a1a0f; color:#ffa657; }}
  .sev-medium {{ background:#2a260f; color:#f0c674; }} .sev-low,.sev- {{ background:#1a1f2e; color:#9AA6BF; }}
  .origin {{ margin:10px 0; color:#c5ced9; font-size:12px; }}
  .phases {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px; }}
  @media (max-width:640px) {{ .phases {{ grid-template-columns:1fr; }} }}
  .phase {{ background:#0B1020; border:1px solid #283149; border-radius:10px; padding:10px; }}
  .phase-head {{ font-weight:600; margin-bottom:6px; }}
  .ev {{ font-size:11px; color:#9AA6BF; margin:4px 0; word-break:break-word; }}
  .ev code {{ color:#8B7CFF; font-family:ui-monospace,Menlo,monospace; }}
  .why {{ font-size:12px; margin-top:6px; }}
  .chip {{ font-size:10px; font-weight:700; padding:2px 7px; border-radius:20px; }}
  code {{ white-space:pre-wrap; }}
</style></head>
<body><div class="wrap">
  <h1>SentinelOS — Sandbox Attack Report</h1>
  <div class="sub">{_esc(ws_name)} · generated {generated} · exploits fired at a disposable Docker sandbox, never a live system</div>
  <div class="score">
    <div class="tile"><div class="n">{len(pre)}</div><div class="l">Exploits attempted</div></div>
    <div class="tile"><div class="n" style="color:#ff6b81">{breached}</div><div class="l">Breached before fix</div></div>
    <div class="tile"><div class="n" style="color:#36D6B0">{closed}</div><div class="l">Fixed &amp; proven shut</div></div>
    <div class="tile"><div class="n" style="color:{'#ff6b81' if still else '#36D6B0'}">{still}</div><div class="l">Still breached</div></div>
    <div class="tile"><div class="n" style="color:#c08bff">{ai_origin}</div><div class="l">From AI-authored commits</div></div>
  </div>
  {''.join(cards) if cards else '<div class="card">No attack results yet. Run the Attack Lab first.</div>'}
</div></body></html>"""
