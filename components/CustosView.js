"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link        from "next/link";
import { usePathname } from "next/navigation";
import {
  NAV_TABS, isConverted, toLocalDate, extractProp,
} from "@/lib/config";

// ─── Senha de acesso ─────────────────────────────────────────
const ACCESS_PASSWORD = "amplifygestão123";
const SESSION_KEY     = "amplify_custos_auth";

// ─── Cores por item (rotação) ────────────────────────────────
const PALETTE = [
  "#7c3aed","#3b82f6","#10b981","#f59e0b",
  "#ec4899","#22d3ee","#f97316","#a78bfa",
  "#6366f1","#14b8a6","#84cc16","#e879f9",
];

// ─── Helpers ─────────────────────────────────────────────────
const fmtBRL = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

/**
 * Retorna o valor efetivo de um gasto dentro do período [from, to] (strings "YYYY-MM-DD").
 * - Mensal: prorratea valor pelo nº de dias do mês que caem dentro do período.
 * - Pontual: inclui o valor integral somente se "dataCobranca" (ou competência) estiver no período.
 */
function calcGastoEfetivo(g, from, to) {
  if (g.recorrencia === "Mensal" && g.competencia) {
    const compDate    = new Date(g.competencia.slice(0, 7) + "-01T12:00:00");
    const daysInMonth = new Date(compDate.getFullYear(), compDate.getMonth() + 1, 0).getDate();
    const mesStart    = g.competencia.slice(0, 7) + "-01";
    const mesEnd      = compDate.getFullYear() + "-" +
                        String(compDate.getMonth() + 1).padStart(2, "0") + "-" +
                        String(daysInMonth).padStart(2, "0");
    const overlapFrom = from > mesStart ? from : mesStart;
    const overlapTo   = to   < mesEnd   ? to   : mesEnd;
    if (overlapFrom > overlapTo) return 0;
    const d1          = new Date(overlapFrom + "T12:00:00");
    const d2          = new Date(overlapTo   + "T12:00:00");
    const overlapDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return (g.valor / daysInMonth) * overlapDays;
  }
  if (g.recorrencia === "Pontual") {
    const chargeDate = (g.dataCobranca || g.competencia || "").slice(0, 10);
    return chargeDate >= from && chargeDate <= to ? g.valor : 0;
  }
  return g.valor; // fallback: inclui integralmente
}

// toLocalDate e extractProp importados de @/lib/config

const tipoBadgeClass = (tipo) => {
  if (!tipo) return "tipo-badge--outro";
  const t = tipo.toLowerCase();
  if (t.includes("salário") || t.includes("salario") || t.includes("folha")) return "tipo-badge--salario";
  if (t.includes("software"))                                                  return "tipo-badge--software";
  if (t.includes("infra") || t.includes("ia"))                                return "tipo-badge--infra";
  return "tipo-badge--outro";
};

const statusClass = (s) => {
  if (!s) return "status-pagamento--open";
  if (s.toLowerCase() === "paid") return "status-pagamento--paid";
  if (s.toLowerCase() === "void") return "status-pagamento--void";
  return "status-pagamento--open";
};

