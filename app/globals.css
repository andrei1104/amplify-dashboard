@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import "tailwindcss";

/* ============================================================
   AMPLIFY DASHBOARD — Design System Premium
   Dark Mode + Glassmorphism
   ============================================================ */

/* ─── Design Tokens ─────────────────────────────────────── */
:root {
  --bg-page:          #07071a;
  --bg-surface:       #0e0e2a;

  /* Glassmorphism */
  --glass-bg:         rgba(255, 255, 255, 0.04);
  --glass-bg-hover:   rgba(255, 255, 255, 0.07);
  --glass-border:     rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.18);
  --glass-blur:       20px;
  --glass-shadow:     0 8px 32px rgba(0, 0, 0, 0.45);

  /* Acentos */
  --accent-purple:    #7c3aed;
  --accent-blue:      #3b82f6;
  --accent-violet:    #a78bfa;
  --accent-cyan:      #22d3ee;
  --accent-green:     #10b981;
  --accent-yellow:    #f59e0b;
  --accent-red:       #ef4444;
  --accent-pink:      #ec4899;

  --gradient-primary: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%);
  --gradient-success: linear-gradient(135deg, #10b981 0%, #22d3ee 100%);
  --gradient-warm:    linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);

  /* Texto */
  --text-primary:   #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted:     #475569;

  /* Bordas */
  --radius-sm:  6px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-full: 9999px;

  /* Transições */
  --t-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
  --t-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --t-slow:   500ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ─── Reset base ────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: var(--bg-page);
  background-image:
    radial-gradient(ellipse 80% 50% at 50% -5%,  rgba(124, 58, 237, 0.18) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 85% 80%,  rgba(59, 130, 246, 0.1)  0%, transparent 60%);
  background-attachment: fixed;
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ─── Glassmorphism Card base ───────────────────────────── */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  transition: transform var(--t-normal), box-shadow var(--t-normal), border-color var(--t-normal), background var(--t-normal);
  position: relative;
  overflow: hidden;
}

.glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.035) 0%, transparent 55%);
  pointer-events: none;
}

.glass-panel:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow), 0 0 0 1px rgba(124, 58, 237, 0.12);
}

/* ─── KPI Card ──────────────────────────────────────────── */
.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  cursor: default;
}

.kpi-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.kpi-icon--purple { background: rgba(124,58,237,0.2);  box-shadow: 0 0 18px rgba(124,58,237,0.35);  }
.kpi-icon--blue   { background: rgba(59,130,246,0.2);  box-shadow: 0 0 18px rgba(59,130,246,0.35);  }
.kpi-icon--green  { background: rgba(16,185,129,0.2);  box-shadow: 0 0 18px rgba(16,185,129,0.35);  }
.kpi-icon--yellow { background: rgba(245,158,11,0.2);  box-shadow: 0 0 18px rgba(245,158,11,0.35);  }
.kpi-icon--cyan   { background: rgba(34,211,238,0.2);  box-shadow: 0 0 18px rgba(34,211,238,0.35);  }
.kpi-icon--pink   { background: rgba(236,72,153,0.2);  box-shadow: 0 0 18px rgba(236,72,153,0.35);  }

.kpi-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
  position: relative;
  z-index: 1;
}

.kpi-value {
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  margin-bottom: 0.4rem;
  position: relative;
  z-index: 1;
}

