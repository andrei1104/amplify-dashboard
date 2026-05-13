"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "@/lib/config";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ─── Metas do Plano Q2 2026 ───────────────────────────────────────────────────
// Números extraídos do "Plano Tático Q2 2026 — Aquisição" no Notion
const Q2_TARGETS = {
  "2026-04": {
    label:          "Abril 2026",
    start:          754,
    silver:         41,
    gold:           10,
    diamond:        4,
    safira:         0,
    firstDay:       "2026-04-13",   // Máquina começa 13/04 (segunda-feira)
    sniperFirstDay: "2026-04-20",   // Sniper começa 20/04 (pós feriado Tiradentes)
    cacMeta:        30.45,
  },
  "2026-05": {
    label:          "Maio 2026",
    start:          1160,
    silver:         102,
    gold:           24,
    diamond:        10,
    safira:         0,
    firstDay:       "2026-05-04",   // Pós feriado 01/05
    sniperFirstDay: "2026-05-04",
    cacMeta:        28.67,
  },
  "2026-06": {
    label:          "Junho 2026",
    start:          1218,
    silver:         107,
    gold:           26,
    diamond:        11,
    safira:         1,
    firstDay:       "2026-06-01",
    sniperFirstDay: "2026-06-01",
    cacMeta:        28.79,
  },
};

// Feriados Q2 2026
const HOLIDAYS = new Set(["2026-04-21", "2026-05-01", "2026-06-19"]);

// Comissões Sniper por tier (R$ por agenciamento confirmado)
const COMMISSION = { silver: 35, gold: 150, diamond: 280, safira: 0 };

// SDRs do time Sniper
const SNIPER_SDRS = ["Nicole Freitas", "Bruno Zardo"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getBrowserTz() {
  const off = new Date().getTimezoneOffset();
  const abs = Math.abs(off);
  return `${off <= 0 ? "+" : "-"}${String(Math.floor(abs/60)).padStart(2,"0")}:${String(abs%60).padStart(2,"0")}`;
}

function isWorkingDay(ds) {
  const d = new Date(ds + "T12:00:00");
  return d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS.has(ds);
}

function getWorkingDays(from, to) {
  const days = [];
  const cur  = new Date(from + "T12:00:00");
  const end  = new Date(to   + "T12:00:00");
  while (cur <= end) {
    const ds = toLocalDate(cur);
    if (isWorkingDay(ds)) days.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function monthEnd(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return toLocalDate(new Date(y, m, 0));
}

function fmtBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}

function statusBadge(atual, necessario) {
  if (necessario <= 0) return { icon: "✅", color: "#10b981", label: "Meta batida!",         cls: "conv-badge--high" };
  const r = atual / necessario;
  if (r >= 1)    return { icon: "✅", color: "#10b981", label: "No ritmo",            cls: "conv-badge--high" };
  if (r >= 0.85) return { icon: "⚠️", color: "#f59e0b", label: "Levemente abaixo",   cls: "conv-badge--mid"  };
  return           { icon: "🔴", color: "#ef4444", label: "Abaixo do ritmo",           cls: "conv-badge--low"  };
}

function calcWdRemaining(firstDay, today, mEnd, selectedMonth, curMonthKey) {
  if (selectedMonth > curMonthKey) return getWorkingDays(firstDay, mEnd).length;
  const tom = new Date(today + "T12:00:00");
  tom.setDate(tom.getDate() + 1);
  const tomorrowStr = toLocalDate(tom);
  const from = tomorrowStr > firstDay ? tomorrowStr : firstDay;
  if (from > mEnd) return 0;
  return getWorkingDays(from, mEnd).length;
}

// ─── Componentes atômicos ─────────────────────────────────────────────────────
function ProgressBar({ value, max, color = "#7c3aed", height = 10 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width:"100%", height, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99,
        transition:"width 0.6s ease", boxShadow:`0 0 8px ${color}66` }} />
    </div>
  );
}