// ─── Componente principal ────────────────────────────────────
export default function CustosView() {
  const pathname = usePathname();

  // Auth
  const [unlocked, setUnlocked] = useState(false);
  const [pw,       setPw]       = useState("");
  const [pwError,  setPwError]  = useState(false);

  // Data
  const [gastos,      setGastos]      = useState([]);
  const [leads,       setLeads]       = useState([]);      // leads do período (primeiro contato dentro do range)
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filtros de data — padrão: 1º dia do mês atual até hoje
  const today     = useMemo(() => toLocalDate(new Date()), []);
  const firstOfMonth = useMemo(() => {
    const d = new Date();
    return toLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo,   setDateTo]   = useState(today);

  // Filtros de categoria/provedor/origem
  const [filterTipo,     setFilterTipo]     = useState("Todos");
  const [filterProvedor, setFilterProvedor] = useState("Todos");
  const [filterOrigem,   setFilterOrigem]   = useState("Todos");

  // ── Auth ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") setUnlocked(true);
    } catch (_) {}
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === ACCESS_PASSWORD) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (_) {}
      setUnlocked(true);
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 1000);
    }
  };

  // Gastos: sempre busca o mês completo para poder amortizar por dia corretamente.
  // Competências mensais (ex: "2026-03-01") nunca seriam retornadas se filtrarmos
  // só pelos dias selecionados (ex: 28-31).
  const gastosFullFrom = useMemo(() => {
    const d = new Date(dateFrom + "T12:00:00");
    return toLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [dateFrom]);
  const gastosFullTo = useMemo(() => {
    const d = new Date(dateTo + "T12:00:00");
    return toLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }, [dateTo]);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchDashboardData = async () => {
    if (!unlocked) return;
    setLoading(true);
    setError(null);
    try {
      const leadsParams = `from=${dateFrom}&to=${dateTo}`;
      // Timezone do browser para filtro correto de datas no Notion
      const off = new Date().getTimezoneOffset();
      const abs = Math.abs(off);
      const tz  = `${off <= 0 ? "+" : "-"}${String(Math.floor(abs/60)).padStart(2,"0")}:${String(abs%60).padStart(2,"0")}`;

      // 2 fetches em paralelo:
      // - gastos do MÊS COMPLETO (não apenas o range selecionado)
      // - leads cujo primeiro contato está dentro do período selecionado
      const [gastosRes, leadsRes] = await Promise.all([
        fetch(`/api/gastos?from=${gastosFullFrom}&to=${gastosFullTo}`),
        fetch(`/api/notion?${leadsParams}&dateField=${encodeURIComponent("Data do Primeiro contato")}&tz=${encodeURIComponent(tz)}`),
      ]);

      const gastosJson = await gastosRes.json();
      const leadsJson  = await leadsRes.json();

      if (gastosJson.error) throw new Error(gastosJson.error);
      setGastos(gastosJson.data || []);
      setLeads(leadsJson.data   || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [unlocked, dateFrom, dateTo]);

  // ── Processamento de gastos ───────────────────────────────
  const parsedGastos = useMemo(() => gastos.map(item => ({
    id:         item.id,
    name:       extractProp(item.properties["Name"])             || "Sem nome",
    tipo:       extractProp(item.properties["Tipo"])             || "Outro",
    provedor:   extractProp(item.properties["Provedor"])         || "Outro",
    valor:       extractProp(item.properties["Valor (R$)"])       || 0,
    recorrencia: extractProp(item.properties["Recorrência"])      || "",
    status:      extractProp(item.properties["Status pagamento"]) || "Open",
    fonte:       extractProp(item.properties["Fonte"])            || "",
    competencia: extractProp(item.properties["Competência"])      || "",
    dataCobranca:extractProp(item.properties["Data cobrança"])    || "",
    obs:         extractProp(item.properties["Observações"])      || "",
  })), [gastos]);

  // ── Processamento de leads (API retorna campos extraídos) ────
  const parseLeadItem = (item) => ({
    id:     item.id,
    fase:   item.fase   || "",
    origem: item.origem || "Sem origem",
    date:   item.date   || null,
  });

  const parsedLeads    = useMemo(() => leads.map(parseLeadItem),    [leads]);
  // Origens disponíveis (da base de leads do período)
  const allOrigens = useMemo(() =>
    [...new Set(parsedLeads.map(l => l.origem))].filter(Boolean).sort(),
  [parsedLeads]);

  // Filtros de gastos
  const allTipos     = useMemo(() => [...new Set(parsedGastos.map(g => g.tipo))].sort(),     [parsedGastos]);
  const allProvedores = useMemo(() => [...new Set(parsedGastos.map(g => g.provedor))].sort(), [parsedGastos]);

  const filteredGastos = useMemo(() => parsedGastos.filter(g => {
    if (filterTipo     !== "Todos" && g.tipo     !== filterTipo)     return false;
    if (filterProvedor !== "Todos" && g.provedor !== filterProvedor) return false;
    return true;
  }), [parsedGastos, filterTipo, filterProvedor]);

  // Leads filtrados por origem
  const filteredLeads = useMemo(() => parsedLeads.filter(l => {
    if (filterOrigem !== "Todos" && l.origem !== filterOrigem) return false;
    return true;
  }), [parsedLeads, filterOrigem]);

  // KPIs — totalGasto usa valor efetivo por período (mensais prorateados, pontuais só se na data)
  const totalGasto = useMemo(() =>
    filteredGastos.reduce((acc, g) => acc + calcGastoEfetivo(g, dateFrom, dateTo), 0),
  [filteredGastos, dateFrom, dateTo]);

  const totalLeads = filteredLeads.length;

  // Conversões: leads do período (primeiro contato no range) que já foram convertidos
  const convertedLeads  = filteredLeads.filter(l => isConverted(l.fase));
  const totalConverted  = convertedLeads.length;
  const totalAgenciado  = filteredLeads.filter(l => l.fase === "Agenciado").length;
  const totalAllLeads   = filteredLeads.length;

  // CPL = custo efetivo do período ÷ total de leads captados no período
  const custoPorLead = totalLeads > 0 ? totalGasto / totalLeads : 0;

  // Breakdown para a barra visual (valores efetivos, sem itens zerados)
  const barItems = useMemo(() => {
    const grouped = {};
    filteredGastos.forEach(g => {
      const ef  = calcGastoEfetivo(g, dateFrom, dateTo);
      if (ef <= 0) return;
      const key = g.provedor && g.provedor !== "Outro" ? g.provedor : g.name;
      grouped[key] = (grouped[key] || 0) + ef;
    });
    return Object.entries(grouped)
      .map(([name, valor]) => ({ name, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [filteredGastos, dateFrom, dateTo]);

  // Breakdown por Tipo (valores efetivos)
  const byTipo = useMemo(() => {
    const map = {};
    filteredGastos.forEach(g => {
      const ef = calcGastoEfetivo(g, dateFrom, dateTo);
      if (ef <= 0) return;
      map[g.tipo] = (map[g.tipo] || 0) + ef;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredGastos, dateFrom, dateTo]);


  // ── Tela de senha ─────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="p-4 md:p-8 max-w-screen-2xl mx-auto pb-16">
        <nav className="dash-nav">
          {NAV_TABS.map(tab => (
            <Link key={tab.href} href={tab.href}
              className={`dash-nav__link ${pathname === tab.href ? "dash-nav__link--active" : ""}`}>
              <span>{tab.icon}</span>{tab.label}
            </Link>
          ))}
        </nav>

        <div className="auth-gate">
          <form className="auth-card" onSubmit={handleLogin}>
            <div className="auth-icon">🔒</div>
            <p className="auth-title">Área Restrita<br/>
              <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--text-muted)" }}>
                Financeiro · Amplify
              </span>
            </p>
            <input
              type="password"
              className={`auth-input${pwError ? " auth-input--error" : ""}`}
              placeholder="Digite a senha"
              value={pw}
              onChange={e => setPw(e.target.value)}
              autoFocus
            />
            {pwError && <p className="auth-error">Senha incorreta. Tente novamente.</p>}
            <button type="submit" className="auth-btn">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard de custos ───────────────────────────────────
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
          <h1 className="dash-title">Custos & Financeiro</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Custo por lead e breakdown de gastos por período
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="live-dot" />

          {/* Date range picker */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "0.6rem", padding: "0.35rem 0.75rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.04em" }}>DE</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "0.82rem", cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.04em", marginLeft: "0.4rem" }}>ATÉ</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "0.82rem", cursor: "pointer" }}
            />
          </div>

          <button onClick={fetchDashboardData} className={`refresh-btn ${loading ? "spinning" : ""}`}>
            <svg className="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Atualizar
          </button>
          <button
            onClick={() => { try { sessionStorage.removeItem(SESSION_KEY); } catch(_){} setUnlocked(false); }}
            style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0.3rem 0.5rem" }}
          >
            🔒 Sair
          </button>
          {lastUpdated && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && gastos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: "40vh" }}>
          <div className="loading-spinner" />
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Carregando gastos…</p>
        </div>
      ) : error ? (
        <div className="glass-panel p-6" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
          <p style={{ color: "#fca5a5", fontWeight: 600 }}>⚠ {error}</p>
        </div>
      ) : (
        <>
          {/* ── Filtros ── */}
          <div className="glass-panel p-4 mb-6 flex flex-col gap-3 animate-fade-in-delay">

            {/* Tipo + Provedor */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="origin-filter__label">Gastos:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {["Todos", ...allTipos].map(t => (
                  <button key={t}
                    className={`origin-chip ${filterTipo === t ? "origin-chip--active" : ""}`}
                    onClick={() => setFilterTipo(t)}>
                    {t === "Todos" ? `Todos os tipos (${parsedGastos.length})` : t}
                  </button>
                ))}
              </div>
              <span style={{ color: "var(--glass-border)", fontSize: "1rem" }}>|</span>
              <div className="flex items-center gap-1 flex-wrap">
                {["Todos", ...allProvedores].map(p => (
                  <button key={p}
                    className={`origin-chip ${filterProvedor === p ? "origin-chip--active" : ""}`}
                    onClick={() => setFilterProvedor(p)}>
                    {p === "Todos" ? "Todos os provedores" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Origem (dos leads) */}
            {allOrigens.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="origin-filter__label">Origem:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {["Todos", ...allOrigens].map((o, idx) => (
                    <button key={o}
                      className={`origin-chip ${filterOrigem === o ? "origin-chip--active" : ""}`}
                      style={filterOrigem === o && o !== "Todos" ? { borderColor: PALETTE[(idx - 1) % PALETTE.length], background: PALETTE[(idx - 1) % PALETTE.length] + "33" } : {}}
                      onClick={() => setFilterOrigem(o)}>
                      {o === "Todos" ? `Todas as origens (${parsedLeads.length})` : o}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── KPI Cards (3 cards) ── */}
          <p className="section-label mb-4">Resumo do período</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }} className="animate-fade-in">

            {/* Custo total */}
            <div className="glass-panel p-6 flex flex-col gap-1">
              <div className="kpi-icon kpi-icon--purple" style={{ marginBottom: "0.75rem" }}>💸</div>
              <p className="kpi-label">Custo Total</p>
              <p className="kpi-value kpi-value--purple" style={{ fontSize: "1.6rem" }}>
                {fmtBRL(totalGasto)}
              </p>
              <p className="kpi-sub">{filteredGastos.length} lançamentos</p>
            </div>

            {/* Agenciados */}
            <div className="glass-panel p-6 flex flex-col gap-1">
              <div className="kpi-icon kpi-icon--cyan" style={{ marginBottom: "0.75rem" }}>🏆</div>
              <p className="kpi-label">Agenciados + Conv. Aceito</p>
              <p className="kpi-value kpi-value--cyan" style={{ fontSize: "1.6rem" }}>
                {totalConverted}
              </p>
              <p className="kpi-sub">
                de {totalAllLeads} leads totais
                {totalAllLeads > 0 && (
                  <span style={{ marginLeft: "4px", color: "var(--accent-purple)" }}>
                    ({((totalConverted / totalAllLeads) * 100).toFixed(1)}%)
                  </span>
                )}
              </p>
            </div>

            {/* CAC */}
            <div className="glass-panel p-6 flex flex-col gap-1">
              <div className="kpi-icon kpi-icon--yellow" style={{ marginBottom: "0.75rem" }}>💰</div>
              <p className="kpi-label">CAC — Custo por Conversão</p>
              <p className="kpi-value kpi-value--yellow" style={{ fontSize: "1.6rem" }}>
                {totalConverted > 0 ? fmtBRL(totalGasto / totalConverted) : "—"}
              </p>
              <p className="kpi-sub">
                {totalConverted > 0
                  ? `Custo ÷ ${totalConverted} conversões`
                  : "Sem conversões no período"}
              </p>
            </div>
          </div>

          {/* ── Barra de breakdown ── */}
          <div className="mb-4">
            <p className="section-label" style={{ marginBottom: "0.2rem" }}>Custo diluído por lead</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
              Todos os gastos do período divididos pelo total de agenciados — quanto cada fonte de custo representa por agenciado
            </p>
          </div>
          <div className="glass-panel p-6 mb-6 animate-fade-in-delay" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {barItems.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                Nenhum gasto no período selecionado.
              </p>
            ) : (
              <>
                {/* Barra segmentada — só o /lead dentro, total na legenda */}
                <div className="cost-bar" style={{ height: "52px" }}>
                  {barItems.map((item, idx) => {
                    const pct     = totalGasto > 0 ? (item.valor / totalGasto) * 100 : 0;
                    const color   = PALETTE[idx % PALETTE.length];
                    const perAgenciado = totalAgenciado > 0
                      ? fmtBRL(item.valor / totalAgenciado)
                      : "—";
                    const perLead = totalLeads > 0
                      ? fmtBRL(item.valor / totalLeads)
                      : "—";
                    return (
                      <div
                        key={item.name}
                        className="cost-bar__segment"
                        style={{ flex: pct, background: color, minWidth: "2px" }}
                        title={`${item.name}: ${fmtBRL(item.valor)} (${pct.toFixed(1)}%) · ${perAgenciado}/agenciado · ${perLead}/lead`}
                      >
                        {/* Valor por agenciado + % dentro da barra */}
                        {pct > 4 && (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            overflow: "hidden",
                            maxWidth: "100%",
                            padding: "0 4px",
                            gap: "1px",
                          }}>
                            <span style={{
                              fontSize: pct > 10 ? "0.72rem" : "0.62rem",
                              fontWeight: 800,
                              color: "#fff",
                              whiteSpace: "nowrap",
                            }}>
                              {perAgenciado}
                            </span>
                            {pct > 6 && (
                              <span style={{
                                fontSize: "0.58rem",
                                fontWeight: 500,
                                color: "rgba(255,255,255,0.7)",
                                whiteSpace: "nowrap",
                              }}>
                                ({pct.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Legenda — nome + total */}
                <div className="cost-legend">
                  {barItems.map((item, idx) => {
                    const pct = totalGasto > 0 ? ((item.valor / totalGasto) * 100).toFixed(1) : 0;
                    return (
                      <div key={item.name} className="cost-legend__item">
                        <span className="cost-legend__dot" style={{ background: PALETTE[idx % PALETTE.length] }} />
                        <span>{item.name}</span>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)", marginLeft: "2px" }}>
                          {fmtBRL(item.valor)}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Breakdown por Categoria ── */}
          <div className="glass-panel p-6 mb-6 flex flex-col gap-3">
            <p className="section-label">Por Categoria</p>
            {byTipo.map(([tipo, valor], idx) => {
              const pct = totalGasto > 0 ? (valor / totalGasto) * 100 : 0;
              return (
                <div key={tipo}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`tipo-badge ${tipoBadgeClass(tipo)}`}>{tipo}</span>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                      {fmtBRL(valor)}
                      <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.72rem", marginLeft: "4px" }}>
                        ({pct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{
                      width: `${pct}%`,
                      background: idx === 0 ? "#3b82f6" : idx === 1 ? "#8b5cf6" : idx === 2 ? "#f59e0b" : "#64748b",
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Tabela de gastos ── */}
          <p className="section-label mb-4">Lançamentos do período</p>
          <div className="glass-panel p-0 overflow-hidden animate-fade-in-delay">
            <div style={{ overflowX: "auto" }}>
              <table className="gastos-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Provedor</th>
                    <th>Recorrência</th>
                    <th style={{ textAlign: "right" }}>Valor (R$)</th>
                    <th style={{ textAlign: "right" }}>Efetivo</th>
                    <th>Competência</th>
                    <th>Status</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGastos.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        Nenhum lançamento encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredGastos.map(g => (
                      <tr key={g.id}>
                        <td style={{ fontWeight: 600, color: "var(--text-primary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {g.name}
                        </td>
                        <td><span className={`tipo-badge ${tipoBadgeClass(g.tipo)}`}>{g.tipo}</span></td>
                        <td style={{ color: "var(--text-secondary)" }}>{g.provedor}</td>
                        <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{g.recorrencia}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                          {fmtBRL(g.valor)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "var(--accent-purple, #a78bfa)", fontSize: "0.82rem" }}>
                          {(() => {
                            const ef = calcGastoEfetivo(g, dateFrom, dateTo);
                            return ef === g.valor ? "—" : fmtBRL(ef);
                          })()}
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {g.competencia ? new Date(g.competencia + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td>
                          <span className={`status-pagamento ${statusClass(g.status)}`}>
                            {g.status === "Paid" ? "✓ Pago" : g.status === "Void" ? "Void" : "Pendente"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {g.obs || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredGastos.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <td colSpan={4} style={{ fontWeight: 700, color: "var(--text-muted)", fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.75rem 0.85rem" }}>
                        Total Efetivo
                      </td>
                      <td style={{ padding: "0.75rem 0.85rem" }} />
                      <td style={{ textAlign: "right", fontWeight: 800, color: "var(--accent-purple, #a78bfa)", fontSize: "0.95rem", padding: "0.75rem 0.85rem" }}>
                        {fmtBRL(totalGasto)}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Rodapé */}
          <p className="mt-10 pt-6 text-center" style={{ fontSize: "0.72rem", color: "var(--text-muted)", borderTop: "1px solid var(--glass-border)" }}>
            Amplify TikTok Shop · Financeiro protegido
            {lastUpdated && ` · Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR")}`}
          </p>
        </>
      )}
    </div>
  );
}