.kpi-value--purple { background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.kpi-value--blue   { color: #60a5fa; }
.kpi-value--green  { background: var(--gradient-success); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.kpi-value--yellow { color: #fbbf24; }
.kpi-value--cyan   { color: var(--accent-cyan); }
.kpi-value--white  { color: var(--text-primary); }
.kpi-value--pink   { color: #f472b6; }

.kpi-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  position: relative;
  z-index: 1;
}

.kpi-glow {
  position: absolute;
  bottom: -24px;
  right: -24px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  opacity: 0.07;
  filter: blur(35px);
  pointer-events: none;
}

.kpi-glow--purple { background: var(--accent-purple); }
.kpi-glow--blue   { background: var(--accent-blue); }
.kpi-glow--green  { background: var(--accent-green); }
.kpi-glow--yellow { background: var(--accent-yellow); }
.kpi-glow--cyan   { background: var(--accent-cyan); }
.kpi-glow--pink   { background: var(--accent-pink); }

/* ─── Funnel ────────────────────────────────────────────── */
.funnel-stage {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.funnel-stage__label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 170px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.funnel-stage__track {
  flex: 1;
  height: 7px;
  background: rgba(255,255,255,0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.funnel-stage__bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--t-slow);
  min-width: 2px;
}

.funnel-stage__count {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 28px;
  text-align: right;
}

.funnel-stage__pct {
  font-size: 0.7rem;
  color: var(--text-muted);
  min-width: 36px;
  text-align: right;
}

/* Bar colors por fase */
.bar--em-progresso      { background: linear-gradient(90deg, #3b82f6, #6366f1); }
.bar--qualificado       { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.bar--enviar-convite    { background: linear-gradient(90deg, #22d3ee, #3b82f6); }
.bar--convite-enviado   { background: linear-gradient(90deg, #a78bfa, #22d3ee); }
.bar--convite-aceito    { background: linear-gradient(90deg, #10b981, #22d3ee); }
.bar--agenciado         { background: linear-gradient(90deg, #059669, #10b981); box-shadow: 0 0 8px rgba(16,185,129,0.4); }
.bar--nao-respondeu     { background: rgba(255,255,255,0.15); }
.bar--baixo-seg         { background: linear-gradient(90deg, #ef4444, #f59e0b); }
.bar--sem-interesse     { background: linear-gradient(90deg, #ef4444, #dc2626); }
.bar--ja-tem-agencia    { background: linear-gradient(90deg, #f97316, #ef4444); }

/* Divider entre seções do funil */
.funnel-divider {
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 0.5rem 0;
}

.funnel-section-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

/* ─── SDR Table ─────────────────────────────────────────── */
.sdr-table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-lg);
}

.sdr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.sdr-table th {
  padding: 0.65rem 1rem;
  text-align: left;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--glass-border);
  white-space: nowrap;
}

.sdr-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: var(--text-secondary);
  transition: color var(--t-fast);
}

.sdr-table tr:last-child td { border-bottom: none; }

.sdr-table tbody tr { transition: background var(--t-fast); }
.sdr-table tbody tr:hover td {
  background: rgba(255,255,255,0.02);
  color: var(--text-primary);
}

.sdr-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.sdr-avatar--andrei  { background: linear-gradient(135deg, #7c3aed, #3b82f6); color: #fff; }
.sdr-avatar--nicole  { background: linear-gradient(135deg, #ec4899, #f97316); color: #fff; }
.sdr-avatar--bruno   { background: linear-gradient(135deg, #10b981, #22d3ee); color: #fff; }
.sdr-avatar--default { background: linear-gradient(135deg, #475569, #64748b); color: #fff; }
.sdr-avatar--ai      {
  background: linear-gradient(135deg, #4c1d95, #7c3aed);
  color: #fff;
  box-shadow: 0 0 10px rgba(124,58,237,0.5);
  animation: ai-pulse 3s ease-in-out infinite;
}
@keyframes ai-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(124,58,237,0.4); }
  50%       { box-shadow: 0 0 16px rgba(124,58,237,0.8); }
}

/* Card da IA — borda roxa pulsante */
.glass-panel--ai {
  border-color: rgba(124,58,237,0.25) !important;
  background: rgba(124,58,237,0.05) !important;
}
.glass-panel--ai:hover {
  border-color: rgba(124,58,237,0.45) !important;
}

/* Badge IA */
.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 2px 8px;
  background: rgba(124,58,237,0.18);
  border: 1px solid rgba(124,58,237,0.35);
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: 700;
  color: #a78bfa;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.conv-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.conv-badge--high { background: rgba(16,185,129,0.15); color: #34d399; }
.conv-badge--mid  { background: rgba(245,158,11,0.15);  color: #fbbf24; }
.conv-badge--low  { background: rgba(239,68,68,0.15);   color: #f87171; }
.conv-badge--zero { background: rgba(255,255,255,0.06); color: var(--text-muted); }

.mini-track {
  width: 72px;
  height: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-top: 4px;
}

.mini-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  transition: width var(--t-slow);
}

/* ─── Seção global ──────────────────────────────────────── */
.section-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--glass-border);
}

/* ─── Dashboard header ──────────────────────────────────── */
.dash-title {
  font-size: clamp(1.7rem, 4vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.1;
}

/* ─── Date input premium ────────────────────────────────── */
.date-input {
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color var(--t-fast), color var(--t-fast);
  cursor: pointer;
}

.date-input:focus,
.date-input:hover {
  border-color: rgba(124,58,237,0.5);
  color: var(--text-primary);
}

.date-input::-webkit-calendar-picker-indicator {
  filter: invert(0.5);
  cursor: pointer;
}

/* ─── Refresh button ────────────────────────────────────── */
.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.25);
  border-radius: var(--radius-full);
  color: #60a5fa;
  font-size: 0.8rem;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--t-normal);
}

.refresh-btn:hover {
  background: rgba(59,130,246,0.2);
  border-color: rgba(59,130,246,0.5);
  color: #93c5fd;
}

.refresh-btn.spinning svg,
.refresh-btn.spinning .spin-icon {
  animation: spin 0.8s linear infinite;
}

/* ─── Status dot ────────────────────────────────────────── */
.live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-green);
  box-shadow: 0 0 8px var(--accent-green);
  animation: pulse-dot 2.2s infinite;
}

@keyframes pulse-dot {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.8); }
}

/* ─── Loading / Error ───────────────────────────────────── */
.loading-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(124,58,237,0.15);
  border-top-color: var(--accent-purple);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ─── Animations ────────────────────────────────────────── */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeInUp 0.45s ease-out forwards;
}

.animate-fade-in-delay {
  animation: fadeInUp 0.45s ease-out 0.1s both;
}

/* ─── Progress Bars (legado / compatibilidade) ──────────── */
.progress-bar-container {
  width: 100%;
  height: 7px;
  background: rgba(255,255,255,0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--t-slow);
}

/* ─── Status Badges (legado / compatibilidade) ──────────── */
.status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  display: inline-block;
  background: rgba(255,255,255,0.08);
  color: var(--text-secondary);
}

.status-badge.agenciado  { background: rgba(16,185,129,0.18); color: #34d399; }
.status-badge.progresso  { background: rgba(59,130,246,0.18); color: #60a5fa; }
.status-badge.qualificado{ background: rgba(167,139,250,0.18);color: #c4b5fd; }
.status-badge.convite    { background: rgba(245,158,11,0.18); color: #fbbf24; }
.status-badge.rejeitado  { background: rgba(239,68,68,0.18);  color: #f87171; }

/* ─── Scrollbar ─────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

::selection { background: rgba(124,58,237,0.3); color: var(--text-primary); }

/* ─── Navigation Tabs ───────────────────────────────────── */
.dash-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  width: fit-content;
  margin-bottom: 2rem;
}

.dash-nav__link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1.1rem;
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  transition: all var(--t-normal);
  white-space: nowrap;
}

.dash-nav__link:hover {
  color: var(--text-secondary);
  background: rgba(255,255,255,0.05);
}

.dash-nav__link--active {
  background: var(--gradient-primary);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 12px rgba(124,58,237,0.35);
}

.dash-nav__link--active:hover {
  color: #fff;
  background: var(--gradient-primary);
}

/* ─── Origin Filter ─────────────────────────────────────── */
.origin-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.origin-filter__label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

.origin-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--glass-border);
  background: rgba(255,255,255,0.04);
  color: var(--text-muted);
  transition: all var(--t-fast);
  user-select: none;
}

.origin-chip:hover {
  background: rgba(255,255,255,0.08);
  color: var(--text-secondary);
  border-color: rgba(255,255,255,0.15);
}

.origin-chip--active {
  background: rgba(124,58,237,0.2);
  border-color: rgba(124,58,237,0.5);
  color: var(--accent-violet);
}

.origin-chip--active:hover {
  background: rgba(124,58,237,0.28);
}

.origin-chip__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ─── View Toggle ───────────────────────────────────────── */
.view-toggle {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}

.view-toggle__btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all var(--t-fast);
  white-space: nowrap;
}

.view-toggle__btn:hover { color: var(--text-secondary); background: rgba(255,255,255,0.05); }

.view-toggle__btn--active {
  background: rgba(124,58,237,0.25);
  color: var(--accent-violet);
  font-weight: 600;
}

/* ─── Funnel Shape (visual) ─────────────────────────────── */
.funnel-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 0.5rem 1rem;
  width: 100%;
}

.funnel-visual__stage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  height: 46px;
  transition: all var(--t-normal);
  border-radius: 4px;
  cursor: default;
}

.funnel-visual__stage:hover {
  filter: brightness(1.15);
  transform: scaleY(1.03);
}

.funnel-visual__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 1rem;
  gap: 0.5rem;
}

.funnel-visual__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.funnel-visual__count {
  font-size: 1rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
}

.funnel-visual__pct {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.65);
  min-width: 32px;
  text-align: right;
}

.funnel-visual__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-size: 0.65rem;
  color: var(--accent-violet);
  font-weight: 600;
  height: 16px;
  margin: 0 auto;
}

.funnel-visual__divider {
  width: 100%;
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 6px 0 2px;
}

/* Cores das etapas do funil visual */
.fv--em-progresso      { background: linear-gradient(90deg, #1d4ed8cc, #4f46e5cc); }
.fv--qualificado       { background: linear-gradient(90deg, #5b21b6cc, #7c3aedcc); }
.fv--enviar-convite    { background: linear-gradient(90deg, #0e7490cc, #0891b2cc); }
.fv--convite-enviado   { background: linear-gradient(90deg, #6d28d9cc, #7c3aedcc); }
.fv--convite-aceito    { background: linear-gradient(90deg, #065f46cc, #059669cc); }
.fv--agenciado         { background: linear-gradient(90deg, #065f46, #10b981); box-shadow: 0 0 16px rgba(16,185,129,0.3); }
.fv--perda             { background: linear-gradient(90deg, #7f1d1dcc, #b91c1ccc); }

/* ─── Period badge ──────────────────────────────────────── */
.period-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  background: rgba(124,58,237,0.12);
  border: 1px solid rgba(124,58,237,0.25);
  border-radius: var(--radius-full);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--accent-violet);
  white-space: nowrap;
}

/* ─── Custos / Financeiro ────────────────────────────────── */

/* Tela de senha */
.auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  gap: 1.5rem;
}

.auth-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  backdrop-filter: blur(20px);
}

.auth-icon {
  width: 56px;
  height: 56px;
  background: rgba(124,58,237,0.15);
  border: 1px solid rgba(124,58,237,0.3);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: 0 0 24px rgba(124,58,237,0.2);
}

.auth-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  text-align: center;
}

.auth-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  color: var(--text-primary);
  outline: none;
  text-align: center;
  letter-spacing: 0.08em;
  transition: border-color var(--t-fast);
}

.auth-input:focus {
  border-color: rgba(124,58,237,0.55);
}

.auth-input--error {
  border-color: rgba(239,68,68,0.5);
  animation: shake 0.35s ease;
}

@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%,60%  { transform: translateX(-6px); }
  40%,80%  { transform: translateX(6px); }
}

.auth-btn {
  width: 100%;
  padding: 0.7rem;
  background: var(--gradient-primary);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: opacity var(--t-fast), transform var(--t-fast);
}

.auth-btn:hover  { opacity: 0.9; transform: translateY(-1px); }
.auth-btn:active { transform: translateY(0); }

.auth-error {
  font-size: 0.78rem;
  color: #f87171;
  text-align: center;
}

/* Breakdown bar */
.cost-bar {
  display: flex;
  height: 36px;
  border-radius: var(--radius-md);
  overflow: hidden;
  width: 100%;
  gap: 2px;
}

.cost-bar__segment {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  overflow: hidden;
  white-space: nowrap;
  transition: flex var(--t-slow);
  cursor: default;
  position: relative;
}

.cost-bar__segment:first-child { border-radius: var(--radius-md) 0 0 var(--radius-md); }
.cost-bar__segment:last-child  { border-radius: 0 var(--radius-md) var(--radius-md) 0; }
.cost-bar__segment:only-child  { border-radius: var(--radius-md); }

.cost-bar__segment:hover { filter: brightness(1.15); }

/* Legenda de custos */
.cost-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
}

.cost-legend__item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.cost-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* Custo por lead highlight */
.cpl-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1.25rem;
}

.cpl-value {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  background: linear-gradient(135deg, #10b981, #22d3ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

/* Tabela de gastos */
.gastos-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.gastos-table th {
  padding: 0.55rem 0.85rem;
  text-align: left;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--glass-border);
  white-space: nowrap;
}
.gastos-table td {
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: var(--text-secondary);
}
.gastos-table tr:last-child td { border-bottom: none; }
.gastos-table tbody tr:hover td { background: rgba(255,255,255,0.02); color: var(--text-primary); }

/* Tipo/Provedor badge colors */
.tipo-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 600;
}

.tipo-badge--salario  { background: rgba(59,130,246,0.15);  color: #60a5fa; }
.tipo-badge--software { background: rgba(139,92,246,0.15);  color: #c4b5fd; }
.tipo-badge--infra    { background: rgba(245,158,11,0.15);  color: #fbbf24; }
.tipo-badge--outro    { background: rgba(100,116,139,0.15); color: #94a3b8; }

/* Status pagamento */
.status-pagamento {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  font-size: 0.68rem;
  font-weight: 600;
}
.status-pagamento--paid   { background: rgba(16,185,129,0.15); color: #34d399; }
.status-pagamento--open   { background: rgba(245,158,11,0.15);  color: #fbbf24; }
.status-pagamento--void   { background: rgba(100,116,139,0.1); color: var(--text-muted); }