function KpiMini({ label, value, sub, color = "var(--text-primary)" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
      <p style={{ fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.08em",
        color:"var(--text-muted)", fontWeight:600 }}>{label}</p>
      <p style={{ fontSize:"1.3rem", fontWeight:800, color, lineHeight:1, letterSpacing:"-0.03em" }}>{value}</p>
      {sub && <p style={{ fontSize:"0.65rem", color:"var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

// ─── Bloco 1 — Meta Start ─────────────────────────────────────────────────────
function StartBlock({ target, startCount, movingAvg, ritmoNecessario, wdRemaining, wdElapsed }) {
  const pct    = target.start > 0 ? Math.min(100, (startCount / target.start) * 100) : 0;
  const faltam = Math.max(0, target.start - startCount);
  const status = statusBadge(movingAvg, ritmoNecessario);

  return (
    <div className="glass-panel p-6">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
        <div>
          <p className="section-label" style={{ marginBottom:"2px" }}>Bloco 1 — Meta do Mês · Start</p>
          <p style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>
            Meta máquina: {target.start.toLocaleString("pt-BR")} agenciamentos
          </p>
        </div>
        <span className={`conv-badge ${status.cls}`}
          style={{ fontSize:"0.75rem", padding:"4px 12px", gap:"5px", display:"flex", alignItems:"center" }}>
          {status.icon} {status.label}
        </span>
      </div>

      {/* Barra principal */}
      <div style={{ marginBottom:"8px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
          <span style={{ fontSize:"0.8rem", color:"var(--text-secondary)", fontWeight:600 }}>
            {startCount.toLocaleString("pt-BR")} agenciados
          </span>
          <span style={{ fontSize:"0.78rem", fontWeight:800, color:"#10b981" }}>{pct.toFixed(1)}%</span>
        </div>
        <ProgressBar value={startCount} max={target.start} color="#10b981" height={14} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
          <span style={{ fontSize:"0.6rem", color:"var(--text-muted)" }}>0</span>
          <span style={{ fontSize:"0.6rem", color:"var(--text-muted)" }}>{target.start.toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"16px", marginTop:"24px",
        paddingTop:"20px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <KpiMini label="Agenciados até hoje" value={startCount.toLocaleString("pt-BR")} color="#10b981" />
        <KpiMini label="Faltam" value={faltam.toLocaleString("pt-BR")} color={faltam > 0 ? "#f59e0b" : "#10b981"} />
        <KpiMini label="Dias úteis restantes" value={wdRemaining} />
        <KpiMini label="Ritmo necessário" value={`${ritmoNecessario}/dia`} color="#a78bfa"
          sub={`${wdRemaining} du restantes`} />
        <KpiMini label="Ritmo atual (últ. 5du)" value={`${movingAvg}/dia`} color={status.color}
          sub="média móvel real" />
        <KpiMini label="Dias úteis rodando" value={wdElapsed}
          sub={`início: ${target.firstDay.slice(5).replace("-","/")} `} />
      </div>

      {/* Barra comparativa */}
      {ritmoNecessario > 0 && (
        <div style={{ marginTop:"20px", paddingTop:"16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize:"0.65rem", color:"var(--text-muted)", marginBottom:"10px",
            textTransform:"uppercase", letterSpacing:"0.08em" }}>Ritmo atual vs. necessário</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {[
              { label:`Atual: ${movingAvg}/dia`,       val:movingAvg,       color:"#10b981" },
              { label:`Necessário: ${ritmoNecessario}/dia`, val:ritmoNecessario, color:"#a78bfa" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <span style={{ fontSize:"0.65rem", color, width:"130px", flexShrink:0 }}>{label}</span>
                <div style={{ flex:1 }}>
                  <ProgressBar value={val} max={Math.max(movingAvg, ritmoNecessario) * 1.2} color={color} height={8} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metadados visuais dos SDRs Sniper ───────────────────────────────────────
const SDR_VISUAL = {
  "Nicole Freitas": { color:"#ec4899", initials:"NF" },
  "Bruno Zardo":    { color:"#10b981", initials:"BZ" },
};

// ─── Bloco 2 — Sniper ─────────────────────────────────────────────────────────
function SniperBlock({ target, sniperTotals, sniperDailyByTier, sniperWdElapsed, sniperWdRemaining, sniperBySdr, sniperDailyBySdr }) {
  const tiers = [
    { key:"silver",  label:"Silver",  gmv:"> R$5k",    color:"#94a3b8", icon:"🥈" },
    { key:"gold",    label:"Gold",    gmv:"> R$30k",   color:"#f59e0b", icon:"🥇" },
    { key:"diamond", label:"Diamond", gmv:"> R$100k",  color:"#38bdf8", icon:"💎" },
    { key:"safira",  label:"Safira",  gmv:"> R$500k",  color:"#e879f9", icon:"💠" },
  ].filter(t => target[t.key] > 0 || sniperTotals[t.key] > 0);

  const totalMeta = tiers.reduce((a, t) => a + (target[t.key] || 0), 0);
  const nSdrs = SNIPER_SDRS.length || 1;

  function movAvg(key) {
    const last5 = sniperWdElapsed.slice(-6, -1);
    if (!last5.length) return 0;
    const sum = last5.reduce((a, d) => a + (sniperDailyByTier[key]?.[d] || 0), 0);
    return parseFloat((sum / last5.length).toFixed(1));
  }

  function ritmo(key) {
    const rem = Math.max(0, (target[key] || 0) - sniperTotals[key]);
    if (rem <= 0) return 0;
    if (sniperWdRemaining <= 0) return rem;
    return parseFloat((rem / sniperWdRemaining).toFixed(1));
  }

  // Ritmo diário individual por SDR (últ. 5 du)
  function sdrMovAvg(sdr) {
    const last5 = sniperWdElapsed.slice(-6, -1);
    if (!last5.length) return 0;
    const daily = sniperDailyBySdr?.[sdr] || {};
    const sum = last5.reduce((a, d) => a + (daily[d] || 0), 0);
    return parseFloat((sum / last5.length).toFixed(1));
  }

  return (
    <div className="glass-panel p-6">
      <div style={{ marginBottom:"20px" }}>
        <p className="section-label" style={{ marginBottom:"2px" }}>Bloco 2 — Sniper · Silver / Gold / Diamond</p>
        <p style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>
          Meta total Sniper: {totalMeta} agenciamentos outbound de alto GMV
          {sniperWdRemaining > 0 && ` · ${sniperWdRemaining} dias úteis restantes`}
        </p>
      </div>

      {/* Totais por tier */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${tiers.length}, 1fr)`, gap:"14px" }}>
        {tiers.map(tier => {
          const actual = sniperTotals[tier.key] || 0;
          const meta   = target[tier.key] || 0;
          const avg    = movAvg(tier.key);
          const rit    = ritmo(tier.key);
          const st     = statusBadge(avg, rit);

          return (
            <div key={tier.key} style={{
              background:"rgba(255,255,255,0.03)", borderRadius:"12px", padding:"16px",
              border:`1px solid ${tier.color}22`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                <div>
                  <p style={{ fontSize:"0.85rem", fontWeight:700, color:tier.color }}>{tier.icon} {tier.label}</p>
                  <p style={{ fontSize:"0.62rem", color:"var(--text-muted)" }}>{tier.gmv} GMV/mês</p>
                </div>
                <span style={{ fontSize:"0.65rem" }}>{st.icon}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"10px" }}>
                <span style={{ fontSize:"2rem", fontWeight:800, color:tier.color, lineHeight:1 }}>{actual}</span>
                <span style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>/ {meta}</span>
              </div>
              <ProgressBar value={actual} max={meta} color={tier.color} height={6} />
              <div style={{ marginTop:"10px", paddingTop:"8px", borderTop:"1px solid rgba(255,255,255,0.05)",
                display:"flex", flexDirection:"column", gap:"4px" }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:"0.6rem", color:"var(--text-muted)" }}>Ritmo atual</span>
                  <span style={{ fontSize:"0.65rem", fontWeight:700, color:st.color }}>{avg}/dia</span>
                </div>
                {rit > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:"0.6rem", color:"var(--text-muted)" }}>Necessário</span>
                    <span style={{ fontSize:"0.65rem", fontWeight:700, color:"#a78bfa" }}>{rit}/dia</span>
                  </div>
                )}
                {COMMISSION[tier.key] > 0 && (
                  <div style={{ marginTop:"4px", paddingTop:"4px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                    <p style={{ fontSize:"0.62rem", color:"var(--text-muted)" }}>
                      Comissão:{" "}
                      <span style={{ color:tier.color, fontWeight:600 }}>{fmtBRL(actual * COMMISSION[tier.key])}</span>
                      <span style={{ marginLeft:"4px", opacity:0.5 }}>/ {fmtBRL(meta * COMMISSION[tier.key])}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Por SDR ─── */}
      <div style={{ marginTop:"24px", paddingTop:"20px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.08em",
          color:"var(--text-muted)", fontWeight:600, marginBottom:"14px" }}>Progresso por SDR</p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"14px" }}>
          {SNIPER_SDRS.map(sdr => {
            const vis      = SDR_VISUAL[sdr] || { color:"#a78bfa", initials:"??" };
            const d        = sniperBySdr?.[sdr] || { total:0, silver:0, gold:0, diamond:0, safira:0 };
            const avg      = sdrMovAvg(sdr);
            const comm     = tiers.reduce((a, t) => a + (d[t.key] || 0) * (COMMISSION[t.key] || 0), 0);
            const totalAg  = d.total || 0;
            const metaTot  = Math.round(totalMeta / nSdrs);

            // Faltam calculado pelo total individual
            const faltam   = Math.max(0, metaTot - totalAg);
            const ritmoNec = faltam > 0 && sniperWdRemaining > 0
              ? parseFloat((faltam / sniperWdRemaining).toFixed(1))
              : 0;
            const st       = statusBadge(avg, ritmoNec);

            return (
              <div key={sdr} style={{
                background:"rgba(255,255,255,0.03)", borderRadius:"14px", padding:"18px",
                border:`1px solid ${vis.color}22`,
              }}>
                {/* Header SDR */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{
                      width:36, height:36, borderRadius:"50%",
                      background:`${vis.color}22`, border:`2px solid ${vis.color}66`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"0.75rem", fontWeight:800, color:vis.color,
                    }}>{vis.initials}</div>
                    <div>
                      <p style={{ fontSize:"0.9rem", fontWeight:700, color:"var(--text-primary)", lineHeight:1 }}>
                        {sdr.split(" ")[0]}
                      </p>
                      <p style={{ fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"2px" }}>SDR Sniper</p>
                    </div>
                  </div>
                  <span style={{ fontSize:"0.7rem" }}>{st.icon}</span>
                </div>

                {/* Tiers individuais */}
                <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"14px" }}>
                  {tiers.map(tier => {
                    const act     = d[tier.key] || 0;
                    const tierMeta = Math.round((target[tier.key] || 0) / nSdrs);
                    const faltamT  = Math.max(0, tierMeta - act);
                    return (
                      <div key={tier.key}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"5px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                            <span style={{ fontSize:"0.75rem" }}>{tier.icon}</span>
                            <span style={{ fontSize:"0.7rem", color:tier.color, fontWeight:600 }}>{tier.label}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                            <span style={{ fontSize:"0.82rem", fontWeight:800, color:tier.color }}>{act}</span>
                            <span style={{ fontSize:"0.6rem", color:"var(--text-muted)" }}>/ {tierMeta}</span>
                            {faltamT > 0 && (
                              <span style={{
                                fontSize:"0.6rem", fontWeight:600, color:"#f59e0b",
                                background:"rgba(245,158,11,0.12)", borderRadius:"4px", padding:"1px 6px",
                              }}>−{faltamT}</span>
                            )}
                            {faltamT === 0 && act > 0 && (
                              <span style={{
                                fontSize:"0.6rem", fontWeight:600, color:"#10b981",
                                background:"rgba(16,185,129,0.12)", borderRadius:"4px", padding:"1px 6px",
                              }}>✓</span>
                            )}
                          </div>
                        </div>
                        <ProgressBar value={act} max={tierMeta || 1} color={tier.color} height={5} />
                      </div>
                    );
                  })}
                </div>

                {/* Rodapé: total / ritmo / comissão */}
                <div style={{
                  marginTop:"12px", paddingTop:"12px", borderTop:"1px solid rgba(255,255,255,0.06)",
                  display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"8px",
                }}>
                  <div>
                    <p style={{ fontSize:"0.58rem", textTransform:"uppercase", letterSpacing:"0.06em",
                      color:"var(--text-muted)", marginBottom:"3px" }}>Total ag.</p>
                    <p style={{ fontSize:"1.1rem", fontWeight:800, color:vis.color, lineHeight:1 }}>{totalAg}</p>
                    <p style={{ fontSize:"0.58rem", color:"var(--text-muted)", marginTop:"2px" }}>
                      {faltam > 0 ? `faltam ${faltam}` : "✓ meta batida"}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize:"0.58rem", textTransform:"uppercase", letterSpacing:"0.06em",
                      color:"var(--text-muted)", marginBottom:"3px" }}>Ritmo atual</p>
                    <p style={{ fontSize:"1.1rem", fontWeight:800, color:st.color, lineHeight:1 }}>{avg}/dia</p>
                    {ritmoNec > 0 && (
                      <p style={{ fontSize:"0.58rem", color:"#a78bfa", marginTop:"2px" }}>nec. {ritmoNec}/dia</p>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize:"0.58rem", textTransform:"uppercase", letterSpacing:"0.06em",
                      color:"var(--text-muted)", marginBottom:"3px" }}>Comissão</p>
                    <p style={{ fontSize:"0.85rem", fontWeight:800, color:"#10b981", lineHeight:1 }}>{fmtBRL(comm)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nota sobre feriado / início Sniper */}
      {target.sniperFirstDay && target.sniperFirstDay > target.firstDay && (
        <div style={{ marginTop:"14px", padding:"10px 14px", background:"rgba(124,58,237,0.05)",
          borderRadius:"8px", border:"1px solid rgba(124,58,237,0.15)" }}>
          <p style={{ fontSize:"0.68rem", color:"#a78bfa" }}>
            ℹ️ Sniper iniciou em <strong>{target.sniperFirstDay.slice(5).replace("-","/")}</strong>.
            Ritmo calculado sobre dias úteis a partir dessa data.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Bloco Sniper Leads — funil + responsável + categoria ────────────────────
function SniperLeadsBlock({ sniperCrm, sniperByResp, sniperByStatus, sniperByCategoria, sniperDailyBySdr, wdElapsed }) {
  if (!sniperCrm.length) return null;

  const STATUS_ORDER = [
    "NÃO CONTATADO","CONTATADO","CHAMAR NO WPP","Em progresso","Reunião Agendada",
    "Analise de perfil agendada","Enviar Convite","Convite Enviado","Convite Aceito",
    "AGENCIADO","Reunião Realizada","Não tem interesse","Desvinculou antes 30",
  ];
  const STATUS_COLOR = {
    "NÃO CONTATADO": "#64748b", "CONTATADO": "#60a5fa", "CHAMAR NO WPP": "#f472b6",
    "Em progresso": "#3b82f6", "Reunião Agendada": "#8b5cf6", "Analise de perfil agendada": "#a78bfa",
    "Enviar Convite": "#ec4899", "Convite Enviado": "#eab308", "Convite Aceito": "#14b8a6",
    "AGENCIADO": "#10b981", "Reunião Realizada": "#06b6d4", "Não tem interesse": "#ef4444",
    "Desvinculou antes 30": "#f97316",
  };
  const CAT_COLOR  = { "Silver":"#94a3b8", "Gold":"#f59e0b", "Diamond":"#38bdf8", "Safira":"#e879f9" };
  const CAT_ICON   = { "Silver":"🥈", "Gold":"🥇", "Diamond":"💎", "Safira":"💠" };

  const total = sniperCrm.length;
  const maxStatus = Math.max(1, ...Object.values(sniperByStatus));

  // Moving avg últimos 5 du por responsável
  function respAvg(resp) {
    const last5 = wdElapsed.slice(-6, -1);
    if (!last5.length) return 0;
    const daily = sniperDailyBySdr?.[resp] || {};
    return parseFloat((last5.reduce((a, d) => a + (daily[d] || 0), 0) / last5.length).toFixed(1));
  }

  const respEntries = Object.entries(sniperByResp).sort((a, b) => b[1].total - a[1].total);
  const catEntries  = Object.entries(sniperByCategoria)
    .filter(([c]) => c !== "Sem categoria")
    .sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="glass-panel p-6" style={{ marginTop:"0" }}>
      <p className="section-label" style={{ marginBottom:"16px" }}>
        📋 Leads Outbound — Funil · Responsável · Categoria
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>

        {/* ── Funil de Fases ── */}
        <div>
          <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.08em",
            color:"var(--text-muted)", fontWeight:600, marginBottom:"12px" }}>Funil de Status</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {STATUS_ORDER.filter(s => sniperByStatus[s] > 0).map(s => {
              const cnt  = sniperByStatus[s] || 0;
              const pct  = total > 0 ? ((cnt / total) * 100).toFixed(1) : 0;
              const barW = (cnt / maxStatus) * 100;
              const col  = STATUS_COLOR[s] || "#64748b";
              return (
                <div key={s}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                    <span style={{ fontSize:"0.68rem", color: col, fontWeight:600 }}>{s}</span>
                    <span style={{ fontSize:"0.68rem", color:"var(--text-secondary)" }}>
                      {cnt} <span style={{ color:"var(--text-muted)", fontSize:"0.6rem" }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height:"5px", background:"rgba(255,255,255,0.06)", borderRadius:"3px" }}>
                    <div style={{ height:"100%", width:`${barW}%`, background:col, borderRadius:"3px",
                      transition:"width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Por Categoria ── */}
        <div>
          <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.08em",
            color:"var(--text-muted)", fontWeight:600, marginBottom:"12px" }}>Por Categoria</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {catEntries.map(([cat, d]) => {
              const col   = CAT_COLOR[cat]  || "#a78bfa";
              const icon  = CAT_ICON[cat]   || "📦";
              const conv  = d.total > 0 ? ((d.agenciados / d.total) * 100).toFixed(1) : "0.0";
              return (
                <div key={cat} style={{ background:"rgba(255,255,255,0.02)", borderRadius:"10px",
                  padding:"12px 14px", border:`1px solid ${col}22` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                    <span style={{ fontSize:"0.82rem", fontWeight:700, color:col }}>{icon} {cat}</span>
                    <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{d.total} leads</span>
                  </div>
                  <div style={{ display:"flex", gap:"16px" }}>
                    <div>
                      <p style={{ fontSize:"0.58rem", color:"var(--text-muted)", textTransform:"uppercase" }}>Agenciados</p>
                      <p style={{ fontSize:"1.1rem", fontWeight:800, color:col, lineHeight:1 }}>{d.agenciados}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:"0.58rem", color:"var(--text-muted)", textTransform:"uppercase" }}>Taxa</p>
                      <p style={{ fontSize:"1.1rem", fontWeight:800, color:"#10b981", lineHeight:1 }}>{conv}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Por Responsável ── */}
      <div style={{ marginTop:"24px", paddingTop:"20px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.08em",
          color:"var(--text-muted)", fontWeight:600, marginBottom:"14px" }}>Por Responsável</p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:"14px" }}>
          {respEntries.map(([resp, d]) => {
            const avg   = respAvg(resp);
            const conv  = d.total > 0 ? ((d.agenciados / d.total) * 100).toFixed(1) : "0.0";
            const initials = resp.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
            const topCats = Object.entries(d.byCategoria)
              .filter(([c]) => c !== "Sem categoria")
              .sort((a,b) => b[1] - a[1]).slice(0,3);
            const topStatus = Object.entries(d.byStatus).sort((a,b) => b[1] - a[1]).slice(0,5);

            return (
              <div key={resp} style={{ background:"rgba(255,255,255,0.03)", borderRadius:"12px",
                padding:"16px", border:"1px solid rgba(255,255,255,0.08)" }}>
                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%",
                    background:"rgba(124,58,237,0.2)", border:"2px solid rgba(124,58,237,0.4)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"0.75rem", fontWeight:800, color:"#a78bfa" }}>{initials}</div>
                  <div>
                    <p style={{ fontSize:"0.88rem", fontWeight:700, color:"var(--text-primary)", lineHeight:1 }}>
                      {resp.split(" ")[0]}
                    </p>
                    <p style={{ fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"2px" }}>
                      {d.total} leads · {d.agenciados} ag. · {conv}% conv.
                    </p>
                  </div>
                  <div style={{ marginLeft:"auto", textAlign:"right" }}>
                    <p style={{ fontSize:"1.2rem", fontWeight:800, color:"#f97316", lineHeight:1 }}>{avg}/dia</p>
                    <p style={{ fontSize:"0.58rem", color:"var(--text-muted)" }}>ritmo (5du)</p>
                  </div>
                </div>

                {/* Categorias */}
                {topCats.length > 0 && (
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"10px" }}>
                    {topCats.map(([cat, cnt]) => (
                      <span key={cat} style={{ fontSize:"0.62rem", fontWeight:600, padding:"2px 8px",
                        borderRadius:"4px", background:`${CAT_COLOR[cat] || "#7c3aed"}18`,
                        color: CAT_COLOR[cat] || "#a78bfa",
                        border:`1px solid ${CAT_COLOR[cat] || "#7c3aed"}30` }}>
                        {CAT_ICON[cat] || "📦"} {cat}: {cnt}
                      </span>
                    ))}
                  </div>
                )}

                {/* Top fases */}
                <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                  {topStatus.map(([s, cnt]) => {
                    const col = STATUS_COLOR[s] || "#64748b";
                    const pct = d.total > 0 ? ((cnt / d.total) * 100).toFixed(0) : 0;
                    return (
                      <div key={s} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:"0.62rem", color:col }}>{s}</span>
                        <span style={{ fontSize:"0.62rem", color:"var(--text-muted)" }}>
                          {cnt} <span style={{ opacity:0.6 }}>({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Bloco 3 — Comissão por SDR ───────────────────────────────────────────────
function CommissionBlock({ target, sniperBySdr, selectedMonth }) {
  const sdrs = SNIPER_SDRS;

  // Metas por SDR (baseado nas projeções do plano — dividido igualmente entre SDRs ativos)
  const nSdrs     = sdrs.length;
  const metaPerSdr = {
    silver:  Math.round((target.silver  || 0) / nSdrs),
    gold:    Math.round((target.gold    || 0) / nSdrs),
    diamond: Math.round((target.diamond || 0) / nSdrs),
    safira:  Math.round((target.safira  || 0) / nSdrs),
  };

  function calcComm(d) {
    return (d.silver  || 0) * COMMISSION.silver
         + (d.gold    || 0) * COMMISSION.gold
         + (d.diamond || 0) * COMMISSION.diamond
         + (d.safira  || 0) * COMMISSION.safira;
  }

  const metaComm100 = calcComm(metaPerSdr);
  const showSafira  = (target.safira || 0) > 0;

  return (
    <div className="glass-panel p-6">
      <div style={{ marginBottom:"20px" }}>
        <p className="section-label" style={{ marginBottom:"2px" }}>Bloco 3 — Comissão Acumulada por SDR</p>
        <p style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>
          Silver ×R$35 + Gold ×R$150 + Diamond ×R$280
          &nbsp;·&nbsp;Meta individual projetada: {fmtBRL(metaComm100)} (100% meta)
        </p>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
              {["SDR", "🥈 Silver", "🥇 Gold", "💎 Diamond",
                ...(showSafira ? ["💠 Safira"] : []),
                "Comissão acum.", "Meta (100%)"
              ].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"8px 12px", fontSize:"0.62rem",
                  textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)", fontWeight:600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sdrs.map(sdr => {
              const d       = sniperBySdr[sdr] || { total:0, silver:0, gold:0, diamond:0, safira:0 };
              const comm    = calcComm(d);
              const initials = sdr.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
              return (
                <tr key={sdr} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding:"12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:28, height:28, borderRadius:"50%",
                        background:"rgba(124,58,237,0.3)", display:"flex", alignItems:"center",
                        justifyContent:"center", fontSize:"0.65rem", fontWeight:800, color:"#a78bfa" }}>
                        {initials}
                      </div>
                      <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{sdr.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td style={{ padding:"12px", color:"#94a3b8", fontWeight:600 }}>{d.silver  || 0}</td>
                  <td style={{ padding:"12px", color:"#f59e0b", fontWeight:600 }}>{d.gold    || 0}</td>
                  <td style={{ padding:"12px", color:"#38bdf8", fontWeight:600 }}>{d.diamond || 0}</td>
                  {showSafira && <td style={{ padding:"12px", color:"#e879f9", fontWeight:600 }}>{d.safira || 0}</td>}
                  <td style={{ padding:"12px" }}>
                    <span style={{ fontSize:"0.95rem", fontWeight:800, color:"#10b981" }}>{fmtBRL(comm)}</span>
                  </td>
                  <td style={{ padding:"12px", color:"var(--text-muted)" }}>{fmtBRL(metaComm100)}</td>
                </tr>
              );
            })}

            {/* Linha Total */}
            <tr style={{ background:"rgba(255,255,255,0.02)", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
              <td style={{ padding:"12px", fontWeight:700, color:"var(--text-primary)" }}>Total</td>
              {["silver","gold","diamond"].map((k, i) => (
                <td key={k} style={{ padding:"12px", color:["#94a3b8","#f59e0b","#38bdf8"][i], fontWeight:700 }}>
                  {sdrs.reduce((a, s) => a + (sniperBySdr[s]?.[k] || 0), 0)}
                </td>
              ))}
              {showSafira && (
                <td style={{ padding:"12px", color:"#e879f9", fontWeight:700 }}>
                  {sdrs.reduce((a, s) => a + (sniperBySdr[s]?.safira || 0), 0)}
                </td>
              )}
              <td style={{ padding:"12px" }}>
                <span style={{ fontSize:"0.95rem", fontWeight:800, color:"#10b981" }}>
                  {fmtBRL(sdrs.reduce((a, s) => a + calcComm(sniperBySdr[s] || {}), 0))}
                </span>
              </td>
              <td style={{ padding:"12px", color:"var(--text-muted)", fontWeight:700 }}>
                {fmtBRL(sdrs.length * metaComm100)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:"12px", padding:"10px 14px", background:"rgba(124,58,237,0.06)",
        borderRadius:"8px", border:"1px solid rgba(124,58,237,0.2)" }}>
        <p style={{ fontSize:"0.68rem", color:"#a78bfa" }}>
          ℹ️ <strong>Projetado</strong> = comissão calculada sobre agenciamentos registrados no CRM Sniper (Status: Fechado).
          &nbsp;<strong>Confirmado</strong> = creator ativo 30 dias + Circle da Amplify.
          O dashboard mostra o valor projetado. Comissões são efetivadas após os 30 dias.
        </p>
      </div>
    </div>
  );
}

// ─── Bloco 4 — CAC do Mês ─────────────────────────────────────────────────────
function CacBlock({ totalGasto, totalConverted, cac, target, startCount, sniperCount }) {
  const cacMeta  = target.cacMeta;
  const isAbove  = cac > 0 && cac > cacMeta;
  const pctUsed  = cacMeta > 0 ? Math.min(150, (cac / cacMeta) * 100) : 0;

  return (
    <div className="glass-panel p-6">
      <div style={{ marginBottom:"20px" }}>
        <p className="section-label" style={{ marginBottom:"2px" }}>Bloco 4 — CAC do Mês</p>
        <p style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>
          Custo total acumulado ÷ agenciamentos totais (Start + Sniper)
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr) auto", gap:"20px", alignItems:"start" }}>
        {/* CAC atual */}
        <div>
          <p style={{ fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.08em",
            color:"var(--text-muted)", fontWeight:600, marginBottom:"4px" }}>CAC Atual</p>
          <p style={{ fontSize:"2.4rem", fontWeight:800, lineHeight:1, letterSpacing:"-0.04em",
            color: cac === 0 ? "var(--text-muted)" : isAbove ? "#ef4444" : "#10b981" }}>
            {cac > 0 ? fmtBRL(cac) : "—"}
          </p>
          <p style={{ fontSize:"0.65rem", color:"var(--text-muted)", marginTop:"4px" }}>
            {totalConverted > 0
              ? `${fmtBRL(totalGasto)} ÷ ${totalConverted.toLocaleString("pt-BR")} ag.`
              : "Sem agenciamentos no período"}
          </p>
        </div>

        {/* Breakdown */}
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          <div>
            <p style={{ fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.08em",
              color:"var(--text-muted)", fontWeight:600, marginBottom:"4px" }}>Custo Total</p>
            <p style={{ fontSize:"1.2rem", fontWeight:700, color:"#a78bfa" }}>{fmtBRL(totalGasto)}</p>
          </div>
          <div style={{ display:"flex", gap:"16px" }}>
            {[
              { label:"Start",  val:startCount,  color:"#10b981" },
              { label:"Sniper", val:sniperCount,  color:"#f59e0b" },
              { label:"Total",  val:totalConverted, color:"var(--text-primary)" },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <p style={{ fontSize:"0.6rem", color:"var(--text-muted)" }}>{label}</p>
                <p style={{ fontSize:"0.95rem", fontWeight:700, color }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status card */}
        <div style={{ background: isAbove ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
          borderRadius:"12px", padding:"16px",
          border:`1px solid ${isAbove ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
          textAlign:"center", minWidth:"120px" }}>
          <p style={{ fontSize:"1.8rem", marginBottom:"4px" }}>{cac===0 ? "⏳" : isAbove ? "🔴" : "✅"}</p>
          <p style={{ fontSize:"0.68rem", color:isAbove ? "#ef4444" : "#10b981", fontWeight:700 }}>
            {cac===0 ? "Aguardando" : isAbove ? "Acima da meta" : "Dentro da meta"}
          </p>
          <p style={{ fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"4px" }}>
            Meta: {fmtBRL(cacMeta)}
          </p>
        </div>
      </div>

      {/* Barra CAC vs meta */}
      {cac > 0 && (
        <div style={{ marginTop:"20px", paddingTop:"16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
            <span style={{ fontSize:"0.65rem", color:"var(--text-muted)" }}>CAC atual: {fmtBRL(cac)}</span>
            <span style={{ fontSize:"0.65rem", color:"var(--text-muted)" }}>Meta: {fmtBRL(cacMeta)}</span>
          </div>
          <div style={{ position:"relative", height:"10px", background:"rgba(255,255,255,0.07)",
            borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pctUsed}%`, borderRadius:99,
              background: isAbove ? "#ef4444" : "#10b981", transition:"width 0.6s ease" }} />
            <div style={{ position:"absolute", top:0, bottom:0, left:"66.7%", width:"2px",
              background:"rgba(255,255,255,0.5)" }} title="Meta" />
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:"4px" }}>
            <span style={{ fontSize:"0.6rem", color:isAbove ? "#ef4444" : "#10b981", fontWeight:600 }}>
              {isAbove
                ? `▲ ${fmtBRL(cac - cacMeta)} acima da meta`
                : `▼ ${fmtBRL(cacMeta - cac)} abaixo da meta`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bloco 5 — Renovações de Contrato ────────────────────────────────────────
function ContratosBlock({ byDate, totals, loading }) {
  if (loading) {
    return (
      <div className="glass-panel p-6">
        <p className="section-label" style={{ marginBottom:"16px" }}>
          📋 Bloco 5 — Renovações de Contrato (Amplify Club)
        </p>
        <p style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>Carregando dados da planilha…</p>
      </div>
    );
  }

  if (!totals || totals.total === 0) {
    return (
      <div className="glass-panel p-6">
        <p className="section-label" style={{ marginBottom:"16px" }}>
          📋 Bloco 5 — Renovações de Contrato (Amplify Club)
        </p>
        <p style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>
          Nenhum dado encontrado. Verifique se a planilha está compartilhada publicamente.
        </p>
      </div>
    );
  }

  // Ordena datas e monta dados para gráfico
  const chartData = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date: date.slice(5).replace("-", "/"), // MM/DD → D/M display
      expirando: d.expirando,
      renovados: d.renovados,
      removidos: d.removidos,
      pendentes: d.pendentes,
    }));

  const taxa     = parseFloat(totals.taxaReversao);
  const taxaColor = taxa >= 60 ? "#10b981" : taxa >= 40 ? "#f59e0b" : "#ef4444";
  const taxaIcon  = taxa >= 60 ? "✅" : taxa >= 40 ? "⚠️" : "🔴";

  const kpis = [
    { label: "Total com vencimento",  value: totals.total,      color: "var(--text-primary)", sub: "contratos na planilha" },
    { label: "Renovados",             value: totals.renovados,  color: "#10b981",              sub: "Contrato Renovado"    },
    { label: "Removidos / Expirados", value: totals.removidos,  color: "#ef4444",              sub: "acesso removido"      },
    { label: "Pendentes",             value: totals.pendentes,  color: "#f59e0b",              sub: "aguardando decisão"   },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:"rgba(15,15,25,0.95)", border:"1px solid rgba(255,255,255,0.12)",
        borderRadius:"8px", padding:"10px 14px", fontSize:"0.75rem" }}>
        <p style={{ fontWeight:700, color:"var(--text-primary)", marginBottom:"6px" }}>📅 {label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: p.fill, margin:"2px 0" }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="glass-panel p-6">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
        <div>
          <p className="section-label" style={{ marginBottom:"2px" }}>
            📋 Bloco 5 — Renovações de Contrato (Amplify Club)
          </p>
          <p style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>
            Contratos expirando, renovados e taxa de reversão — dados da planilha de controle
          </p>
        </div>
        {/* Taxa de Reversão em destaque */}
        <div style={{ textAlign:"right", minWidth:"120px" }}>
          <p style={{ fontSize:"0.6rem", textTransform:"uppercase", letterSpacing:"0.08em",
            color:"var(--text-muted)", fontWeight:600, marginBottom:"4px" }}>
            {taxaIcon} Taxa de Reversão
          </p>
          <p style={{ fontSize:"2.4rem", fontWeight:800, lineHeight:1, letterSpacing:"-0.04em",
            color: taxaColor }}>{taxa.toFixed(1)}%</p>
          <p style={{ fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"2px" }}>
            {totals.renovados} renov. ÷ {totals.renovados + totals.removidos} dec.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"14px", marginBottom:"24px" }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:"10px",
            padding:"14px 16px", border:"1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize:"0.6rem", textTransform:"uppercase", letterSpacing:"0.08em",
              color:"var(--text-muted)", fontWeight:600, marginBottom:"6px" }}>{k.label}</p>
            <p style={{ fontSize:"2rem", fontWeight:800, color:k.color, lineHeight:1,
              letterSpacing:"-0.03em" }}>{k.value}</p>
            <p style={{ fontSize:"0.62rem", color:"var(--text-muted)", marginTop:"4px" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico diário */}
      <div>
        <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.08em",
          color:"var(--text-muted)", fontWeight:600, marginBottom:"14px" }}>
          Contratos por Data de Expiração
        </p>
        <div style={{ width:"100%", height: Math.max(200, Math.min(320, chartData.length * 28)) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top:8, right:16, left:0, bottom:4 }}
              barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:"#94a3b8" }}
                tickLine={false} axisLine={{ stroke:"rgba(255,255,255,0.08)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize:11, fill:"#94a3b8" }}
                tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill:"rgba(255,255,255,0.04)" }} />
              <Legend iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize:"0.7rem", paddingTop:"8px" }} />
              <Bar dataKey="expirando" name="Expirando"  fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="renovados" name="Renovados"  fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="removidos" name="Removidos"  fill="#ef4444" radius={[3,3,0,0]} />
              <Bar dataKey="pendentes" name="Pendentes"  fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Nota */}
      <div style={{ marginTop:"16px", padding:"10px 14px", background:"rgba(124,58,237,0.06)",
        borderRadius:"8px", border:"1px solid rgba(124,58,237,0.2)" }}>
        <p style={{ fontSize:"0.68rem", color:"#a78bfa" }}>
          ℹ️ <strong>Taxa de Reversão</strong> = contratos renovados ÷ (renovados + removidos).
          Pendentes = sem decisão registrada ainda na planilha.
          Dados atualizados direto da planilha Amplify Club.
        </p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MetricasView() {
  const pathname = usePathname();

  const now         = new Date();
  const curMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const today       = toLocalDate(now);

  // ─── Seletor de período (igual aos outros dashboards) ───────────────────
  const defaultFrom = `${curMonthKey}-01`; // 1° do mês atual
  const [dateFrom,    setDateFrom]    = useState(defaultFrom);
  const [dateTo,      setDateTo]      = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo,   setAppliedTo]   = useState(today);

  const applyFilter = () => {
    if (!dateFrom || !dateTo) return;
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const setPreset = (days) => {
    const to   = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    const f = toLocalDate(from), t = toLocalDate(to);
    setDateFrom(f); setDateTo(t);
    setAppliedFrom(f); setAppliedTo(t);
  };

  const setPresetMonth = (monthKey) => {
    const [y, m] = monthKey.split("-").map(Number);
    const f = `${monthKey}-01`;
    const tObj = new Date(y, m, 0); // último dia do mês
    const t = monthKey <= curMonthKey
      ? (monthKey === curMonthKey ? today : toLocalDate(tObj))
      : toLocalDate(tObj);
    setDateFrom(f); setDateTo(t);
    setAppliedFrom(f); setAppliedTo(t);
  };

  // ─── Detecta mês das metas pelo final do período selecionado ─────────────
  const selectedMonth = appliedTo.slice(0, 7);
  const target = Q2_TARGETS[selectedMonth]
    ?? Q2_TARGETS[curMonthKey]
    ?? Q2_TARGETS["2026-05"];
  const mEnd = useMemo(() => monthEnd(selectedMonth), [selectedMonth]);

  // ─── Dias úteis — Start ───────────────────────────────────────────────────
  const workingDaysElapsed = useMemo(() => {
    const from = target.firstDay;
    const to   = appliedTo <= mEnd ? appliedTo : mEnd;
    if (from > to) return [];
    return getWorkingDays(from, to);
  }, [selectedMonth, appliedTo, mEnd]);

  const workingDaysRemaining = useMemo(
    () => calcWdRemaining(target.firstDay, appliedTo, mEnd, selectedMonth, curMonthKey),
    [selectedMonth, appliedTo, mEnd]
  );

  // ─── Dias úteis — Sniper ──────────────────────────────────────────────────
  const sniperWdElapsed = useMemo(() => {
    const from = target.sniperFirstDay || target.firstDay;
    const to   = appliedTo <= mEnd ? appliedTo : mEnd;
    if (from > to) return [];
    return getWorkingDays(from, to);
  }, [selectedMonth, appliedTo, mEnd]);

  const sniperWdRemaining = useMemo(
    () => calcWdRemaining(target.sniperFirstDay || target.firstDay, appliedTo, mEnd, selectedMonth, curMonthKey),
    [selectedMonth, appliedTo, mEnd]
  );

  // ─── State ────────────────────────────────────────────────────────────────
  const [leads,           setLeads]           = useState([]);
  const [gastos,          setGastos]          = useState([]);
  const [sniperCrm,       setSniperCrm]       = useState([]);
  const [sniperError,     setSniperError]     = useState(null);
  const [contratosByDate, setContratosByDate]  = useState({});
  const [contratosTotals, setContratosTotals]  = useState(null);
  const [contratosLoading,setContratosLoading] = useState(true);
  const [loading,         setLoading]          = useState(true);
  const [error,           setError]            = useState(null);

  // ─── Fetch contratos (independente do período) ───────────────────────────
  useEffect(() => {
    setContratosLoading(true);
    fetch("/api/contratos")
      .then(r => r.json())
      .then(j => {
        if (j.error) { console.warn("[contratos]", j.error); return; }
        setContratosByDate(j.byDate  || {});
        setContratosTotals(j.totals  || null);
      })
      .catch(e => console.warn("[contratos]", e.message))
      .finally(() => setContratosLoading(false));
  }, []);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);

    const tz  = getBrowserTz();
    const enc = encodeURIComponent;

    Promise.all([
      fetch(`/api/notion?from=${appliedFrom}&to=${appliedTo}&dateField=${enc("Data do Primeiro contato")}&tz=${enc(tz)}`).then(r => r.json()),
      fetch(`/api/gastos?from=${appliedFrom}&to=${appliedTo}`).then(r => r.json()),
      fetch(`/api/sniper?from=${appliedFrom}&to=${appliedTo}&tz=${enc(tz)}`).then(r => r.json()),
    ]).then(([lj, gj, sj]) => {
      if (lj.error) throw new Error(lj.error);
      if (gj.error) throw new Error(gj.error);
      setLeads(lj.data     || []);
      setGastos(gj.data    || []);
      if (sj.error) {
        setSniperError(sj.error);
        setSniperCrm([]);
      } else {
        setSniperError(null);
        setSniperCrm(sj.data || []);
      }
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [appliedFrom, appliedTo]);

  // ─── Processamento — Leads (base principal) ───────────────────────────────
  const parsed = useMemo(() => leads.map(l => ({
    sdr:    l.sdr    || "Desconhecido",
    fase:   l.fase   || "Desconhecido",
    origem: l.origem || "Desconhecida",
    date:   l.date   || null,
  })), [leads]);

  const isConverted = (f) => f === "Agenciado" || f === "Convite Aceito";

  const startLeads  = useMemo(
    () => parsed.filter(l => isConverted(l.fase) && l.origem !== "Outbound"),
    [parsed]
  );
  const sniperLeads = useMemo(
    () => parsed.filter(l => isConverted(l.fase) && l.origem === "Outbound"),
    [parsed]
  );

  // Média móvel Start (últimos 5 du excluindo hoje)
  const dailyStart = useMemo(() => {
    const map = {};
    startLeads.forEach(l => { if (l.date) map[l.date] = (map[l.date] || 0) + 1; });
    return map;
  }, [startLeads]);

  const movingAvgStart = useMemo(() => {
    const last5 = workingDaysElapsed.slice(-6, -1);
    if (!last5.length) return 0;
    const sum = last5.reduce((a, d) => a + (dailyStart[d] || 0), 0);
    return parseFloat((sum / last5.length).toFixed(1));
  }, [workingDaysElapsed, dailyStart]);

  const ritmoNecessario = useMemo(() => {
    const rem = Math.max(0, target.start - startLeads.length);
    if (rem <= 0) return 0;
    if (workingDaysRemaining <= 0) return rem;
    return parseFloat((rem / workingDaysRemaining).toFixed(1));
  }, [startLeads.length, workingDaysRemaining, target]);

  // ─── Processamento — CRM Sniper (Leads Outbound DB) ─────────────────────
  // A API retorna TODOS os registros sem filtro de data.
  //
  // • Para funil/categoria/responsável: usa sniperCrm inteiro (estado atual de todos os leads)
  // • Para metas mensais (agenciados no período): filtra por huggyDate quando disponível;
  //   se huggyDate for null, o lead não conta para a meta do mês (evita distorção por created_time antigo)

  const filteredSniperCrm = useMemo(() => {
    if (!sniperCrm.length) return [];
    // Verifica se alguma entrada tem huggyDate (campo preenchido intencionalmente)
    const anyHasHuggyDate = sniperCrm.some(r => r.huggyDate);
    if (anyHasHuggyDate) {
      // Filtra apenas por huggyDate — entradas sem huggyDate ficam de fora da contagem mensal
      return sniperCrm.filter(r => r.huggyDate && r.huggyDate >= appliedFrom && r.huggyDate <= appliedTo);
    }
    // Fallback: nenhum tem huggyDate → usa created_time mas com janela ampla (desde início Q2)
    return sniperCrm.filter(r => r.date && r.date >= appliedFrom && r.date <= appliedTo);
  }, [sniperCrm, appliedFrom, appliedTo]);

  // Leads agenciados no período (metas mensais)
  const sniperAgenciados = useMemo(() =>
    filteredSniperCrm.filter(r => {
      const s = (r.status || "").toUpperCase();
      return s === "AGENCIADO" || s === "CONVITE ACEITO";
    }),
  [filteredSniperCrm]);

  // ── Dados para exibição do funil/leads (TODOS os leads, sem filtro de período) ──
  // Por responsável: total chamados, agenciados, por categoria, daily map
  const sniperByResp = useMemo(() => {
    const map = {};
    sniperCrm.forEach(r => {
      const resp = r.responsavel || "Sem responsável";
      if (!map[resp]) map[resp] = { total:0, agenciados:0, byCategoria:{}, byStatus:{}, daily:{} };
      const m = map[resp];
      m.total++;
      const s = (r.status || "").toUpperCase();
      if (s === "AGENCIADO" || s === "CONVITE ACEITO") m.agenciados++;
      const cat = r.categoria || "Sem categoria";
      m.byCategoria[cat] = (m.byCategoria[cat] || 0) + 1;
      m.byStatus[r.status || "—"] = (m.byStatus[r.status || "—"] || 0) + 1;
      if (r.date) m.daily[r.date] = (m.daily[r.date] || 0) + 1;
    });
    return map;
  }, [sniperCrm]);

  // Geral por status (funil) — todos os leads
  const sniperByStatus = useMemo(() => {
    const map = {};
    sniperCrm.forEach(r => {
      const s = r.status || "—";
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [sniperCrm]);

  // Geral por categoria — todos os leads
  const sniperByCategoria = useMemo(() => {
    const map = {};
    sniperCrm.forEach(r => {
      const c = r.categoria || "Sem categoria";
      if (!map[c]) map[c] = { total:0, agenciados:0 };
      map[c].total++;
      const s = (r.status || "").toUpperCase();
      if (s === "AGENCIADO" || s === "CONVITE ACEITO") map[c].agenciados++;
    });
    return map;
  }, [sniperCrm]);

  // Compatibilidade com SniperBlock (metas por tier) — usa agenciados do período
  const sniperBySdr = useMemo(() => {
    const map = {};
    SNIPER_SDRS.forEach(sdr => {
      map[sdr] = { total:0, silver:0, gold:0, diamond:0, safira:0 };
    });
    sniperAgenciados.forEach(r => {
      const resp = r.responsavel || "";
      const sdr  = SNIPER_SDRS.find(s => s.toLowerCase().startsWith(resp.split(" ")[0].toLowerCase())) || resp;
      const cat  = (r.categoria || "").toLowerCase();
      if (!map[sdr]) map[sdr] = { total:0, silver:0, gold:0, diamond:0, safira:0 };
      map[sdr].total++;
      if (["silver","gold","diamond","safira"].includes(cat)) map[sdr][cat]++;
    });
    return map;
  }, [sniperAgenciados]);

  const sniperTotals = useMemo(() => ({
    silver:  (sniperByCategoria["Silver"]?.agenciados  || 0),
    gold:    (sniperByCategoria["Gold"]?.agenciados    || 0),
    diamond: (sniperByCategoria["Diamond"]?.agenciados || 0),
    safira:  (sniperByCategoria["Safira"]?.agenciados  || 0),
    total:   sniperAgenciados.length,
  }), [sniperByCategoria, sniperAgenciados]);

  // Contagem diária por tier (para moving average do Sniper)
  const sniperDailyByTier = useMemo(() => {
    const map = { silver:{}, gold:{}, diamond:{}, safira:{} };
    sniperAgenciados.forEach(r => {
      if (!r.date) return;
      const cat = (r.categoria || "").toLowerCase();
      if (map[cat]) map[cat][r.date] = (map[cat][r.date] || 0) + 1;
    });
    return map;
  }, [sniperAgenciados]);

  // Contagem diária por responsável — todos os leads (para ritmo de chamadas)
  const sniperDailyBySdr = useMemo(() => {
    const map = {};
    sniperCrm.forEach(r => {
      if (!r.date || !r.responsavel) return;
      if (!map[r.responsavel]) map[r.responsavel] = {};
      map[r.responsavel][r.date] = (map[r.responsavel][r.date] || 0) + 1;
    });
    return map;
  }, [filteredSniperCrm]);

  // Custo total
  const totalGasto = useMemo(() => {
    return gastos.reduce((acc, item) => {
      const valor = item.properties?.["Valor (R$)"]?.number || 0;
      const comp  = (item.properties?.["Competência"]?.date?.start || "").slice(0, 7);
      return comp === selectedMonth ? acc + valor : acc;
    }, 0);
  }, [gastos, selectedMonth]);

  // Para o CAC: Start + Sniper (do CRM ou da base principal como fallback)
  const sniperCount    = sniperTotals.total > 0 ? sniperTotals.total : sniperLeads.length;
  const totalConverted = startLeads.length + sniperCount;
  const cac            = totalConverted > 0 ? totalGasto / totalConverted : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto pb-16">
      {/* Nav */}
      <nav className="dash-nav">
        {NAV_TABS.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={`dash-nav__link ${pathname === tab.href ? "dash-nav__link--active" : ""}`}>
            <span>{tab.icon}</span>{tab.label}
          </Link>
        ))}
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-fade-in">
        <div>
          <h1 className="dash-title">🎯 Métricas Q2 2026</h1>
          <p style={{ fontSize:"0.875rem", color:"var(--text-secondary)", marginTop:"0.25rem" }}>
            Meta · Sniper · Comissão · CAC — atualizado em tempo real
          </p>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="glass-panel p-4 mb-6 animate-fade-in"
        style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
        <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"flex-end" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
            <label style={{ fontSize:"0.68rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>DE</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="date-input" />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
            <label style={{ fontSize:"0.68rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>ATÉ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="date-input" />
          </div>
          <button onClick={applyFilter}
            style={{ padding:"6px 18px", borderRadius:"8px", background:"linear-gradient(135deg,#7c3aed,#5b21b6)", color:"#fff", fontSize:"0.82rem", fontWeight:600, border:"none", cursor:"pointer" }}>
            Aplicar
          </button>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginLeft:"4px" }}>
            {[{ label:"7d", days:7 }, { label:"15d", days:15 }, { label:"30d", days:30 }].map(p => (
              <button key={p.label} onClick={() => setPreset(p.days)}
                style={{ padding:"5px 12px", borderRadius:"6px", background:"rgba(255,255,255,0.07)", color:"var(--text-secondary)", fontSize:"0.75rem", border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer" }}>
                {p.label}
              </button>
            ))}
            {Object.entries(Q2_TARGETS).map(([key, t]) => (
              <button key={key} onClick={() => setPresetMonth(key)}
                className={`origin-chip ${selectedMonth === key && appliedFrom === `${key}-01` ? "origin-chip--active" : ""}`}
                style={{ fontSize:"0.75rem" }}>
                {t.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize:"0.68rem", color:"var(--text-muted)" }}>
          Metas de referência: <strong style={{ color:"#a78bfa" }}>{target.label}</strong>
          &nbsp;· período: {appliedFrom.slice(5).replace("-","/")} → {appliedTo.slice(5).replace("-","/")}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight:"40vh" }}>
          <div className="loading-spinner" />
          <p style={{ fontSize:"0.85rem", color:"var(--text-muted)" }}>
            Carregando métricas de {target.label}…
          </p>
        </div>
      ) : error ? (
        <div className="glass-panel p-6"
          style={{ borderColor:"rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.06)" }}>
          <p style={{ color:"#ef4444" }}>Erro ao carregar: {error}</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>

          <StartBlock
            target={target}
            startCount={startLeads.length}
            movingAvg={movingAvgStart}
            ritmoNecessario={ritmoNecessario}
            wdRemaining={workingDaysRemaining}
            wdElapsed={workingDaysElapsed.length}
          />

          {sniperError && (
            <div style={{ padding:"12px 16px", borderRadius:"10px",
              background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)" }}>
              <p style={{ fontSize:"0.78rem", color:"#ef4444", fontWeight:600 }}>
                ⚠️ Erro ao carregar CRM Sniper: {sniperError}
              </p>
              <p style={{ fontSize:"0.68rem", color:"var(--text-muted)", marginTop:"4px" }}>
                Verifique se a integração Notion tem acesso ao banco "Leads Outbound" (344b0bbef153803d9fe9f956e2f67f20).
              </p>
            </div>
          )}

          {!sniperError && !loading && sniperCrm.length === 0 && (
            <div style={{ padding:"12px 16px", borderRadius:"10px",
              background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)" }}>
              <p style={{ fontSize:"0.78rem", color:"#f59e0b" }}>
                ⚠️ CRM Sniper carregado mas sem registros. Verifique o acesso da integração ao banco de dados.
              </p>
            </div>
          )}

          <SniperBlock
            target={target}
            sniperTotals={sniperTotals}
            sniperDailyByTier={sniperDailyByTier}
            sniperWdElapsed={sniperWdElapsed}
            sniperWdRemaining={sniperWdRemaining}
            sniperBySdr={sniperBySdr}
            sniperDailyBySdr={sniperDailyBySdr}
          />

          <SniperLeadsBlock
            sniperCrm={sniperCrm}
            sniperByResp={sniperByResp}
            sniperByStatus={sniperByStatus}
            sniperByCategoria={sniperByCategoria}
            sniperDailyBySdr={sniperDailyBySdr}
            wdElapsed={sniperWdElapsed}
          />

          <CommissionBlock
            target={target}
            sniperBySdr={sniperBySdr}
            selectedMonth={selectedMonth}
          />

          <CacBlock
            totalGasto={totalGasto}
            totalConverted={totalConverted}
            cac={cac}
            target={target}
            startCount={startLeads.length}
            sniperCount={sniperCount}
          />

          <ContratosBlock
            byDate={contratosByDate}
            totals={contratosTotals}
            loading={contratosLoading}
          />

        </div>
      )}
    </div>
  );
}
