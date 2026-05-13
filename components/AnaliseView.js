"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link        from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart as ReRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  NAV_TABS, MAIN_SDRS, AGENT_META, ORIGIN_COLORS, ORIGIN_COLOR_MAP, FASES_ORDER, LOSS_PHASES,
  isConverted, toLocalDate, extractValue, extractDateProp, getFaseColor,
} from "@/lib/config";

// ─── Componente: mini funnel bar ──────────────────────────────
function MiniBar({ label, value, max, color, sub, shareLabel }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px", gap: "8px" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "nowrap" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color }}>
            {value}
            {sub && <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: "4px" }}>{sub}</span>}
          </span>
          {shareLabel && (
            <>
              <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "0.72rem" }}>|</span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{shareLabel} do total</span>
            </>
          )}
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ─── Tooltip flutuante ────────────────────────────────────────
function ChartTooltip({ tooltip }) {
  if (!tooltip) return null;
  return (
    <div style={{
      position: "fixed",
      left:      tooltip.x,
      top:       tooltip.y,
      transform: "translateX(-50%) translateY(-100%)",
      background: "rgba(10,10,25,0.97)",
      border:     "1px solid rgba(255,255,255,0.18)",
      borderRadius: "8px",
      padding:    "8px 12px",
      fontSize:   "0.73rem",
      color:      "var(--text-primary, #fff)",
      zIndex:     9999,
      pointerEvents: "none",
      boxShadow:  "0 6px 28px rgba(0,0,0,0.55)",
      minWidth:   "160px",
      whiteSpace: "pre-wrap",
    }}>
      {tooltip.lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: i < tooltip.lines.length - 1 ? "4px" : 0 }}>
          {l.dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.dot, flexShrink: 0, display: "inline-block" }} />}
          <span style={{ color: l.color || "inherit", fontWeight: l.bold ? 700 : 400 }}>{l.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Estilos compartilhados Recharts ─────────────────────────
const RC_TOOLTIP = {
  contentStyle: { background: "rgba(10,10,25,0.97)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", fontSize: "0.73rem", color: "#fff" },
  labelStyle:   { color: "rgba(255,255,255,0.6)", marginBottom: "4px", fontWeight: 600 },
  itemStyle:    { color: "#fff" },
  cursor:       { fill: "rgba(255,255,255,0.04)" },
};
const RC_AXIS  = { fill: "rgba(255,255,255,0.35)", fontSize: 10 };
const RC_GRID  = { stroke: "rgba(255,255,255,0.06)", strokeDasharray: "3 3" };

// ─── LeadsAndTrendChart: barras = agenciados por origem (clicável) + linhas ──
function LeadsAndTrendChart({ dailyData, originColors, selectedOrigem, onOriginClick }) {
  if (!dailyData.length) return <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>Sem dados no período.</p>;

  // origens presentes nos agenciados (barras)
  const allOrigins = [...new Set(dailyData.flatMap(d => Object.keys(d.byOriginAgenciados || {})))];
  const chartData  = dailyData.map(d => ({
    date:          d.date.slice(5).replace("-", "/"),
    "Total Leads": d.total,
    "Conv %":      d.total > 0 ? parseFloat(((d.converted / d.total) * 100).toFixed(1)) : null,
    _agenciados:   d.agenciados || 0,
    ...(d.byOriginAgenciados || {}),  // barras empilhadas = agenciados por origem
  }));

  // Click por Bar individual
  const makeBarClick = (originName) => () => {
    if (!onOriginClick) return;
    onOriginClick(prev => prev === originName ? "Todos" : originName);
  };

  const hasFilter = selectedOrigem && selectedOrigem !== "Todos";

  // Legendas manuais
  const legendItems = [
    ...allOrigins.map(o => ({ label: o, color: originColors[o] || "#7c3aed", type: "bar", origin: o })),
    { label: "Total Leads", color: "#38bdf8", type: "line" },
    { label: "Conv %",      color: "#c026d3", type: "pct" },
    { label: "Ag.",         color: "#10b981", type: "pct" },
  ];

  // Renderizador de label dentro das barras — só mostra se segmento ≥ 12 px de altura
  // Recharts passa { x, y, width, height, value } para o content
  const BarLabel = ({ x, y, width, height, value }) => {
    if (!value || height < 18 || width < 10) return null;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: height < 24 ? "0.52rem" : "0.6rem", fontWeight: 700, fill: "rgba(255,255,255,0.88)", pointerEvents: "none" }}
      >
        {value}
      </text>
    );
  };

  // Label no topo: Conv % (roxo) + agenciados (verde) acima da barra
  const makeTopBarLabel = (originIndex) => ({ x, y, width, height, index }) => {
    const isTopmost = allOrigins.slice(originIndex + 1).every(
      o => !(chartData[index]?.[o] > 0)
    );
    if (!isTopmost) return null;
    const ag  = chartData[index]?._agenciados;
    const tot = chartData[index]?.["Total Leads"] ?? chartData[index]?._total;
    const convPct = (ag != null && tot != null && tot > 0)
      ? `${((ag / tot) * 100).toFixed(1)}%`
      : null;
    if (!ag && !convPct) return null;
    return (
      <g>
        {convPct && (
          <text x={x + width / 2} y={y - 18} textAnchor="middle" dominantBaseline="auto"
            fill="#c026d3" stroke="rgba(0,0,0,0.8)" strokeWidth="0.4" paintOrder="stroke"
            style={{ fontSize: "0.6rem", fontWeight: 700 }}>
            {convPct}
          </text>
        )}
        {ag != null && ag > 0 && (
          <text x={x + width / 2} y={y - 4} textAnchor="middle" dominantBaseline="auto"
            fill="#10b981" stroke="rgba(0,0,0,0.85)" strokeWidth="0.5" paintOrder="stroke"
            style={{ fontSize: "0.65rem", fontWeight: 800 }}>
            {ag}
          </text>
        )}
      </g>
    );
  };

  // Renderizador de label em cima dos pontos das linhas
  const LineLabel = ({ x, y, value, color }) => {
    if (value == null) return null;
    return (
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        style={{ fontSize: "0.58rem", fontWeight: 700, fill: color }}
      >
        {value}
      </text>
    );
  };

  return (
    <>
      {/* Legenda unificada — origens são clicáveis */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
        {legendItems.map(item => {
          const isSelected = item.origin && selectedOrigem === item.origin;
          const isDimmed   = hasFilter && item.origin && !isSelected;
          return (
            <div key={item.label}
              onClick={item.origin ? makeBarClick(item.origin) : undefined}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                cursor: item.origin ? "pointer" : "default",
                opacity: isDimmed ? 0.35 : 1,
                padding: item.origin ? "3px 7px" : "3px 0",
                borderRadius: "5px",
                background: isSelected ? "rgba(255,255,255,0.07)" : "transparent",
                border: isSelected ? `1px solid ${item.color}55` : "1px solid transparent",
                transition: "all 0.15s",
              }}>
              {item.type === "bar" && (
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: item.color }} />
              )}
              {item.type === "line" && (
                <svg width="16" height="10"><line x1="0" y1="5" x2="16" y2="5" stroke={item.color} strokeWidth="2.5" /></svg>
              )}
              {item.type === "pct" && (
                <span style={{ fontSize: "0.68rem", fontWeight: 800, color: item.color }}>Aa</span>
              )}
              <span style={{ fontSize: "0.68rem", color: isSelected ? item.color : "var(--text-muted)", fontWeight: isSelected ? 700 : 400 }}>
                {item.label}
              </span>
            </div>
          );
        })}
        {hasFilter && (
          <span
            onClick={() => onOriginClick?.(() => "Todos")}
            style={{ fontSize: "0.68rem", color: "#a78bfa", cursor: "pointer", textDecoration: "underline", marginLeft: "4px" }}>
            limpar filtro
          </span>
        )}
      </div>

      {/* Gráfico único: barras = agenciados por origem (eixo esq) + linhas (eixo dir) */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 36, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid {...RC_GRID} vertical={false} />
          <XAxis dataKey="date" tick={RC_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          {/* Eixo esq: agenciados (barras) — domínio ampliado para barras ficarem no terço inferior */}
          <YAxis yAxisId="left" tick={RC_AXIS} axisLine={false} tickLine={false}
            domain={[0, dataMax => dataMax * 3]} />
          {/* Eixo escondido: total leads — escala normal para linha ir ao topo */}
          <YAxis yAxisId="leads" hide={true} domain={[0, "auto"]} />
          <Tooltip
            {...RC_TOOLTIP}
            formatter={(value, name) => name === "Conv %" ? [`${value}%`, name] : [value, name]}
            labelFormatter={label => `📅 ${label}`}
          />
          {/* Barras empilhadas por origem — altura total = agenciados do dia */}
          {allOrigins.length > 0
            ? allOrigins.map((o, i) => (
                <Bar key={o} yAxisId="left" dataKey={o} stackId="stack"
                  maxBarSize={32}
                  radius={i === allOrigins.length - 1 ? [3,3,0,0] : [0,0,0,0]}
                  onClick={makeBarClick(o)}
                  style={{ cursor: "pointer" }}
                  fillOpacity={hasFilter && selectedOrigem !== o ? 0.2 : 1}
                  fill={originColors[o] || "#7c3aed"}
                >
                  <LabelList content={BarLabel} />
                  <LabelList content={makeTopBarLabel(i)} />
                </Bar>
              ))
            : <Bar yAxisId="left" dataKey="Total Leads" stackId="stack" fill="#7c3aed" maxBarSize={32} radius={[3,3,0,0]} />
          }
          {/* Linha azul = total leads (eixo escondido — sem escala, só a linha) */}
          <Line yAxisId="leads" type="monotone" dataKey="Total Leads"
            stroke="#38bdf8" strokeWidth={2.5}
            dot={{ fill: "#38bdf8", r: 3.5, strokeWidth: 0 }}
            connectNulls={false}
          >
            <LabelList dataKey="Total Leads" position="top" content={({ x, y, value }) => <LineLabel x={x} y={y} value={value} color="#38bdf8" />} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

// ─── OriginPie: pizza de origens (clicável) ───────────────────
function OriginDonut({ origins, originColors, selectedOrigem, onOriginClick }) {
  if (!origins.length) return <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Sem dados.</p>;

  const total   = origins.reduce((a, b) => a + b.count, 0);
  const pieData = origins.map(o => ({ name: o.name, value: o.count, rate: o.rate }));

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="#fff" fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>;
  };

  const handleClick = (data) => {
    if (!onOriginClick) return;
    onOriginClick(prev => prev === data.name ? "Todos" : data.name);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
              labelLine={false} label={renderLabel} cursor="pointer" onClick={handleClick}>
              {pieData.map((entry, i) => (
                <Cell key={i}
                  fill={originColors[entry.name] || "#7c3aed"}
                  stroke={selectedOrigem === entry.name ? "#fff" : "rgba(0,0,0,0.3)"}
                  strokeWidth={selectedOrigem === entry.name ? 2 : 1}
                  opacity={selectedOrigem && selectedOrigem !== "Todos" && selectedOrigem !== entry.name ? 0.35 : 1}
                />
              ))}
            </Pie>
            <Tooltip {...RC_TOOLTIP} formatter={(value, name) => [value, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {selectedOrigem && selectedOrigem !== "Todos" && (
        <span style={{ fontSize: "0.68rem", color: "#a78bfa", cursor: "pointer", textDecoration: "underline" }}
          onClick={() => onOriginClick?.(() => "Todos")}>
          limpar filtro
        </span>
      )}
    </div>
  );
}

// ─── SdrConversionChart (clicável) ───────────────────────────
function SdrConversionChart({ sdrStats, meta, selectedSdr, onSdrClick }) {
  const humanStats = sdrStats.filter(s => !meta[s.name]?.isAI);
  if (humanStats.every(s => s.total === 0)) return <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "1rem 0" }}>Sem dados no período.</p>;

  const chartData = humanStats.map(s => ({
    name:        meta[s.name]?.displayName || s.name,
    rawName:     s.name,
    Leads:       s.total,
    Convertidos: s.converted,
    color:       meta[s.name]?.color || "#7c3aed",
  }));

  const handleClick = (data) => {
    if (!onSdrClick || !data?.activePayload?.[0]) return;
    const raw = data.activePayload[0].payload.rawName;
    onSdrClick(prev => prev.includes(raw) ? prev.filter(s => s !== raw) : [...prev, raw]);
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }} onClick={handleClick} style={{ cursor: "pointer" }}>
          <CartesianGrid {...RC_GRID} vertical={false} />
          <XAxis dataKey="name" tick={RC_AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={RC_AXIS} axisLine={false} tickLine={false} />
          <Tooltip {...RC_TOOLTIP} />
          <Legend
            wrapperStyle={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}
            formatter={(value) => <span style={{ color: "rgba(255,255,255,0.55)" }}>{value}</span>}
          />
          {/* fill no Bar define a cor do ícone na legenda; Cell sobrescreve o fill real */}
          <Bar dataKey="Leads" fill="#64748b" maxBarSize={36} radius={[3,3,0,0]}>
            {chartData.map((e, i) => (
              <Cell key={i} fill={e.color} fillOpacity={selectedSdr.length > 0 && !selectedSdr.includes(e.rawName) ? 0.15 : 0.4} />
            ))}
          </Bar>
          <Bar dataKey="Convertidos" fill="#10b981" maxBarSize={36} radius={[3,3,0,0]}>
            {chartData.map((e, i) => (
              <Cell key={i} fill={e.color} fillOpacity={selectedSdr.length > 0 && !selectedSdr.includes(e.rawName) ? 0.2 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {selectedSdr.length > 0 && (
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
          Filtrado: {selectedSdr.map(s => (
            <strong key={s} style={{ color: meta[s]?.color || "#a78bfa", marginRight: "6px" }}>{meta[s]?.displayName || s}</strong>
          ))}
          {" · "}<span style={{ cursor: "pointer", color: "#a78bfa", textDecoration: "underline" }} onClick={() => onSdrClick?.([])}>limpar</span>
        </p>
      )}
    </>
  );
}

// ─── LeadsAndTrendBySdrChart: mesma estrutura do por-origem, mas barras = SDR ──
// filterSdr: quando definido, filtra dados para um único SDR (usa dailyBySdr para leads/conv por SDR)
function LeadsAndTrendBySdrChart({ dailyData, agentMeta, humanSdrs, filterSdr, dailyBySdr }) {
  if (!dailyData.length) return <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>Sem dados no período.</p>;

  // SDRs que aparecem nos agenciados do período
  const activeSdrs = filterSdr
    ? [filterSdr]
    : humanSdrs.filter(sdr => dailyData.some(d => (d.bySdrAgenciados || {})[sdr] > 0));
  // fallback: todos os humanos se nenhum agenciado
  const sdrs = activeSdrs.length ? activeSdrs : (filterSdr ? [filterSdr] : humanSdrs);

  // Quando filterSdr definido: Total Leads e Conv % são do SDR específico
  const chartData = dailyData.map((d, i) => {
    if (filterSdr && dailyBySdr) {
      const row       = dailyBySdr[i] || {};
      const sdrLeads  = row[`${filterSdr}_leads`] || 0;
      const sdrAg     = row[`${filterSdr}_ag`]    || 0;
      return {
        date:          d.date.slice(5).replace("-", "/"),
        "Total Leads": sdrLeads,
        "Conv %":      sdrLeads > 0 ? parseFloat(((sdrAg / sdrLeads) * 100).toFixed(1)) : null,
        _agenciados:   sdrAg,
        [filterSdr]:   sdrAg,
      };
    }
    return {
      date:          d.date.slice(5).replace("-", "/"),
      "Total Leads": d.total,
      "Conv %":      d.total > 0 ? parseFloat(((d.converted / d.total) * 100).toFixed(1)) : null,
      _agenciados:   d.agenciados || 0,
      ...(d.bySdrAgenciados || {}),
    };
  });

  const BarLabel = ({ x, y, width, height, value }) => {
    if (!value || height < 18 || width < 10) return null;
    return (
      <text x={x + width / 2} y={y + height / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: height < 24 ? "0.52rem" : "0.6rem", fontWeight: 700, fill: "rgba(255,255,255,0.88)", pointerEvents: "none" }}>
        {value}
      </text>
    );
  };

  const makeTopBarLabel = (sdrIndex) => ({ x, y, width, height, index }) => {
    const isTopmost = sdrs.slice(sdrIndex + 1).every(s => !(chartData[index]?.[s] > 0));
    if (!isTopmost) return null;
    // Soma só os SDRs visíveis (exclui IA que não aparece como barra)
    const val = sdrs.reduce((sum, s) => sum + (chartData[index]?.[s] || 0), 0);
    if (!val) return null;
    return (
      <text x={x + width / 2} y={y - 5} textAnchor="middle" dominantBaseline="auto"
        fill="#10b981" stroke="rgba(0,0,0,0.85)" strokeWidth="0.5" paintOrder="stroke"
        style={{ fontSize: "0.65rem", fontWeight: 800 }}>
        {val}
      </text>
    );
  };

  const LineLabel = ({ x, y, value, color }) => {
    if (value == null) return null;
    return (
      <text x={x} y={y - 8} textAnchor="middle" style={{ fontSize: "0.58rem", fontWeight: 700, fill: color }}>
        {value}
      </text>
    );
  };

  const legendItems = [
    ...sdrs.map(s => ({ label: agentMeta[s]?.displayName || s.split(" ")[0], color: agentMeta[s]?.color || "#7c3aed", type: "bar" })),
    { label: "Total Leads", color: "#38bdf8", type: "line" },
    { label: "Conv %",      color: "#c026d3", type: "dash" },
  ];

  return (
    <>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
        {legendItems.map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 0" }}>
            {item.type === "bar" && <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: item.color }} />}
            {item.type === "line" && <svg width="16" height="10"><line x1="0" y1="5" x2="16" y2="5" stroke={item.color} strokeWidth="2.5" /></svg>}
            {item.type === "dash" && <svg width="16" height="10"><line x1="0" y1="5" x2="16" y2="5" stroke={item.color} strokeWidth="2" strokeDasharray="4 2" /></svg>}
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{item.label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 22, right: 40, bottom: 5, left: -10 }}>
          <CartesianGrid {...RC_GRID} vertical={false} />
          <XAxis dataKey="date" tick={RC_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="left"  tick={RC_AXIS} axisLine={false} tickLine={false} domain={[0, dataMax => dataMax * 3]} />
          <YAxis yAxisId="pct"   orientation="right" tick={{ ...RC_AXIS, fill: "#c026d3" }}
            axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <YAxis yAxisId="leads" hide={true} domain={[0, "auto"]} />
          <Tooltip
            {...RC_TOOLTIP}
            formatter={(value, name) => name === "Conv %" ? [`${value}%`, name] : [value, name]}
            labelFormatter={label => `📅 ${label}`}
          />
          {sdrs.map((sdr, i) => (
            <Bar key={sdr} yAxisId="left" dataKey={sdr} stackId="stack"
              name={agentMeta[sdr]?.displayName || sdr.split(" ")[0]}
              fill={agentMeta[sdr]?.color || "#7c3aed"}
              maxBarSize={32}
              radius={i === sdrs.length - 1 ? [3,3,0,0] : [0,0,0,0]}>
              <LabelList content={BarLabel} />
              <LabelList content={makeTopBarLabel(i)} />
            </Bar>
          ))}
          <Line yAxisId="leads" type="monotone" dataKey="Total Leads"
            stroke="#38bdf8" strokeWidth={2.5}
            dot={{ fill: "#38bdf8", r: 3.5, strokeWidth: 0 }} connectNulls={false}>
            <LabelList dataKey="Total Leads" position="top" content={({ x, y, value }) => <LineLabel x={x} y={y} value={value} color="#38bdf8" />} />
          </Line>
          <Line yAxisId="pct" type="monotone" dataKey="Conv %"
            stroke="#c026d3" strokeWidth={2.5} strokeDasharray="5 3"
            dot={{ fill: "#c026d3", r: 3, strokeWidth: 0 }} connectNulls={false}>
            <LabelList dataKey="Conv %" position="top" content={({ x, y, value }) => <LineLabel x={x} y={y} value={value != null ? `${value}%` : null} color="#c026d3" />} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

// ─── LeadsAndTrendByFaseChart: barras por fase + filtro SDR ──
function LeadsAndTrendByFaseChart({ mainLeads, appliedFrom, appliedTo, agentMeta, allSdrs }) {
  const [filterSdr, setFilterSdr] = useState("Todos");

  const filteredLeads = useMemo(() =>
    filterSdr === "Todos" ? mainLeads : mainLeads.filter(l => l.sdr === filterSdr),
  [mainLeads, filterSdr]);

  const faseDailyData = useMemo(() => {
    if (!appliedFrom || !appliedTo) return [];
    const days = [];
    const cur  = new Date(appliedFrom + "T12:00:00");
    const end  = new Date(appliedTo   + "T12:00:00");
    while (cur <= end) {
      const ds       = toLocalDate(cur);
      const dayLeads = filteredLeads.filter(l => l.date === ds);
      const byFase   = {};
      dayLeads.forEach(l => {
        const f = l.fase || "Desconhecido";
        byFase[f] = (byFase[f] || 0) + 1;
      });
      days.push({ date: ds, total: dayLeads.length, converted: dayLeads.filter(l => isConverted(l.fase)).length, byFase });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [filteredLeads, appliedFrom, appliedTo]);

  if (!faseDailyData.length) return <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>Sem dados no período.</p>;

  // Fases presentes, ordenadas conforme o funil (FASES_ORDER define a ordem oficial)
  const presentFases = FASES_ORDER.filter(f =>
    faseDailyData.some(d => (d.byFase || {})[f] > 0)
  );

  // Dados do gráfico — barras somam exatamente ao total de leads do dia
  const chartData = faseDailyData.map(d => {
    const row = {
      date:     d.date.slice(5).replace("-", "/"),
      "Conv %": d.total > 0 ? parseFloat(((d.converted / d.total) * 100).toFixed(1)) : null,
      _total:   d.total,
    };
    presentFases.forEach(f => { row[f] = (d.byFase || {})[f] || 0; });
    return row;
  });

  // Label só no topo da barra (mostra o total do dia, não o segmento)
  const makeTopLabel = (faseIndex) => ({ x, y, width, index }) => {
    const isTopmost = presentFases.slice(faseIndex + 1).every(f => !(chartData[index]?.[f] > 0));
    if (!isTopmost) return null;
    const val = chartData[index]?._total;
    if (!val) return null;
    return (
      <text x={x + width / 2} y={y - 5} textAnchor="middle"
        fill="rgba(255,255,255,0.75)" stroke="rgba(0,0,0,0.7)" strokeWidth="0.4" paintOrder="stroke"
        style={{ fontSize: "0.62rem", fontWeight: 700 }}>
        {val}
      </text>
    );
  };

  const LineLabel = ({ x, y, value, color }) => {
    if (value == null) return null;
    return <text x={x} y={y - 8} textAnchor="middle" style={{ fontSize: "0.58rem", fontWeight: 700, fill: color }}>{value}</text>;
  };

  const sdrOptions = [
    { key: "Todos", label: "Todos", color: "#a78bfa" },
    ...allSdrs.map(s => ({ key: s, label: agentMeta[s]?.displayName || s.split(" ")[0], color: agentMeta[s]?.color || "#64748b" })),
  ];

  return (
    <>
      {/* SDR filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
        {sdrOptions.map(opt => (
          <button key={opt.key} onClick={() => setFilterSdr(opt.key)}
            style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer",
              fontWeight: filterSdr === opt.key ? 700 : 400,
              border: filterSdr === opt.key ? `1px solid ${opt.color}88` : "1px solid rgba(255,255,255,0.1)",
              background: filterSdr === opt.key ? `${opt.color}22` : "rgba(255,255,255,0.05)",
              color: filterSdr === opt.key ? opt.color : "var(--text-muted)",
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Legenda de fases */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
        {presentFases.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: getFaseColor(f) }} />
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{f}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "6px" }}>
          <svg width="16" height="10"><line x1="0" y1="5" x2="16" y2="5" stroke="#c026d3" strokeWidth="2" strokeDasharray="4 2" /></svg>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Conv %</span>
        </div>
      </div>

      {/* Gráfico — eixo único para barras; conv% no eixo direito */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 45, bottom: 5, left: -10 }}>
          <CartesianGrid {...RC_GRID} vertical={false} />
          <XAxis dataKey="date" tick={RC_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={RC_AXIS} axisLine={false} tickLine={false}
            domain={[0, dataMax => Math.ceil(dataMax * 1.18) || 1]} />
          <YAxis yAxisId="pct" orientation="right" tick={{ ...RC_AXIS, fill: "#c026d3" }}
            axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip
            {...RC_TOOLTIP}
            formatter={(value, name) => {
              if (name === "Conv %") return [`${value}%`, name];
              if (name.startsWith("_")) return null;
              return [value, name];
            }}
            labelFormatter={label => `📅 ${label}`}
          />
          {presentFases.map((f, i) => (
            <Bar key={f} yAxisId="left" dataKey={f} stackId="stack" name={f}
              fill={getFaseColor(f)} maxBarSize={36}
              radius={i === presentFases.length - 1 ? [3,3,0,0] : [0,0,0,0]}>
              {/* Valor do segmento — só aparece se o segmento tiver altura suficiente */}
              <LabelList dataKey={f} position="center"
                content={({ x, y, width, height, value }) => {
                  if (!value || height < 18) return null;
                  return (
                    <text x={x + width / 2} y={y + height / 2 + 4}
                      textAnchor="middle" fontSize="10" fontWeight="700"
                      fill="rgba(255,255,255,0.88)">
                      {value}
                    </text>
                  );
                }}
              />
              {/* Total do dia no topo da barra mais alta */}
              <LabelList content={makeTopLabel(i)} />
            </Bar>
          ))}
          <Line yAxisId="pct" type="monotone" dataKey="Conv %"
            stroke="#c026d3" strokeWidth={2.5} strokeDasharray="5 3"
            dot={{ fill: "#c026d3", r: 3, strokeWidth: 0 }} connectNulls={false}>
            <LabelList dataKey="Conv %" position="top"
              content={({ x, y, value }) => <LineLabel x={x} y={y} value={value != null ? `${value}%` : null} color="#c026d3" />} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

// ─── SdrDailyChart: leads + agenciados por dia por SDR ───────
function SdrDailyChart({ dailyBySdr, humanSdrs, agentMeta }) {
  const [mode, setMode] = useState("ag"); // "ag" | "leads"

  if (!dailyBySdr.length) return (
    <p style={{ color:"var(--text-muted)", fontSize:"0.8rem", textAlign:"center", padding:"2rem 0" }}>Sem dados no período.</p>
  );

  // Média diária total (soma de todos os SDRs / dias com qualquer valor)
  const daysWithData = dailyBySdr.filter(d => humanSdrs.some(s => (d[`${s}_${mode}`] || 0) > 0));
  const totalSum     = dailyBySdr.reduce((a, d) => a + humanSdrs.reduce((b, s) => b + (d[`${s}_${mode}`] || 0), 0), 0);
  const avgVal       = daysWithData.length > 0 ? parseFloat((totalSum / daysWithData.length).toFixed(1)) : 0;

  const chartDataWithAvg = dailyBySdr.map(d => ({ ...d, "Média": avgVal }));

  const maxVal = Math.max(1, avgVal, ...dailyBySdr.flatMap(d =>
    humanSdrs.map(s => d[`${s}_${mode}`] || 0)
  ));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const barPayload = payload.filter(p => p.type !== "line");
    return (
      <div style={{ background:"rgba(10,10,25,0.97)", border:"1px solid rgba(255,255,255,0.14)",
        borderRadius:"8px", padding:"10px 14px", fontSize:"0.72rem" }}>
        <p style={{ color:"rgba(255,255,255,0.6)", marginBottom:"6px", fontWeight:600 }}>📅 {label}</p>
        {barPayload.map((p, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"3px" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:p.fill }} />
            <span style={{ color:p.fill, fontWeight:700 }}>{p.name}:</span>
            <span style={{ color:"#fff" }}>{p.value} {mode === "ag" ? "ag." : "leads"}</span>
          </div>
        ))}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:"6px", paddingTop:"6px", display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.68rem" }}>
            Total: {barPayload.reduce((a, p) => a + (p.value || 0), 0)} {mode === "ag" ? "ag." : "leads"}
          </span>
          <span style={{ color:"#fbbf24", fontSize:"0.68rem" }}>méd: {avgVal}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Toggle */}
      <div style={{ display:"flex", gap:"6px", marginBottom:"14px", alignItems:"center" }}>
        {[
          { key:"ag",    label:"Agenciados/dia" },
          { key:"leads", label:"Leads/dia"      },
        ].map(opt => (
          <button key={opt.key} onClick={() => setMode(opt.key)}
            style={{
              padding:"4px 12px", borderRadius:"6px", fontSize:"0.72rem", cursor:"pointer",
              fontWeight: mode === opt.key ? 700 : 400,
              border: mode === opt.key ? "1px solid rgba(124,58,237,0.6)" : "1px solid rgba(255,255,255,0.1)",
              background: mode === opt.key ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)",
              color: mode === opt.key ? "#a78bfa" : "var(--text-muted)",
            }}>
            {opt.label}
          </button>
        ))}
        {/* Legenda da média */}
        <div style={{ display:"flex", alignItems:"center", gap:"5px", marginLeft:"8px" }}>
          <svg width="16" height="10"><line x1="0" y1="5" x2="16" y2="5" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 2" /></svg>
          <span style={{ fontSize:"0.68rem", color:"#fbbf24" }}>Média: {avgVal} {mode === "ag" ? "ag/dia" : "leads/dia"}</span>
        </div>
      </div>

      {/* Gráfico barras agrupadas + linha de média */}
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartDataWithAvg} margin={{ top:10, right:10, bottom:5, left:-10 }} barCategoryGap="20%">
          <CartesianGrid {...RC_GRID} vertical={false} />
          <XAxis dataKey="date" tick={RC_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={RC_AXIS} axisLine={false} tickLine={false} domain={[0, Math.ceil(maxVal * 1.25) || 1]} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill:"rgba(255,255,255,0.04)" }} />
          {humanSdrs.map(sdr => (
            <Bar key={sdr} dataKey={`${sdr}_${mode}`} name={agentMeta[sdr]?.displayName || sdr.split(" ")[0]}
              fill={agentMeta[sdr]?.color || "#64748b"} maxBarSize={28} radius={[3,3,0,0]}>
              <LabelList
                dataKey={`${sdr}_${mode}`}
                position="top"
                content={({ x, y, width, value }) => {
                  if (!value) return null;
                  return (
                    <text x={x + width / 2} y={y - 4} textAnchor="middle"
                      style={{ fontSize:"0.58rem", fontWeight:700, fill: agentMeta[sdr]?.color || "#fff" }}>
                      {value}
                    </text>
                  );
                }}
              />
            </Bar>
          ))}
          {/* Linha de média */}
          <Line dataKey="Média" type="monotone"
            stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 3"
            dot={false} activeDot={false} legendType="none" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Tabela diária compacta */}
      <div style={{ marginTop:"20px", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.72rem" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
              <th style={{ textAlign:"left", padding:"6px 8px", color:"var(--text-muted)", fontWeight:600, fontSize:"0.62rem", textTransform:"uppercase" }}>Data</th>
              {humanSdrs.map(sdr => (
                <th key={sdr} colSpan={2} style={{ textAlign:"center", padding:"6px 8px",
                  color: agentMeta[sdr]?.color || "var(--text-muted)", fontWeight:700, fontSize:"0.62rem", textTransform:"uppercase" }}>
                  {agentMeta[sdr]?.displayName || sdr.split(" ")[0]}
                </th>
              ))}
              <th style={{ textAlign:"right", padding:"6px 8px", color:"var(--text-muted)", fontWeight:600, fontSize:"0.62rem", textTransform:"uppercase" }}>Total ag.</th>
            </tr>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <th />
              {humanSdrs.flatMap(sdr => [
                <th key={`${sdr}_l`} style={{ textAlign:"right", padding:"3px 8px", color:"var(--text-muted)", fontSize:"0.58rem", fontWeight:400 }}>leads</th>,
                <th key={`${sdr}_a`} style={{ textAlign:"right", padding:"3px 8px", color:"var(--text-muted)", fontSize:"0.58rem", fontWeight:400 }}>ag.</th>,
              ])}
              <th />
            </tr>
          </thead>
          <tbody>
            {dailyBySdr.map((d, i) => {
              const totalAg = humanSdrs.reduce((a, s) => a + (d[`${s}_ag`] || 0), 0);
              const anyAg   = totalAg > 0;
              return (
                <tr key={d.date} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)",
                  background: anyAg ? "rgba(16,185,129,0.04)" : "transparent" }}>
                  <td style={{ padding:"6px 8px", color:"var(--text-secondary)", fontWeight:500 }}>{d.date}</td>
                  {humanSdrs.flatMap(sdr => {
                    const leads = d[`${sdr}_leads`] || 0;
                    const ag    = d[`${sdr}_ag`]    || 0;
                    const rate  = leads > 0 ? ((ag / leads) * 100).toFixed(0) : "—";
                    return [
                      <td key={`${sdr}_l`} style={{ textAlign:"right", padding:"6px 8px", color:"var(--text-secondary)" }}>{leads || "—"}</td>,
                      <td key={`${sdr}_a`} style={{ textAlign:"right", padding:"6px 8px",
                        color: ag > 0 ? agentMeta[sdr]?.color || "#10b981" : "var(--text-muted)",
                        fontWeight: ag > 0 ? 700 : 400 }}>
                        {ag > 0 ? `${ag}` : "—"}
                        {ag > 0 && <span style={{ fontSize:"0.6rem", opacity:0.6, marginLeft:"3px" }}>({rate}%)</span>}
                      </td>,
                    ];
                  })}
                  <td style={{ textAlign:"right", padding:"6px 8px",
                    color: anyAg ? "#10b981" : "var(--text-muted)", fontWeight: anyAg ? 800 : 400 }}>
                    {anyAg ? totalAg : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Linha de totais */}
          <tfoot>
            <tr style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.02)" }}>
              <td style={{ padding:"8px", fontWeight:700, color:"var(--text-primary)", fontSize:"0.72rem" }}>Total</td>
              {humanSdrs.flatMap(sdr => {
                const tl = dailyBySdr.reduce((a, d) => a + (d[`${sdr}_leads`] || 0), 0);
                const ta = dailyBySdr.reduce((a, d) => a + (d[`${sdr}_ag`]    || 0), 0);
                const tr = tl > 0 ? ((ta / tl) * 100).toFixed(1) : "—";
                return [
                  <td key={`${sdr}_lt`} style={{ textAlign:"right", padding:"8px", color:"var(--text-secondary)", fontWeight:700 }}>{tl}</td>,
                  <td key={`${sdr}_at`} style={{ textAlign:"right", padding:"8px",
                    color: agentMeta[sdr]?.color || "#10b981", fontWeight:800 }}>
                    {ta}
                    <span style={{ fontSize:"0.6rem", opacity:0.6, marginLeft:"3px" }}>({tr}%)</span>
                  </td>,
                ];
              })}
              <td style={{ textAlign:"right", padding:"8px", color:"#10b981", fontWeight:800 }}>
                {dailyBySdr.reduce((a, d) => a + humanSdrs.reduce((b, s) => b + (d[`${s}_ag`] || 0), 0), 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

// ─── ConvRateByDayChart ───────────────────────────────────────
function ConvRateByDayChart({ dailyData }) {
  if (!dailyData.length) return <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>Sem dados no período.</p>;

  const chartData = dailyData.map(d => ({
    date: d.date.slice(5).replace("-", "/"),
    taxa: d.total > 0 ? parseFloat(((d.converted / d.total) * 100).toFixed(1)) : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid {...RC_GRID} vertical={false} />
        <XAxis dataKey="date" tick={RC_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis unit="%" tick={RC_AXIS} axisLine={false} tickLine={false} domain={[0, "auto"]} />
        <Tooltip {...RC_TOOLTIP} formatter={v => [`${v}%`, "Taxa de conversão"]} />
        <Line type="monotone" dataKey="taxa" name="Taxa de Conversão" stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: "#a78bfa", r: 3.5, strokeWidth: 0 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── DualLineChart: volume (barra) + conversão (linha) ────────
function DualLineChart({ dailyData }) {
  if (!dailyData.length) return <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>Sem dados no período.</p>;

  const chartData = dailyData.map(d => ({
    date:        d.date.slice(5).replace("-", "/"),
    Leads:       d.total,
    Agenciados:  d.agenciados || 0,
    "Conv %":    d.total > 0 ? parseFloat(((d.converted / d.total) * 100).toFixed(1)) : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: -10 }}>
        <CartesianGrid {...RC_GRID} vertical={false} />
        <XAxis dataKey="date" tick={RC_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="left"  tick={RC_AXIS} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={RC_AXIS} axisLine={false} tickLine={false} domain={[0, "auto"]} />
        <Tooltip {...RC_TOOLTIP} formatter={(v, n) => n === "Conv %" ? [`${v}%`, n] : [v, n]} />
        <Legend wrapperStyle={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }} />
        <Bar yAxisId="left" dataKey="Leads" fill="rgba(59,130,246,0.65)" maxBarSize={28} radius={[3,3,0,0]} />
        <Line yAxisId="right" type="monotone" dataKey="Agenciados" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 3.5, strokeWidth: 0 }} connectNulls={false} />
        <Line yAxisId="right" type="monotone" dataKey="Conv %" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 3" dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── WeekHeatmap: contribuição estilo GitHub ──────────────────
function WeekHeatmap({ heatmapData, appliedFrom, appliedTo, color = "124,58,237", label = "leads" }) {
  const [tip, setTip] = useState(null);
  if (!appliedFrom || !appliedTo) return null;

  const start = new Date(appliedFrom + "T12:00:00");
  const dow   = start.getDay();
  const firstMon = new Date(start);
  firstMon.setDate(start.getDate() + (dow === 0 ? -6 : 1 - dow));

  const weeks = [];
  const cur   = new Date(firstMon);
  const endD  = new Date(appliedTo + "T12:00:00");
  while (cur <= endD) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(toLocalDate(new Date(cur)));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Object.values(heatmapData));
  const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const CELL = 24; const GAP = 3;

  return (
    <div style={{ overflowX: "auto" }}>
      {tip && (
        <div style={{ position: "fixed", left: tip.x, top: tip.y, transform: "translateX(-50%) translateY(-110%)", background: "rgba(10,10,25,0.97)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "6px 12px", fontSize: "0.72rem", color: "#fff", zIndex: 9999, pointerEvents: "none" }}>
          <strong>{tip.date}</strong> — {tip.count} {label}
        </div>
      )}
      <div style={{ display: "flex", gap: `${GAP}px` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: `${GAP}px`, marginRight: "6px", paddingTop: "20px" }}>
          {DAYS.map(d => <div key={d} style={{ height: `${CELL}px`, display: "flex", alignItems: "center", fontSize: "0.6rem", color: "var(--text-muted)" }}>{d}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: `${GAP}px` }}>
            <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", height: "16px", textAlign: "center" }}>
              {wi % 2 === 0 && week[0] >= appliedFrom ? week[0].slice(5).replace("-", "/") : ""}
            </div>
            {week.map(ds => {
              const count   = heatmapData[ds] || 0;
              const inRange = ds >= appliedFrom && ds <= appliedTo;
              const alpha   = inRange && count > 0 ? 0.12 + (count / maxCount) * 0.88 : 0;
              const bg      = inRange ? (count > 0 ? `rgba(${color},${alpha.toFixed(2)})` : "rgba(255,255,255,0.04)") : "transparent";
              return (
                <div key={ds} style={{ width: `${CELL}px`, height: `${CELL}px`, background: bg, borderRadius: "4px", cursor: count > 0 ? "pointer" : "default" }}
                  onMouseEnter={count > 0 ? () => setTip({ date: ds.split("-").reverse().join("/"), count, x: 0, y: 0 }) : undefined}
                  onMouseMove={count > 0 ? e => setTip({ date: ds.split("-").reverse().join("/"), count, x: e.clientX, y: e.clientY }) : undefined}
                  onMouseLeave={() => setTip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "12px" }}>
        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Menos</span>
        {[0.12, 0.3, 0.5, 0.7, 0.9, 1.0].map(v => <div key={v} style={{ width: "16px", height: "16px", borderRadius: "3px", background: `rgba(${color},${v})` }} />)}
        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Mais</span>
      </div>
    </div>
  );
}

// ─── RadarChart: perfil por SDR ───────────────────────────────
function RadarChartSdr({ sdrStats }) {
  if (!sdrStats || sdrStats.every(s => s.total === 0)) return <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>Sem dados.</p>;

  const maxTotal  = Math.max(1, ...sdrStats.map(s => s.total));
  const maxConvR  = Math.max(1, ...sdrStats.map(s => s.convRate));
  const maxQualif = Math.max(1, ...sdrStats.map(s => s.qualif));
  const maxAg     = Math.max(1, ...sdrStats.map(s => s.agenciados));
  const maxConv   = Math.max(1, ...sdrStats.map(s => s.convite));

  const data = [
    { subject: "Volume",     ...Object.fromEntries(sdrStats.map(s => [s.name, Math.round((s.total      / maxTotal)  * 100)])) },
    { subject: "Conv %",     ...Object.fromEntries(sdrStats.map(s => [s.name, Math.round((s.convRate   / maxConvR)  * 100)])) },
    { subject: "Qualif.",    ...Object.fromEntries(sdrStats.map(s => [s.name, Math.round((s.qualif     / maxQualif) * 100)])) },
    { subject: "Agenciados", ...Object.fromEntries(sdrStats.map(s => [s.name, Math.round((s.agenciados / maxAg)     * 100)])) },
    { subject: "Conv. Env.", ...Object.fromEntries(sdrStats.map(s => [s.name, Math.round((s.convite    / maxConv)   * 100)])) },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ReRadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} tickCount={4} />
        {sdrStats.map(s => (
          <Radar key={s.name}
            name={AGENT_META[s.name]?.displayName || s.name}
            dataKey={s.name}
            stroke={AGENT_META[s.name]?.color || "#64748b"}
            fill={AGENT_META[s.name]?.color   || "#64748b"}
            fillOpacity={0.18}
            strokeWidth={2}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }} formatter={n => AGENT_META[n]?.displayName || n} />
        <Tooltip {...RC_TOOLTIP} formatter={(v, n) => [`${v}%`, AGENT_META[n]?.displayName || n]} />
      </ReRadarChart>
    </ResponsiveContainer>
  );
}

// ─── SdrStuckPhases: fase mais travada por SDR ────────────────
function SdrStuckPhases({ mainLeads }) {
  const humanSdrs = MAIN_SDRS.filter(s => !AGENT_META[s]?.isAI);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {humanSdrs.map(sdr => {
        const sLeads = mainLeads.filter(l => l.sdr === sdr);
        if (!sLeads.length) return null;
        const color  = AGENT_META[sdr]?.color || "#64748b";
        const name   = AGENT_META[sdr]?.displayName || sdr;
        const counts = {};
        sLeads.forEach(l => { counts[l.fase] = (counts[l.fase] || 0) + 1; });
        const chartData = Object.entries(counts)
          .sort(([, a], [, b]) => b - a).slice(0, 6)
          .map(([fase, count]) => ({ fase: fase.length > 22 ? fase.slice(0, 20) + "…" : fase, count, fullFase: fase }));
        return (
          <div key={sdr}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color, marginBottom: "10px" }}>
              {name} <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.68rem" }}>· {sLeads.length} leads</span>
            </p>
            <ResponsiveContainer width="100%" height={chartData.length * 34}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="fase" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={135} />
                <Tooltip {...RC_TOOLTIP} formatter={(v, _, { payload }) => [v, payload?.fullFase || "Leads"]} />
                <Bar dataKey="count" name="Leads" radius={[0,4,4,0]} maxBarSize={20}>
                  {chartData.map((e, i) => <Cell key={i} fill={getFaseColor(e.fullFase)} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

// ─── SdrEfficiencyChart: tx. conversão semanal ───────────────
function SdrEfficiencyChart({ weeklyBySdr }) {
  const { weeks, data } = weeklyBySdr;
  if (!weeks || weeks.length < 2) return (
    <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>
      Selecione ao menos 2 semanas para ver a evolução.
    </p>
  );

  const chartData = weeks.map(w => {
    const entry = { week: w.slice(5).replace("-", "/") };
    MAIN_SDRS.forEach(sdr => {
      const d = data[w]?.[sdr];
      entry[sdr] = (!d || d.total === 0) ? null : parseFloat(((d.converted / d.total) * 100).toFixed(1));
    });
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
        <CartesianGrid {...RC_GRID} vertical={false} />
        <XAxis dataKey="week" tick={RC_AXIS} axisLine={false} tickLine={false} />
        <YAxis unit="%" tick={RC_AXIS} axisLine={false} tickLine={false} domain={[0, "auto"]} />
        <Tooltip {...RC_TOOLTIP} formatter={(v, n) => v !== null ? [`${v}%`, AGENT_META[n]?.displayName || n] : ["—", AGENT_META[n]?.displayName || n]} />
        <Legend wrapperStyle={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }} formatter={n => AGENT_META[n]?.displayName || n} />
        {MAIN_SDRS.map(sdr => (
          <Line key={sdr} type="monotone" dataKey={sdr} name={sdr}
            stroke={AGENT_META[sdr]?.color || "#64748b"} strokeWidth={2.5}
            dot={{ fill: AGENT_META[sdr]?.color, r: 4, strokeWidth: 0 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}


// ─── KanbanFunnel: funil vertical estilo kanban (reutilizável) ─
function KanbanFunnel({ funnelData, funnelView, activeFunnelSdrs, selectedSdr, onSdrClick }) {
  const [tip, setTip] = useState(null);

  if (!funnelData.length) return (
    <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>Sem dados no período.</p>
  );

  const BAR_H     = 200;
  const funnelMax = funnelData.reduce((a, f) => Math.max(a, f.total), 0);

  return (
    <>
      <ChartTooltip tooltip={tip} />
      <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", minWidth: "max-content" }}>
          {funnelData.map(({ fase, total, bySdr }) => {
            const color = getFaseColor(fase);
            const pct   = funnelMax > 0 ? (total / funnelMax) * 100 : 0;
            const barH  = Math.max(4, Math.round((pct / 100) * BAR_H));
            return (
              <div key={fase}
                style={{ width: "88px", display: "flex", flexDirection: "column", alignItems: "center" }}
                onMouseMove={e => {
                  const lines = [{ text: fase, bold: true }, { text: `${total} leads · ${pct.toFixed(0)}%` }];
                  activeFunnelSdrs.forEach(sdr => {
                    const cnt = bySdr[sdr] || 0;
                    if (cnt > 0) lines.push({ dot: AGENT_META[sdr]?.color, text: `${AGENT_META[sdr]?.displayName || sdr}: ${cnt}`, color: AGENT_META[sdr]?.color });
                  });
                  setTip({ x: e.clientX, y: e.clientY - 12, lines });
                }}
                onMouseLeave={() => setTip(null)}
              >
                {/* Área fixa: count + % */}
                <div style={{ height: "38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: "2px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 800, color, lineHeight: 1 }}>{total}</span>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                </div>

                {/* Barra vertical */}
                <div style={{ width: "100%", height: `${BAR_H}px`, background: "rgba(255,255,255,0.05)", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {funnelView === "sdrs" ? (
                    <div style={{ width: "100%", height: `${barH}px`, display: "flex", flexDirection: "column-reverse", overflow: "hidden", borderRadius: "0 0 8px 8px" }}>
                      {activeFunnelSdrs.map(sdr => {
                        const cnt      = bySdr[sdr] || 0;
                        const segH     = total > 0 ? (cnt / total) * barH : 0;
                        const sdrColor = AGENT_META[sdr]?.color || "#64748b";
                        const active   = selectedSdr.length === 0 || selectedSdr.includes(sdr);
                        return cnt > 0 ? (
                          <div key={sdr}
                            style={{ width: "100%", height: `${segH}px`, background: sdrColor, flexShrink: 0, opacity: active ? 1 : 0.15, cursor: "pointer", transition: "opacity 0.15s" }}
                            onClick={e => { e.stopPropagation(); onSdrClick(prev => prev.includes(sdr) ? prev.filter(s => s !== sdr) : [...prev, sdr]); }}
                          />
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <div style={{
                      width: "100%", height: `${barH}px`, background: color,
                      opacity: selectedSdr.length > 0 ? selectedSdr.some(s => (bySdr[s] || 0) > 0) ? 0.95 : 0.2 : 0.85,
                      borderRadius: "0 0 8px 8px", transition: "all 0.3s ease",
                    }} />
                  )}
                </div>

                {/* Área fixa: label */}
                <div style={{ height: "40px", display: "flex", alignItems: "flex-start", justifyContent: "center", marginTop: "6px" }}>
                  <span style={{ fontSize: "0.6rem", color, textAlign: "center", lineHeight: 1.3, maxWidth: "84px", fontWeight: 500 }}>{fase}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Componente Principal ─────────────────────────────────────
export default function AnaliseView({
  dateField  = "Data do Primeiro contato",
  pageTitle  = "Análise Entradas",
  pageSubtitle = null,   // null → usa o subtitle padrão
}) {
  const pathname = usePathname();

  // Default: últimos 7 dias
  const todayObj    = new Date();
  const todayStr    = toLocalDate(todayObj);
  const sevenAgoObj = new Date(todayObj);
  sevenAgoObj.setDate(sevenAgoObj.getDate() - 6);
  const sevenAgoStr = toLocalDate(sevenAgoObj);

  const [dateFrom,    setDateFrom]    = useState(sevenAgoStr);
  const [dateTo,      setDateTo]      = useState(todayStr);
  const [appliedFrom, setAppliedFrom] = useState(sevenAgoStr);
  const [appliedTo,   setAppliedTo]   = useState(todayStr);
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSdr,    setSelectedSdr]    = useState([]);
  const [selectedOrigem, setSelectedOrigem] = useState("Todos");

  // ─── Fetch ─────────────────────────────────────────────────
  const fetchData = useCallback(async (from, to) => {
    try {
      setLoading(true);
      const off = new Date().getTimezoneOffset();
      const abs = Math.abs(off);
      const tz  = `${off <= 0 ? "+" : "-"}${String(Math.floor(abs/60)).padStart(2,"0")}:${String(abs%60).padStart(2,"0")}`;
      const res  = await fetch(`/api/notion?from=${from}&to=${to}&dateField=${encodeURIComponent(dateField)}&tz=${encodeURIComponent(tz)}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao buscar dados");
      setData(json.data || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(appliedFrom, appliedTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFrom, appliedTo]);

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

  // ─── Helper: extrai data respeitando o fuso do browser ───────
  // Lida com múltiplos tipos de propriedade Notion (date, created_time,
  // last_edited_time, formula) e usa os métodos locais do Date para que
  // o fuso horário do browser seja aplicado corretamente sem ajuste manual.
  const extractLocalDate = useCallback((prop) => {
    if (!prop) return null;

    let s = null;
    if      (prop.type === "date"           && prop.date?.start)             s = prop.date.start;
    else if (prop.type === "created_time"   && prop.created_time)            s = prop.created_time;
    else if (prop.type === "last_edited_time" && prop.last_edited_time)      s = prop.last_edited_time;
    else if (prop.type === "formula"        && prop.formula?.type === "date") s = prop.formula.date?.start;

    if (!s) return null;
    if (s.length === 10) return s; // date-only já está em formato correto

    // Datetime: usa getFullYear/getMonth/getDate que já retornam no fuso local
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // ─── Processamento (API já retorna campos extraídos + date no fuso correto) ──
  const parsed = useMemo(() => data.map(item => ({
    id:     item.id,
    sdr:    item.sdr    || "Desconhecido",
    fase:   item.fase   || "Desconhecido",
    origem: (item.origem && item.origem !== "Desconhecido") ? item.origem : "Origem Desconhecida",
    date:   item.date   || null,
  })), [data]);

  const allLeads = useMemo(() => parsed.filter(l => MAIN_SDRS.includes(l.sdr)), [parsed]);

  // Filtrado só por SDR (usado para listar origens disponíveis)
  const sdrFilteredLeads = useMemo(() =>
    selectedSdr.length === 0 ? allLeads : allLeads.filter(l => selectedSdr.includes(l.sdr)),
  [allLeads, selectedSdr]);

  // Origens disponíveis para o SDR selecionado
  const allOrigins = useMemo(() => {
    const set = new Set(sdrFilteredLeads.map(l => l.origem).filter(Boolean));
    return [...set].sort();
  }, [sdrFilteredLeads]);

  // Filtrado por SDR + Origem (todos os gráficos usam mainLeads)
  const mainLeads = useMemo(() =>
    selectedOrigem === "Todos"
      ? sdrFilteredLeads
      : sdrFilteredLeads.filter(l => l.origem === selectedOrigem),
  [sdrFilteredLeads, selectedOrigem]);

  const originColors = useMemo(() => {
    const map = {};
    allOrigins.forEach((o, i) => {
      // prioridade: cor fixa do mapa → fallback pela posição na paleta
      map[o] = ORIGIN_COLOR_MAP[o] || ORIGIN_COLORS[i % ORIGIN_COLORS.length];
    });
    return map;
  }, [allOrigins]);

  // ─── Agregações ────────────────────────────────────────────
  const totalLeads     = mainLeads.length;
  const totalConverted = useMemo(() => mainLeads.filter(l => isConverted(l.fase)).length,          [mainLeads]);
  const totalAgenciado = useMemo(() => mainLeads.filter(l => l.fase === "Agenciado").length,        [mainLeads]);
  const totalConviteAc = useMemo(() => mainLeads.filter(l => l.fase === "Convite Aceito").length,   [mainLeads]);
  const totalQualif    = useMemo(() => mainLeads.filter(l => l.fase?.toLowerCase().includes("qualificado")).length, [mainLeads]);
  const convRate       = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : "0.0";

  const numDays  = useMemo(() => {
    if (!appliedFrom || !appliedTo) return 1;
    const cur = new Date(appliedFrom + "T12:00:00");
    const end = new Date(appliedTo   + "T12:00:00");
    let bizDays = 0;
    while (cur <= end) {
      const dow = cur.getDay(); // 0=dom, 6=sab
      if (dow !== 0 && dow !== 6) bizDays++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, bizDays);
  }, [appliedFrom, appliedTo]);
  const avgDaily = numDays > 0 ? (totalConverted / numDays).toFixed(1) : "0.0";

  const originBreakdown = useMemo(() => {
    const map = {};
    mainLeads.forEach(l => {
      if (!map[l.origem]) map[l.origem] = { count: 0, converted: 0 };
      map[l.origem].count++;
      if (isConverted(l.fase)) map[l.origem].converted++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, rate: v.count > 0 ? ((v.converted / v.count) * 100).toFixed(1) : "0.0" }))
      .sort((a, b) => b.converted - a.converted);
  }, [mainLeads]);

  const dailyData = useMemo(() => {
    if (!appliedFrom || !appliedTo) return [];
    const days = [];
    const cur  = new Date(appliedFrom + "T12:00:00");
    const end  = new Date(appliedTo   + "T12:00:00");
    while (cur <= end) {
      const ds       = toLocalDate(cur);
      const dayLeads = mainLeads.filter(l => l.date === ds);
      // Conta por origem diretamente dos leads do dia (sem depender de allOrigins)
      const byOrigin = {};
      const byOriginAgenciados = {};
      const bySdrAgenciados = {};
      dayLeads.forEach(l => {
        const o = l.origem || "Sem origem";
        byOrigin[o] = (byOrigin[o] || 0) + 1;
        if (isConverted(l.fase)) byOriginAgenciados[o] = (byOriginAgenciados[o] || 0) + 1;
        if (isConverted(l.fase) && l.sdr) bySdrAgenciados[l.sdr] = (bySdrAgenciados[l.sdr] || 0) + 1;
      });
      days.push({ date: ds, total: dayLeads.length, converted: dayLeads.filter(l => isConverted(l.fase)).length, agenciados: dayLeads.filter(l => isConverted(l.fase)).length, byOrigin, byOriginAgenciados, bySdrAgenciados });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [mainLeads, appliedFrom, appliedTo]);

  const sdrStats = useMemo(() => MAIN_SDRS.map(name => {
    const sLeads    = mainLeads.filter(l => l.sdr === name);
    const converted = sLeads.filter(l => isConverted(l.fase)).length;
    const lost      = sLeads.filter(l => LOSS_PHASES.includes(l.fase)).length;
    const qualif    = sLeads.filter(l => l.fase?.toLowerCase().includes("qualificado")).length;
    const agenciados= sLeads.filter(l => isConverted(l.fase)).length;
    const convite   = sLeads.filter(l => l.fase === "Convite Enviado").length;
    const total     = sLeads.length;
    const convRate  = total > 0 ? (converted / total) * 100 : 0;
    return { name, total, converted, lost, qualif, agenciados, convite, convRate };
  }), [mainLeads]);

  // Dados semanais por SDR (para gráfico de eficiência)
  const weeklyBySdr = useMemo(() => {
    const weeks = {};
    mainLeads.forEach(l => {
      if (!l.date) return;
      const d = new Date(l.date + "T12:00:00");
      const dow = d.getDay();
      const daysToMon = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(d);
      mon.setDate(d.getDate() + daysToMon);
      const wk = toLocalDate(mon);
      if (!weeks[wk]) weeks[wk] = {};
      if (!weeks[wk][l.sdr]) weeks[wk][l.sdr] = { total: 0, converted: 0 };
      weeks[wk][l.sdr].total++;
      if (isConverted(l.fase)) weeks[wk][l.sdr].converted++;
    });
    return { weeks: Object.keys(weeks).sort(), data: weeks };
  }, [mainLeads]);

  // Heatmap: date → count (para contribuição estilo GitHub)
  const heatmapData = useMemo(() => {
    const map = {};
    mainLeads.forEach(l => { if (l.date) map[l.date] = (map[l.date] || 0) + 1; });
    return map;
  }, [mainLeads]);

  const heatmapAgenciados = useMemo(() => {
    const map = {};
    mainLeads.forEach(l => { if (l.date && isConverted(l.fase)) map[l.date] = (map[l.date] || 0) + 1; });
    return map;
  }, [mainLeads]);

  // Funil dinâmico: todas as fases que têm ≥1 lead, com contagem por SDR
  const funnelData = useMemo(() =>
    FASES_ORDER
      .map(fase => {
        const faseLeads = mainLeads.filter(l => l.fase === fase);
        const bySdr = {};
        MAIN_SDRS.forEach(sdr => { bySdr[sdr] = faseLeads.filter(l => l.sdr === sdr).length; });
        return { fase, total: faseLeads.length, bySdr };
      })
      .filter(f => f.total > 0),
  [mainLeads]);

  const [funnelView, setFunnelView] = useState("geral"); // "geral" | "sdrs" | "ia"

  const AI_SDRS    = MAIN_SDRS.filter(s =>  AGENT_META[s]?.isAI);
  const HUMAN_SDRS = MAIN_SDRS.filter(s => !AGENT_META[s]?.isAI);

  // ─── Performance diária por SDR (precisa de HUMAN_SDRS acima) ─
  const dailyBySdr = useMemo(() => {
    return dailyData.map(d => {
      const entry = { date: d.date.slice(5).replace("-", "/") };
      HUMAN_SDRS.forEach(sdr => {
        const sdrLeads = mainLeads.filter(l => l.date === d.date && l.sdr === sdr);
        entry[`${sdr}_leads`] = sdrLeads.length;
        entry[`${sdr}_ag`]    = sdrLeads.filter(l => isConverted(l.fase)).length;
      });
      return entry;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyData, mainLeads]);

  // SDRs visíveis no funil conforme aba selecionada
  const activeFunnelSdrs = funnelView === "ia"   ? AI_SDRS
                         : funnelView === "sdrs"  ? HUMAN_SDRS
                         : MAIN_SDRS;

  // Funil filtrado pela aba ativa
  const funnelDataFiltered = useMemo(() =>
    FASES_ORDER
      .map(fase => {
        const faseLeads = mainLeads.filter(l => l.fase === fase && activeFunnelSdrs.includes(l.sdr));
        const bySdr = {};
        activeFunnelSdrs.forEach(sdr => { bySdr[sdr] = faseLeads.filter(l => l.sdr === sdr).length; });
        return { fase, total: faseLeads.length, bySdr };
      })
      .filter(f => f.total > 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [mainLeads, funnelView]);

  // Funil acumulativo: cada fase acumula ela + todas as fases à frente (somente progressão)
  const PROGRESSION_PHASES = FASES_ORDER.filter(f => !LOSS_PHASES.includes(f));
  const cumulativeFunnelData = useMemo(() => {
    return PROGRESSION_PHASES
      .map((fase, idx) => {
        const afterPhases = PROGRESSION_PHASES.slice(idx);
        const cumLeads = mainLeads.filter(l => afterPhases.includes(l.fase) && activeFunnelSdrs.includes(l.sdr));
        const bySdr = {};
        activeFunnelSdrs.forEach(sdr => { bySdr[sdr] = cumLeads.filter(l => l.sdr === sdr).length; });
        return { fase, total: cumLeads.length, bySdr };
      })
      .filter(f => f.total > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainLeads, funnelView]);

  // ── Alinhamento: ambos os kanban usam o mesmo conjunto de fases ──────────────
  // União das fases de ambos (sem duplicatas), mantendo a ordem de FASES_ORDER.
  // Fases com total=0 em um dos lados ficam como colunas vazias para alinhar posições.
  const alignedPhases = useMemo(() => {
    const inEither = new Set([
      ...funnelDataFiltered.map(f => f.fase),
      ...cumulativeFunnelData.map(f => f.fase),
    ]);
    return FASES_ORDER.filter(f => inEither.has(f));
  }, [funnelDataFiltered, cumulativeFunnelData]);

  const emptyBySdr = useMemo(() => {
    const o = {};
    activeFunnelSdrs.forEach(s => { o[s] = 0; });
    return o;
  }, [activeFunnelSdrs]);

  const alignedFunnelData = useMemo(() =>
    alignedPhases.map(fase =>
      funnelDataFiltered.find(f => f.fase === fase) || { fase, total: 0, bySdr: emptyBySdr }
    ), [alignedPhases, funnelDataFiltered, emptyBySdr]);

  const alignedCumulativeData = useMemo(() =>
    alignedPhases.map(fase =>
      cumulativeFunnelData.find(f => f.fase === fase) || { fase, total: 0, bySdr: emptyBySdr }
    ), [alignedPhases, cumulativeFunnelData, emptyBySdr]);

  const fmt = (ds) => ds.split("-").reverse().join("/");
  const periodLabel = appliedFrom === appliedTo ? fmt(appliedFrom) : `${fmt(appliedFrom)} → ${fmt(appliedTo)}`;

  // ─── Render ────────────────────────────────────────────────
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
          <h1 className="dash-title">{pageTitle}</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            {pageSubtitle ?? periodLabel}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {lastUpdated && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={() => fetchData(appliedFrom, appliedTo)}
            className={`refresh-btn ${loading ? "spinning" : ""}`}>
            <svg className="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Filtro ── */}
      <div className="glass-panel p-4 mb-6 animate-fade-in"
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Linha 1: datas + atalhos */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>DE</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="date-input" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>ATÉ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="date-input" />
          </div>
          <button onClick={applyFilter}
            style={{ padding: "6px 18px", borderRadius: "8px", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontSize: "0.82rem", fontWeight: 600, border: "none", cursor: "pointer" }}>
            Aplicar
          </button>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginLeft: "4px" }}>
            {[{ label: "7d", days: 7 }, { label: "15d", days: 15 }, { label: "30d", days: 30 }].map(p => (
              <button key={p.label} onClick={() => setPreset(p.days)}
                style={{ padding: "5px 12px", borderRadius: "6px", background: "rgba(255,255,255,0.07)", color: "var(--text-secondary)", fontSize: "0.75rem", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: filtro por SDR */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span className="origin-filter__label">SDR:</span>
          {["Todos", ...MAIN_SDRS].map(sdr => {
            const meta    = AGENT_META[sdr];
            const label   = meta?.displayName || sdr;
            const isActive = sdr === "Todos" ? selectedSdr.length === 0 : selectedSdr.includes(sdr);
            const color   = meta?.color || "#7c3aed";
            const count   = sdr === "Todos"
              ? allLeads.length
              : allLeads.filter(l => l.sdr === sdr).length;
            return (
              <button
                key={sdr}
                className={`origin-chip ${isActive ? "origin-chip--active" : ""}`}
                style={isActive && sdr !== "Todos" ? { borderColor: color + "80", color } : {}}
                onClick={() => {
                  if (sdr === "Todos") {
                    setSelectedSdr([]);
                  } else {
                    setSelectedSdr(prev => {
                      const next = prev.includes(sdr) ? prev.filter(s => s !== sdr) : [...prev, sdr];
                      return next;
                    });
                  }
                  setSelectedOrigem("Todos");
                }}
              >
                {sdr === "Todos" ? "Todos" : label}
                <span style={{ marginLeft: "3px", fontWeight: 700, fontSize: "0.7rem" }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Linha 3: filtro por Origem */}
        {allOrigins.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="origin-filter__label">Origem:</span>
            {["Todos", ...allOrigins].map((origem, idx) => {
              const isActive = selectedOrigem === origem;
              const color = ORIGIN_COLOR_MAP[origem] || ORIGIN_COLORS[(idx - 1 + ORIGIN_COLORS.length) % ORIGIN_COLORS.length];
              const count = origem === "Todos"
                ? sdrFilteredLeads.length
                : sdrFilteredLeads.filter(l => l.origem === origem).length;
              return (
                <button
                  key={origem}
                  className={`origin-chip ${isActive ? "origin-chip--active" : ""}`}
                  style={isActive && origem !== "Todos" ? { borderColor: color + "80", color } : {}}
                  onClick={() => setSelectedOrigem(origem)}
                >
                  {origem === "Todos" ? "Todas origens" : origem}
                  <span style={{ marginLeft: "3px", fontWeight: 700, fontSize: "0.7rem" }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Estado inicial de carregamento ── */}
      {loading && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: "40vh" }}>
          <div className="loading-spinner" />
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Carregando dados…</p>
        </div>

      ) : error ? (
        <div className="glass-panel p-6 text-center" style={{ color: "#f87171" }}>
          <p style={{ fontWeight: 600 }}>Erro ao carregar dados</p>
          <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>{error}</p>
          <button onClick={() => fetchData(appliedFrom, appliedTo)}
            style={{ marginTop: "12px", padding: "6px 16px", borderRadius: "8px", background: "rgba(248,113,113,0.15)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.3)", fontSize: "0.8rem", cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>

      ) : (
        /* wrapper com overlay semitransparente no re-fetch */
        <div style={{ position: "relative" }}>

          {loading && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10, borderRadius: "12px",
              background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div className="loading-spinner" />
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Atualizando…</span>
              </div>
            </div>
          )}

          {/* ── KPIs ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" }}
            className="animate-fade-in">
            {[
              { label: "Total Leads",        value: totalLeads,     color: "#3b82f6", sub: periodLabel },
              { label: "Convertidos",        value: totalConverted, color: "#a78bfa", sub: `🏆 ${totalAgenciado} ag. · 🤝 ${totalConviteAc} convites` },
              { label: "Taxa de Conversão",  value: `${convRate}%`, color: "#10b981", sub: `🏆 ${totalAgenciado} ag. · 🤝 ${totalConviteAc} conv. aceitos` },
              { label: "Média Diária",       value: avgDaily,       color: "#f97316", sub: `${totalConverted} conv. ÷ ${numDays} dias úteis` },
            ].map(k => (
              <div key={k.label} className="glass-panel p-5" style={{ borderTop: `3px solid ${k.color}` }}>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{k.label}</p>
                <p style={{ fontSize: "2rem", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Charts grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>

            {/* Leads por Dia + Tendência — gráfico unificado */}
            <div className="glass-panel p-6 animate-fade-in">
              <div style={{ marginBottom: "4px" }}>
                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>📅 Leads por Dia · Agenciados · Conv %</h2>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>Barras = agenciados por origem · Linha verde = total leads · Linha roxa = taxa de conversão</p>
              </div>
              <LeadsAndTrendChart dailyData={dailyData} originColors={originColors} selectedOrigem={selectedOrigem} onOriginClick={setSelectedOrigem} />
            </div>

            {/* Leads por Dia por Fase (com filtro de SDR) */}
            <div className="glass-panel p-6 animate-fade-in">
              <div style={{ marginBottom: "12px" }}>
                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>🔵 Leads por Dia · Por Fase · Conv %</h2>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>Barras = leads por fase · Filtro por SDR</p>
              </div>
              <LeadsAndTrendByFaseChart
                mainLeads={mainLeads}
                appliedFrom={appliedFrom}
                appliedTo={appliedTo}
                agentMeta={AGENT_META}
                allSdrs={MAIN_SDRS}
              />
            </div>

            {/* Gráfico combinado: todos os SDRs */}
            <div className="glass-panel p-6 animate-fade-in">
              <div style={{ marginBottom: "4px" }}>
                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>👥 Leads por Dia · Agenciados por SDR · Conv %</h2>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>Barras = agenciados por SDR · Linha azul = total leads · Linha roxa = taxa de conversão</p>
              </div>
              <LeadsAndTrendBySdrChart dailyData={dailyData} agentMeta={AGENT_META} humanSdrs={HUMAN_SDRS} />
            </div>

            {/* Gráficos individuais por SDR — lado a lado */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "20px" }}>
              {HUMAN_SDRS.map(sdr => (
                <div key={sdr} className="glass-panel p-6 animate-fade-in">
                  <div style={{ marginBottom: "4px" }}>
                    <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: AGENT_META[sdr]?.color || "var(--text-primary)" }}>
                      {AGENT_META[sdr]?.displayName || sdr}
                    </h2>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>
                      Leads/dia · Agenciados/dia · Taxa de conversão
                    </p>
                  </div>
                  <LeadsAndTrendBySdrChart
                    dailyData={dailyData}
                    agentMeta={AGENT_META}
                    humanSdrs={HUMAN_SDRS}
                    filterSdr={sdr}
                    dailyBySdr={dailyBySdr}
                  />
                </div>
              ))}
            </div>

            {/* Performance diária detalhada por SDR (tabela + grouped bars) */}
            <div className="glass-panel p-6 animate-fade-in">
              <div style={{ marginBottom: "12px" }}>
                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>📊 Performance Diária por SDR</h2>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>Leads e agenciados por SDR por dia · clique no toggle para alternar</p>
              </div>
              <SdrDailyChart dailyBySdr={dailyBySdr} humanSdrs={HUMAN_SDRS} agentMeta={AGENT_META} />
            </div>

            {/* 2 colunas — responsivo via auto-fit */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>

              {/* Origem dos leads */}
              <div className="glass-panel p-6 animate-fade-in">
                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>🌐 Origem dos Leads</h2>
                <OriginDonut origins={originBreakdown} originColors={originColors} selectedOrigem={selectedOrigem} onOriginClick={setSelectedOrigem} />
                {originBreakdown.length > 0 && (
                  <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                      Conversão por origem
                    </p>
                    {(() => {
                      const maxConv   = Math.max(1, ...originBreakdown.map(x => x.converted));
                      const totalConv = originBreakdown.reduce((s, x) => s + x.converted, 0);
                      return originBreakdown.map(o => {
                        const sharePct = totalConv > 0 ? ((o.converted / totalConv) * 100).toFixed(0) : "0";
                        return (
                          <MiniBar key={o.name} label={o.name} value={o.converted}
                            max={maxConv}
                            color={originColors[o.name] || "#7c3aed"}
                            sub={`/ ${o.count} (${o.rate}%)`}
                            shareLabel={`${sharePct}%`} />
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Performance SDR */}
              <div className="glass-panel p-6 animate-fade-in">
                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>👤 Performance SDR</h2>
                <SdrConversionChart sdrStats={sdrStats} meta={AGENT_META} selectedSdr={selectedSdr} onSdrClick={setSelectedSdr} />
                <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
                  <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["SDR", "Leads", "Conv.", "Taxa", "Perdidos"].map(h => (
                          <th key={h} style={{ textAlign: h === "SDR" ? "left" : "right", color: "var(--text-muted)", fontWeight: 500, paddingBottom: "6px", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sdrStats.map(s => {
                        const m = AGENT_META[s.name];
                        if (m?.isAI) return null;
                        const rate = s.total > 0 ? ((s.converted / s.total) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={s.name}>
                            <td style={{ padding: "5px 0", color: "var(--text-primary)", fontWeight: 600 }}>{m?.displayName || s.name}</td>
                            <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>{s.total}</td>
                            <td style={{ textAlign: "right", color: m?.color || "#a78bfa", fontWeight: 700 }}>{s.converted}</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: Number(rate) >= 10 ? "#10b981" : Number(rate) >= 5 ? "#f59e0b" : "#f87171" }}>
                              {rate}%
                            </td>
                            <td style={{ textAlign: "right", color: "#f87171" }}>{s.lost}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Funil de fases — com abas Geral / SDRs / IA */}
            <div className="glass-panel p-6 animate-fade-in" style={{ position: "relative" }}>

              {/* Cabeçalho: título + abas */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>🔽 Funil de Fases</h2>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[
                    { key: "geral", label: "Geral" },
                    { key: "sdrs",  label: "👤 SDRs" },
                    { key: "ia",    label: "🤖 IA" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFunnelView(tab.key)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: funnelView === tab.key ? 700 : 400,
                        border: funnelView === tab.key
                          ? "1px solid rgba(124,58,237,0.6)"
                          : "1px solid rgba(255,255,255,0.1)",
                        background: funnelView === tab.key
                          ? "rgba(124,58,237,0.25)"
                          : "rgba(255,255,255,0.05)",
                        color: funnelView === tab.key ? "#a78bfa" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legenda dos SDRs ativos na aba */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                {activeFunnelSdrs.map(sdr => (
                  <div key={sdr} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: AGENT_META[sdr]?.color || "#64748b" }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{AGENT_META[sdr]?.displayName || sdr}</span>
                  </div>
                ))}
              </div>

              {/* Funil kanban — fases alinhadas */}
              <KanbanFunnel
                funnelData={alignedFunnelData}
                funnelView={funnelView}
                activeFunnelSdrs={activeFunnelSdrs}
                selectedSdr={selectedSdr}
                onSdrClick={setSelectedSdr}
              />

              {/* Divisor acumulativo */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "24px", paddingTop: "20px" }}>
                <div style={{ marginBottom: "14px" }}>
                  <h3 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>🔼 Funil Acumulativo</h3>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "3px" }}>
                    Cada fase inclui todos os leads que chegaram até ela ou passaram adiante
                  </p>
                </div>
                <KanbanFunnel
                  funnelData={alignedCumulativeData}
                  funnelView={funnelView}
                  activeFunnelSdrs={activeFunnelSdrs}
                  selectedSdr={selectedSdr}
                  onSdrClick={setSelectedSdr}
                />
              </div>
            </div>

            {/* ── Heatmaps lado a lado ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px,1fr))", gap: "20px" }}>
              <div className="glass-panel p-6 animate-fade-in">
                <div style={{ marginBottom: "14px" }}>
                  <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>🗓 Heatmap — Total de Leads</h2>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>Cada célula = 1 dia · Cor mais intensa = mais leads</p>
                </div>
                <WeekHeatmap heatmapData={heatmapData} appliedFrom={appliedFrom} appliedTo={appliedTo} />
              </div>
              <div className="glass-panel p-6 animate-fade-in">
                <div style={{ marginBottom: "14px" }}>
                  <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>🟢 Heatmap — Agenciados</h2>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>Cada célula = 1 dia · Cor mais intensa = mais agenciados</p>
                </div>
                <WeekHeatmap heatmapData={heatmapAgenciados} appliedFrom={appliedFrom} appliedTo={appliedTo} color="16,185,129" label="agenciados" />
              </div>
            </div>

            {/* ── Radar ── */}
            <div className="glass-panel p-6 animate-fade-in">
              <div style={{ marginBottom: "14px" }}>
                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>🕸 Perfil por SDR</h2>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>Volume · Conversão · Qualificados · Agenciados · Convites</p>
              </div>
              <RadarChartSdr sdrStats={sdrStats} />
            </div>

          </div> {/* fim charts grid */}
        </div>   /* fim wrapper overlay */
      )}
    </div>
  );
}
