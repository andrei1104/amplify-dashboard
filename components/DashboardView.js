"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import KpiCard from "@/components/KpiCard";
import FunnelShape from "@/components/FunnelShape";
import SdrTable from "@/components/SdrTable";
import {
  NAV_TABS, MAIN_SDRS, AGENT_META, ORIGIN_COLORS, ORIGIN_COLOR_MAP, FASES_ORDER, LOSS_PHASES,
  extractValue, getFaseColor,
} from "@/lib/config";

// ─── Fases que o Bot IA pode ter (qualquer outra → "OUTROS") ─
const IA_ALLOWED_PHASES = new Set([
  "< 2000 seguidores",
  "Em progresso",
  "Qualificado",
  "Enviar Convite",
  "Já tem agência",
  "Já tem agência (Não quer sair)",
]);

// ─── Utilitário de badge (CSS class p/ texto do badge) ───────
const getBadgeClass = (fase) => {
  const f = (fase || "").toLowerCase();
  if (f.includes("agenciado"))                                            return "agenciado";
  if (f.includes("progresso"))                                            return "progresso";
  if (f.includes("qualificado"))                                          return "qualificado";
  if (f === "enviar convite" || f === "enviar convite (atendido)")        return "convite";
  if (f.includes("convite enviado"))                                      return "convite-enviado";
  if (f.includes("convite aceito"))                                       return "convite-aceito";
  if (f.includes("não resp") || f.includes("sem interesse") ||
      f.includes("agência")  || f.includes("agenda"))                     return "rejeitado";
  if (f.includes("2000"))                                                 return "sem-seguidores";
  return "";
};

// ─── API period por filterType ───────────────────────────────
const PERIOD_MAP = { day: "day", week: "week", month: "month" };

// ─── Timezone offset do browser (ex: "-03:00" para Brasil UTC-3) ──────────────
function getBrowserTz() {
  const off = new Date().getTimezoneOffset(); // minutos atrás de UTC (positivo = oeste)
  const abs  = Math.abs(off);
  const sign = off <= 0 ? "+" : "-";
  const hh   = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm   = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

// ─── Componente ───────────────────────────────────────────────
export default function DashboardView({ filterType = "day", title, subtitle }) {
  const pathname = usePathname();

  const [data,         setData]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [activeOrigins,setActiveOrigins]= useState([]);
  const [activeSdrs,   setActiveSdrs]   = useState([]); // [] = todos
  const [gastosTotal,     setGastosTotal]     = useState(null); // para CPL do dia
  const [lastWeekData,    setLastWeekData]    = useState([]);   // mesmo dia da semana passada

  const todayObj = new Date();
  const todayString = [
    todayObj.getFullYear(),
    String(todayObj.getMonth() + 1).padStart(2, "0"),
    String(todayObj.getDate()).padStart(2, "0"),
  ].join("-");

  const [selectedDate, setSelectedDate] = useState(todayString);
  const dateRef = useRef(selectedDate);

  // Mesmo dia da semana passada (−7 dias)
  const lastWeekDate = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 7);
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
  }, [selectedDate]);

  // ─── Fetch ─────────────────────────────────────────────────
  const fetchData = async (dateToFetch) => {
    try {
      setLoading(true);
      const target = dateToFetch || dateRef.current;
      const period = PERIOD_MAP[filterType] || "day";
      const tz = getBrowserTz();
      const response = await fetch(`/api/notion?date=${target}&period=${period}&tz=${encodeURIComponent(tz)}`);

      if (!response.ok) throw new Error("Falha ao comunicar com a API interna.");
      const json = await response.json();
      if (json.error) throw new Error(json.error);

      setData(json.data || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dateRef.current = selectedDate;
    fetchData(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filterType]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(dateRef.current), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  // Busca custo mensal para calcular CPL do dia (só na view "Hoje")
  // Usa lógica de prorrateio: mensais divididos por dias do mês, pontuais só na data exata.
  useEffect(() => {
    if (filterType !== "day") return;
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, "0");
    const monthFrom = `${y}-${m}-01`;
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const monthTo  = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    fetch(`/api/gastos?from=${monthFrom}&to=${monthTo}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          // Calcula o custo efetivo de 1 dia (selectedDate)
          const dayTarget = dateRef.current;
          const dailyCost = json.data.reduce((acc, item) => {
            const valor       = item.properties?.["Valor (R$)"]?.number || 0;
            const recorrencia = item.properties?.["Recorrência"]?.select?.name || "";
            const competencia = item.properties?.["Competência"]?.date?.start || "";
            const dataCobranca= item.properties?.["Data cobrança"]?.date?.start || "";

            if (recorrencia === "Mensal" && competencia) {
              // Prorrateio: valor / dias do mês
              const compDate    = new Date(competencia.slice(0, 7) + "-01T12:00:00");
              const daysInComp  = new Date(compDate.getFullYear(), compDate.getMonth() + 1, 0).getDate();
              return acc + (valor / daysInComp);
            }
            if (recorrencia === "Pontual") {
              // Só inclui se a data de cobrança é exatamente o dia selecionado
              const chargeDate = (dataCobranca || competencia || "").slice(0, 10);
              return chargeDate === dayTarget ? acc + valor : acc;
            }
            // Fallback: divide pelo mês inteiro
            return acc + (valor / lastDay);
          }, 0);
          setGastosTotal(dailyCost);
        }
      })
      .catch(() => {}); // silencioso — CPL é opcional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, selectedDate]);

  // ─── Fetch do mesmo dia da semana passada (só na view "day") ──
  useEffect(() => {
    if (filterType !== "day" || !lastWeekDate) return;
    const tz = getBrowserTz();
    fetch(`/api/notion?date=${lastWeekDate}&period=day&tz=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then(json => { if (!json.error) setLastWeekData(json.data || []); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastWeekDate, filterType]);

  // ─── Processamento base (API já retorna campos extraídos) ───
  const allParsed = useMemo(() => data.map(item => ({
    id:     item.id,
    sdr:    item.sdr    || "Desconhecido",
    fase:   item.fase   || "Desconhecido",
    origem: item.origem || "Desconhecido",
    nome:   item.nome   || "",
  })), [data]);

  // ─── Origens únicas ─────────────────────────────────────────
  const allOrigins = useMemo(() => {
    const set = new Set(allParsed.map(l => l.origem).filter(Boolean));
    return [...set].sort();
  }, [allParsed]);

  // ─── Leads filtrados por origem ─────────────────────────────
  const parsedLeads = useMemo(() => {
    if (activeOrigins.length === 0) return allParsed;
    return allParsed.filter(l => activeOrigins.includes(l.origem));
  }, [allParsed, activeOrigins]);

  // ─── Toggle origem ──────────────────────────────────────────
  const toggleOrigin = (origin) => {
    setActiveOrigins(prev =>
      prev.includes(origin)
        ? prev.filter(o => o !== origin)
        : [...prev, origin]
    );
  };

  // ─── Toggle SDR (multi-select) ───────────────────────────────
  const toggleSdr = (sdr) => {
    setActiveSdrs(prev =>
      prev.includes(sdr)
        ? prev.filter(s => s !== sdr)
        : [...prev, sdr]
    );
  };

  // ─── Agregação ──────────────────────────────────────────────
  const mainLeads = parsedLeads.filter(l =>
    MAIN_SDRS.includes(l.sdr) &&
    (activeSdrs.length === 0 || activeSdrs.includes(l.sdr))
  );

  const globalTotal = mainLeads.length;
  const agenciadosTotal = mainLeads.filter(l => l.fase === "Agenciado").length;
  const conviteAceitoTotal = mainLeads.filter(l => l.fase === "Convite Aceito").length;
  // Taxa de conversão = Agenciado + Convite Aceito (ambos são conversões)
  const convertedTotal = agenciadosTotal + conviteAceitoTotal;
  const qualifTotal = mainLeads.filter(l =>
    l.fase === "Qualificado" || l.fase === "Qualificado (Atendido)"
  ).length;
  const enviarConviteTotal = mainLeads.filter(l =>
    l.fase === "Enviar Convite" || l.fase === "Enviar Convite (Atendido)"
  ).length;
  const globalConvRate = globalTotal > 0
    ? ((convertedTotal / globalTotal) * 100).toFixed(1)
    : "0.0";

  const phaseData = useMemo(() => {
    const obj = {};
    mainLeads.forEach(l => { obj[l.fase] = (obj[l.fase] || 0) + 1; });
    return obj;
  }, [mainLeads]);

  // Mapa por SDR
  const sdrMap = useMemo(() => {
    const map = {};
    MAIN_SDRS.forEach(sdr => {
      map[sdr] = { total: 0, fases: {} };
      FASES_ORDER.forEach(f => { map[sdr].fases[f] = 0; });
    });
    mainLeads.forEach(({ sdr, fase }) => {
      map[sdr].total += 1;
      map[sdr].fases[fase] = (map[sdr].fases[fase] || 0) + 1;
    });
    return map;
  }, [mainLeads]);

  const sdrStats = MAIN_SDRS.map(sdr => {
    const m = sdrMap[sdr];
    const descartados = LOSS_PHASES.reduce((acc, f) => acc + (m.fases[f] || 0), 0);
    return {
      name: sdr,
      total: m.total,
      agenciados: m.fases["Agenciado"] || 0,
      qualificados: (m.fases["Qualificado"] || 0) + (m.fases["Qualificado (Atendido)"] || 0),
      enviarConvite: (m.fases["Enviar Convite"] || 0) + (m.fases["Enviar Convite (Atendido)"] || 0),
      conviteEnviado: m.fases["Convite Enviado"] || 0,
      conviteAceito: m.fases["Convite Aceito"] || 0,
      descartados,
    };
  });

  const maxTotal = Math.max(1, ...sdrStats.map(s => s.total));

  // ─── Mapa da semana passada por SDR (com todas as fases) ─────
  const lastWeekSdrMap = useMemo(() => {
    const map = {};
    MAIN_SDRS.forEach(sdr => { map[sdr] = { total: 0, agenciados: 0, conviteAceito: 0, fases: {} }; });
    lastWeekData.forEach(item => {
      const sdr  = item.sdr  || "Desconhecido";
      const fase = item.fase || "Desconhecido";
      if (!MAIN_SDRS.includes(sdr)) return;
      map[sdr].total++;
      map[sdr].fases[fase] = (map[sdr].fases[fase] || 0) + 1;
      if (fase === "Agenciado")      map[sdr].agenciados++;
      if (fase === "Convite Aceito") map[sdr].conviteAceito++;
    });
    return map;
  }, [lastWeekData]);

  // Separa IA dos SDRs humanos
  const AI_SDRS    = MAIN_SDRS.filter(s =>  AGENT_META[s]?.isAI);
  const HUMAN_SDRS = MAIN_SDRS.filter(s => !AGENT_META[s]?.isAI);

  // ─── Leads do Bot IA com fase fora do permitido → "OUTROS" ──
  const outrosFases = useMemo(() => {
    const map = {};
    AI_SDRS.forEach(sdr => {
      Object.entries(sdrMap[sdr]?.fases || {}).forEach(([fase, qtd]) => {
        if (qtd > 0 && !IA_ALLOWED_PHASES.has(fase)) {
          map[fase] = (map[fase] || 0) + qtd;
        }
      });
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdrMap]);

  const outrosTotal = Object.values(outrosFases).reduce((a, b) => a + b, 0);

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto pb-16">

      {/* ── Navegação entre páginas ── */}
      <nav className="dash-nav">
        {NAV_TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`dash-nav__link ${pathname === tab.href ? "dash-nav__link--active" : ""}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-fade-in">
        <div>
          <h1 className="dash-title">{title}</h1>
          <p className="mt-1" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="live-dot" />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Ao vivo</span>
          </div>

          {filterType === "day" && (
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="date-input"
            />
          )}

          <button
            onClick={() => fetchData(selectedDate)}
            className={`refresh-btn ${loading ? "spinning" : ""}`}
          >
            <svg
              className="spin-icon"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Atualizar
          </button>

          {lastUpdated && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: "50vh" }}>
          <div className="loading-spinner" />
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {filterType === "week" ? "Buscando histórico da semana…" :
              filterType === "month" ? "Buscando dados do mês inteiro…" :
                "Carregando dados…"}
          </p>
        </div>
      ) : error ? (
        <div className="glass-panel p-6" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
          <p style={{ color: "#fca5a5", fontWeight: 600, marginBottom: "0.5rem" }}>⚠ Erro de conexão</p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{error}</p>
        </div>
      ) : (
        <>
          {/* ── Filtros: SDR + Origem ── */}
          <div className="glass-panel p-4 mb-6 flex flex-col gap-3 animate-fade-in-delay">

            {/* Filtro de SDR */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="origin-filter__label">SDR:</span>
              <button
                className={`origin-chip ${activeSdrs.length === 0 ? "origin-chip--active" : ""}`}
                onClick={() => setActiveSdrs([])}
              >
                Todos
                <span style={{ marginLeft: "2px", fontWeight: 700, fontSize: "0.7rem" }}>
                  ({allParsed.filter(l => MAIN_SDRS.includes(l.sdr)).length})
                </span>
              </button>
              {MAIN_SDRS.map(sdr => {
                const meta    = AGENT_META[sdr];
                const color   = meta?.accentColor || "#7c3aed";
                const isActive = activeSdrs.includes(sdr);
                const count   = allParsed.filter(l => l.sdr === sdr).length;
                return (
                  <button
                    key={sdr}
                    className={`origin-chip ${isActive ? "origin-chip--active" : ""}`}
                    onClick={() => toggleSdr(sdr)}
                    style={isActive ? { borderColor: color + "80", color } : {}}
                  >
                    {meta?.isAI ? "🤖 " : ""}{meta?.displayName || sdr}
                    <span style={{ marginLeft: "2px", fontWeight: 700, fontSize: "0.7rem" }}>({count})</span>
                  </button>
                );
              })}
              {activeSdrs.length > 0 && (
                <span className="period-badge">
                  {activeSdrs.map(s => AGENT_META[s]?.displayName || s).join(", ")}
                </span>
              )}
            </div>

            {/* Filtro de Origem */}
            {allOrigins.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="origin-filter__label">Origem:</span>
                <button
                  className={`origin-chip ${activeOrigins.length === 0 ? "origin-chip--active" : ""}`}
                  onClick={() => setActiveOrigins([])}
                >
                  Todos
                  <span style={{ marginLeft: "2px", fontWeight: 700, fontSize: "0.7rem" }}>
                    ({allParsed.filter(l => MAIN_SDRS.includes(l.sdr) && (activeSdrs.length === 0 || activeSdrs.includes(l.sdr))).length})
                  </span>
                </button>
                {allOrigins.map((origin, idx) => {
                  const color = ORIGIN_COLOR_MAP[origin] || ORIGIN_COLORS[idx % ORIGIN_COLORS.length];
                  const isActive = activeOrigins.includes(origin);
                  const count = allParsed.filter(l => MAIN_SDRS.includes(l.sdr) && l.origem === origin).length;
                  return (
                    <button
                      key={origin}
                      className={`origin-chip ${isActive ? "origin-chip--active" : ""}`}
                      onClick={() => toggleOrigin(origin)}
                      style={isActive ? { borderColor: color + "80", color } : {}}
                    >
                      <span className="origin-chip__dot" style={{ background: color }} />
                      {origin}
                      <span style={{ marginLeft: "2px", fontWeight: 700, fontSize: "0.7rem" }}>({count})</span>
                    </button>
                  );
                })}
                {activeOrigins.length > 0 && (
                  <span className="period-badge">
                    {activeOrigins.join(", ")} · {globalTotal} leads
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── KPI Cards ── */}
          <p className="section-label mb-4">Resumo do dia</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
            <KpiCard
              label="Leads Atendidos Hoje"
              value={globalTotal}
              sub={`${MAIN_SDRS.filter(s => !AGENT_META[s]?.isAI).length} SDRs ativos`}
              icon="👥" color="blue"
            />
            <KpiCard
              label="Conversões"
              value={convertedTotal}
              sub={`🏆 ${agenciadosTotal} ag. · 🤝 ${conviteAceitoTotal} convites`}
              icon="✅" color="green"
            />
            <KpiCard
              label="Taxa de Conversão"
              value={`${globalConvRate}%`}
              sub="Ag. + Conv. Aceito / Total"
              icon="📈" color="purple"
            />
            <KpiCard
              label="CPL do Dia"
              value={(() => {
                if (gastosTotal === null) return "…";
                if (convertedTotal === 0) return "—";
                // gastosTotal já é o custo diário prorateado (calculado no useEffect)
                return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(gastosTotal / convertedTotal);
              })()}
              sub="Custo amortizado / conversões hoje"
              icon="💰" color="yellow"
            />
          </div>

          {/* ── Funil & SDRs ── */}
          <p className="section-label mb-4">Funil &amp; SDRs</p>

          {/* ─ Bot IA — largura total, acima do funil ─ */}
          {AI_SDRS.length > 0 && (
            <div className="mb-4">
              <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem", fontWeight: 600 }}>
                🤖 Bot IA — Idealmente zerado (SDRs devem assumir os leads)
              </p>
              {AI_SDRS.map((sdr) => {
                const meta = AGENT_META[sdr] || { displayName: sdr, role: "Bot", isAI: true, avatarClass: "sdr-avatar--ai", accentColor: "#7c3aed" };
                const m = sdrMap[sdr];
                // Só fases permitidas para o IA
                const fasesArray = Object.entries(m.fases)
                  .filter(([fase, v]) => v > 0 && IA_ALLOWED_PHASES.has(fase))
                  .sort(([a], [b]) => {
                    const iA = FASES_ORDER.indexOf(a); const iB = FASES_ORDER.indexOf(b);
                    return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
                  });
                const iaTotal = fasesArray.reduce((acc, [, v]) => acc + v, 0);
                return (
                  <div key={sdr} className="glass-panel glass-panel--ai p-5 animate-fade-in-delay">
                    {/* Cabeçalho */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`sdr-avatar ${meta.avatarClass}`}>🤖</div>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2">
                          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{meta.displayName}</p>
                          <span className="ai-badge">IA</span>
                        </div>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{meta.role}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "1.6rem", fontWeight: 800, color: iaTotal > 0 ? "#f59e0b" : "#10b981", letterSpacing: "-0.04em", lineHeight: 1 }}>{iaTotal}</p>
                        <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>leads pendentes</p>
                      </div>
                    </div>

                    {/* Barras verticais por fase */}
                    {fasesArray.length > 0 && (() => {
                      const maxQtd = Math.max(1, ...fasesArray.map(([, v]) => v));
                      const BAR_H  = 80;
                      return (
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", overflowX: "auto" }}>
                          {fasesArray.map(([fase, qtd]) => {
                            const pct    = iaTotal > 0 ? ((qtd / iaTotal) * 100).toFixed(0) : 0;
                            const color  = getFaseColor(fase);
                            const barH   = Math.max(6, Math.round((qtd / maxQtd) * BAR_H));
                            return (
                              <div key={fase} style={{ flex: 1, minWidth: "60px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                {/* valor + % acima da barra */}
                                <span style={{ fontSize: "0.78rem", fontWeight: 800, color }}>{qtd}</span>
                                <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{pct}%</span>
                                {/* barra */}
                                <div style={{ width: "100%", height: `${BAR_H}px`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                  <div style={{ width: "100%", height: `${barH}px`, background: color, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
                                </div>
                                {/* label abaixo */}
                                <span style={{ fontSize: "0.58rem", color, textAlign: "center", lineHeight: 1.2, marginTop: "2px", maxWidth: "72px" }}>{fase}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Visão Geral por Fase — todos os SDRs combinados ── */}
          {Object.keys(phaseData).length > 0 && (() => {
            const fasesArray = Object.entries(phaseData)
              .filter(([, v]) => v > 0)
              .sort(([a], [b]) => {
                const iA = FASES_ORDER.indexOf(a); const iB = FASES_ORDER.indexOf(b);
                return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
              });
            const totalAll = fasesArray.reduce((acc, [, v]) => acc + v, 0);
            const maxQtd   = Math.max(1, ...fasesArray.map(([, v]) => v));
            const BAR_H    = 80;
            return (
              <div className="glass-panel p-5 mb-4 animate-fade-in-delay">
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      📊 Visão Geral por Fase
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Todos os SDRs combinados · {totalAll} leads
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", overflowX: "auto" }}>
                  {fasesArray.map(([fase, qtd]) => {
                    const pct   = totalAll > 0 ? ((qtd / totalAll) * 100).toFixed(0) : 0;
                    const color = getFaseColor(fase);
                    const barH  = Math.max(6, Math.round((qtd / maxQtd) * BAR_H));
                    return (
                      <div key={fase} style={{ flex: 1, minWidth: "60px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 800, color }}>{qtd}</span>
                        <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{pct}%</span>
                        <div style={{ width: "100%", height: `${BAR_H}px`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          <div style={{ width: "100%", height: `${barH}px`, background: color, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
                        </div>
                        <span style={{ fontSize: "0.58rem", color, textAlign: "center", lineHeight: 1.2, marginTop: "2px", maxWidth: "72px" }}>{fase}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Funil global — só shape */}
            <FunnelShape
              phaseData={phaseData}
              totalLeads={globalTotal}
              title="Funil Global de Conversão"
            />

            {/* Coluna direita: só SDRs humanos */}
            <div className="flex flex-col gap-4">

              {/* ─ SDRs humanos ─ */}
              <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                👤 SDRs
              </p>
              {HUMAN_SDRS.map((sdr, idx) => {
                const meta = AGENT_META[sdr] || { displayName: sdr, role: "SDR", isAI: false, avatarClass: "sdr-avatar--default", accentColor: "#64748b" };
                const m  = sdrMap[sdr];
                const lw = filterType === "day" ? (lastWeekSdrMap[sdr] || { total: 0, agenciados: 0, conviteAceito: 0, fases: {} }) : null;

                const rate   = m.total > 0 ? (((m.fases["Agenciado"]||0)+(m.fases["Convite Aceito"]||0))/m.total*100).toFixed(1) : "0.0";
                const lwRate = lw && lw.total > 0 ? (((lw.fases["Agenciado"]||0)+(lw.fases["Convite Aceito"]||0))/lw.total*100).toFixed(1) : "0.0";

                // União de fases presentes em qualquer um dos dois períodos
                const allFases = FASES_ORDER.filter(f =>
                  (m.fases[f] || 0) > 0 || (lw?.fases[f] || 0) > 0
                );
                const maxQtd = Math.max(1, ...allFases.flatMap(f => [m.fases[f]||0, lw?.fases[f]||0]));

                // Componente de coluna de funil
                const FunnelCol = ({ data, total, label, dateStr, isToday }) => {
                  const converted = (data.fases["Agenciado"]||0) + (data.fases["Convite Aceito"]||0);
                  const convRate  = total > 0 ? ((converted/total)*100).toFixed(1) : "0.0";
                  return (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0" }}>
                      {/* Cabeçalho da coluna */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: isToday ? "var(--text-primary)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {label}
                          {dateStr && <span style={{ fontWeight: 400, marginLeft: "4px" }}>({dateStr})</span>}
                        </span>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: isToday ? "var(--text-primary)" : "var(--text-muted)", letterSpacing: "-0.03em" }}>
                          {total}
                          <span style={{ fontSize: "0.62rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "3px" }}>leads</span>
                        </span>
                      </div>
                      {/* Fases */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {allFases.map(fase => {
                          const qtd   = data.fases[fase] || 0;
                          const pct   = total > 0 ? ((qtd/total)*100).toFixed(1) : 0;
                          const color = getFaseColor(fase);
                          const bc    = getBadgeClass(fase);
                          const barW  = maxQtd > 0 ? (qtd/maxQtd)*100 : 0;
                          return (
                            <div key={fase}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                                <span className={`status-badge ${bc}`} style={{ borderColor: `${color}55`, color, fontSize: "0.6rem", padding: "1px 6px" }}>
                                  {fase}
                                </span>
                                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: qtd > 0 ? "var(--text-secondary)" : "var(--text-muted)" }}>
                                  {qtd} <span style={{ color: "var(--text-muted)", fontSize: "0.62rem" }}>({pct}%)</span>
                                </span>
                              </div>
                              <div className="progress-bar-container">
                                <div className="progress-bar-fill" style={{ width: `${barW}%`, backgroundColor: color, opacity: isToday ? 1 : 0.5 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Taxa */}
                      <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Taxa (Ag. + Conv. Aceito)</span>
                        <span className={`conv-badge ${parseFloat(convRate) >= 15 ? "conv-badge--high" : parseFloat(convRate) >= 7 ? "conv-badge--mid" : parseFloat(convRate) > 0 ? "conv-badge--low" : "conv-badge--zero"}`}
                          style={{ opacity: isToday ? 1 : 0.7 }}>
                          {convRate}%
                        </span>
                      </div>
                    </div>
                  );
                };

                return (
                  <div
                    key={sdr}
                    className={`glass-panel p-5 flex flex-col gap-4 animate-fade-in-delay${meta.isAI ? " glass-panel--ai" : ""}`}
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    {/* Cabeçalho SDR */}
                    <div className="flex items-center gap-3">
                      <div className={`sdr-avatar ${meta.avatarClass}`}>
                        {meta.isAI ? "🤖" : meta.displayName.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{meta.displayName}</p>
                          {meta.isAI && <span className="ai-badge">IA</span>}
                        </div>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{meta.role}</p>
                      </div>
                    </div>

                    {/* Dois funneis lado a lado */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <FunnelCol
                        data={m} total={m.total}
                        label="Hoje" dateStr={selectedDate.slice(5).replace("-","/")}
                        isToday={true}
                      />
                      {lw && (
                        <>
                          <div style={{ width: "1px", background: "rgba(255,255,255,0.07)", alignSelf: "stretch" }} />
                          <FunnelCol
                            data={lw} total={lw.total}
                            label="Sem. passada" dateStr={lastWeekDate?.slice(5).replace("-","/")}
                            isToday={false}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ─ OUTROS: leads IA com fases fora do permitido ─ */}
              {outrosTotal > 0 && (() => {
                const outrosFasesArray = Object.entries(outrosFases)
                  .filter(([, v]) => v > 0)
                  .sort(([a], [b]) => {
                    const iA = FASES_ORDER.indexOf(a); const iB = FASES_ORDER.indexOf(b);
                    return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
                  });
                const outrosConverted = (outrosFases["Agenciado"] || 0) + (outrosFases["Convite Aceito"] || 0);
                const outrosRate = outrosTotal > 0 ? ((outrosConverted / outrosTotal) * 100).toFixed(1) : "0.0";
                return (
                  <div className="glass-panel p-5 flex flex-col gap-4 animate-fade-in-delay"
                    style={{ borderTop: "2px solid rgba(148,163,184,0.3)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="sdr-avatar" style={{ background: "rgba(100,116,139,0.2)", color: "#94a3b8", fontSize: "1rem", fontWeight: 700 }}>
                          ?
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>OUTROS</p>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Leads IA atendidos por humanos</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>{outrosTotal}</p>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>leads</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {outrosFasesArray.map(([fase, qtd]) => {
                        const pct   = outrosTotal > 0 ? ((qtd / outrosTotal) * 100).toFixed(1) : 0;
                        const color = getFaseColor(fase);
                        const bc    = getBadgeClass(fase);
                        return (
                          <div key={fase} className="space-y-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`status-badge ${bc}`} style={{ borderColor: `${color}55`, color }}>
                                {fase}
                              </span>
                              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                {qtd} <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>({pct}%)</span>
                              </span>
                            </div>
                            <div className="progress-bar-container">
                              <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {outrosConverted > 0 && (
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Taxa (Ag. + Conv. Aceito)</span>
                        <span className={`conv-badge ${parseFloat(outrosRate) >= 15 ? "conv-badge--high" : parseFloat(outrosRate) >= 7 ? "conv-badge--mid" : "conv-badge--low"}`}>
                          {outrosRate}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>  {/* fim coluna de cards */}
          </div>    {/* fim grid funil+cards */}

          {/* ── SDR Table ── */}
          <SdrTable sdrStats={sdrStats} maxTotal={maxTotal} />

          {/* ── Rodapé ── */}
          <p className="mt-10 pt-6 text-center" style={{ fontSize: "0.72rem", color: "var(--text-muted)", borderTop: "1px solid var(--glass-border)" }}>
            Amplify TikTok Shop · Dados em tempo real via Notion
            {lastUpdated && ` · Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR")}`}
            {activeOrigins.length > 0 && ` · Filtro: ${activeOrigins.join(", ")}`}
          </p>
        </>
      )}
    </div>
  );
}
