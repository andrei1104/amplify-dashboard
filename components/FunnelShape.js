"use client";

/**
 * FunnelShape — Funil visual estilo Salesforce
 * Trapézios conectados, valores dentro de cada bloco, conversão entre etapas.
 */

const PIPELINE = [
  { keys: ["Em progresso", "Em progresso (Atendido)"],        label: "Em progresso",    color1: "#3b82f6", color2: "#2563eb" },
  { keys: ["Qualificado",  "Qualificado (Atendido)"],          label: "Qualificado",     color1: "#4f46e5", color2: "#4338ca" },
  { keys: ["Enviar Convite","Enviar Convite (Atendido)"],       label: "Enviar Convite",  color1: "#7c3aed", color2: "#6d28d9" },
  { keys: ["Convite Enviado"],                                 label: "Convite Enviado", color1: "#8b5cf6", color2: "#7c3aed" },
  { keys: ["Convite Aceito"],                                  label: "Convite Aceito",  color1: "#0891b2", color2: "#0e7490" },
  { keys: ["Agenciado"],                                       label: "✓ Agenciado",     color1: "#10b981", color2: "#059669" },
];

const LOSSES = [
  { keys: ["Não respondeu"],                                                      label: "Não respondeu" },
  { keys: ["< 2000 seguidores"],                                                  label: "< 2k seg."     },
  { keys: ["Não tem interesse"],                                                  label: "Sem interesse" },
  { keys: ["Já tem agência", "Já tem agência (Não quer sair)", "Já tem agenda"], label: "Já tem agência"},
];

function sumKeys(phaseData, keys) {
  return keys.reduce((acc, k) => acc + (phaseData[k] || 0), 0);
}

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return String(n);
}

/**
 * Converte contagens de fase (current stage) em contagens CUMULATIVAS.
 * Cada etapa = leads nessa etapa + todos que já avançaram além dela.
 *
 * Ex: Em progresso (64) + Qualificado (42) + Enviar Convite (42) + ...
 *     → Em progresso acumula TODOS que entraram no pipeline
 *
 * @param {Array} stages - [{count, ...}] em ordem top→bottom do funil
 * @returns {Array} stages com count substituído pelo cumulativo
 */
function toCumulative(stages) {
  return stages.map((stage, i) => ({
    ...stage,
    rawCount: stage.count,  // guarda o valor original para tooltip
    count: stages.slice(i).reduce((acc, s) => acc + s.count, 0),
  }));
}

export default function FunnelShape({ phaseData = {}, totalLeads = 0, title = "Funil Visual" }) {
  // Contagens brutas por fase (leads ATUALMENTE em cada etapa)
  const rawStages = PIPELINE.map(s => ({
    ...s,
    count: sumKeys(phaseData, s.keys),
  }));

  // Contagens CUMULATIVAS: cada etapa inclui os que avançaram além dela.
  // Isso reflete corretamente "quantos leads já passaram por esta etapa".
  const stages = toCumulative(rawStages);

  // Total cumulativo = topo do funil (todos que entraram no pipeline)
  const funnelTotal = stages[0]?.count || totalLeads || 1;

  const lossStages = LOSSES.map(s => ({
    ...s,
    count: sumKeys(phaseData, s.keys),
  })).filter(s => s.count > 0);

  const N     = stages.length;
  const SVG_W = 520;
  const ST_H  = 62;   // altura de cada bloco
  const GAP   = 22;   // gap entre blocos (para o texto de conversão)
  const TOP_W = 480;  // largura do primeiro bloco
  const BOT_W = 72;   // largura do último bloco

  // Largura do topo do estágio i
  const wAt = (i) => TOP_W - (i / N) * (TOP_W - BOT_W);
  // Y do topo do estágio i
  const yAt = (i) => i * (ST_H + GAP);

  const CX          = SVG_W / 2;
  const FUNNEL_H    = N * ST_H + (N - 1) * GAP;
  const LEGEND_Y    = FUNNEL_H + 28;

  // Perdas — uma mini linha por categoria
  const LOSS_H      = lossStages.length > 0 ? 14 + lossStages.length * 22 : 0;
  const TOTAL_SVG_H = LEGEND_Y + (lossStages.length > 0 ? 12 + LOSS_H : 0);

  const maxLoss = Math.max(1, ...lossStages.map(s => s.count));

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <p className="section-label">{title}</p>

      <svg
        viewBox={`0 0 ${SVG_W} ${TOTAL_SVG_H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          {stages.map((s, i) => (
            <linearGradient key={i} id={`fgrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={s.color1} />
              <stop offset="100%" stopColor={s.color2} />
            </linearGradient>
          ))}
          {/* Glow para o último bloco (Agenciado) */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Blocos do funil ── */}
        {stages.map((stage, i) => {
          const topW  = wAt(i);
          const botW  = wAt(i + 1);
          const y     = yAt(i);
          const midY  = y + ST_H / 2;

          const tl = [CX - topW / 2, y];
          const tr = [CX + topW / 2, y];
          const br = [CX + botW / 2, y + ST_H];
          const bl = [CX - botW / 2, y + ST_H];

          const d = `M${tl[0]},${tl[1]} L${tr[0]},${tr[1]} L${br[0]},${br[1]} L${bl[0]},${bl[1]}Z`;

          // pct em relação ao topo do funil (estágio 0, que é o total acumulado)
          const pct      = funnelTotal > 0 ? Math.round((stage.count / funnelTotal) * 100) : 0;
          // taxa de conversão: quantos % dos leads da etapa anterior chegaram aqui
          const prev     = i > 0 ? stages[i - 1].count : null;
          const convRate = prev && prev > 0 ? Math.round((stage.count / prev) * 100) : null;

          const avgW     = (topW + botW) / 2;
          const isNarrow = avgW < 160;

          const isLast   = i === N - 1;

          return (
            <g key={stage.label}>
              {/* Sombra sutil abaixo do bloco */}
              <path
                d={`M${tl[0]+2},${tl[1]+2} L${tr[0]+2},${tr[1]+2} L${br[0]+2},${br[1]+2} L${bl[0]+2},${bl[1]+2}Z`}
                fill="rgba(0,0,0,0.25)"
              />

              {/* Trapézio principal */}
              <path
                d={d}
                fill={`url(#fgrad${i})`}
                filter={isLast ? "url(#glow)" : undefined}
              />

              {/* Borda superior fina */}
              <line
                x1={tl[0]} y1={tl[1]} x2={tr[0]} y2={tr[1]}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1.2"
              />

              {/* Textos dentro do bloco */}
              {!isNarrow ? (
                <>
                  {/* Nome da fase */}
                  <text
                    x={CX} y={midY - 13}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.82)"
                    fontSize="11.5"
                    fontWeight="600"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {stage.label}
                  </text>

                  {/* Contagem cumulativa principal */}
                  <text
                    x={CX} y={midY + 6}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="20"
                    fontWeight="800"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {fmt(stage.count)}
                  </text>

                  {/* Percentual + contagem bruta da fase */}
                  <text
                    x={CX} y={midY + 21}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.45)"
                    fontSize="9.5"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {pct}%
                    {stage.rawCount !== stage.count
                      ? `  ·  ${stage.rawCount} nesta fase`
                      : "  ·  topo do funil"}
                  </text>
                </>
              ) : (
                <>
                  {/* Bloco estreito: só o número, label fora à direita */}
                  <text
                    x={CX} y={midY + 6}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="14"
                    fontWeight="800"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {fmt(stage.count)}
                  </text>

                  {/* Label externo à direita com linha */}
                  <line
                    x1={CX + botW / 2 + 4} y1={midY}
                    x2={CX + botW / 2 + 24} y2={midY}
                    stroke="rgba(255,255,255,0.2)" strokeWidth="1"
                  />
                  <text
                    x={CX + botW / 2 + 28} y={midY + 4}
                    textAnchor="start"
                    fill="rgba(255,255,255,0.65)"
                    fontSize="10.5"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {stage.label.replace("✓ ", "")} · {fmt(stage.count)} · {pct}%
                  </text>
                </>
              )}

              {/* Taxa de conversão no gap entre estágios */}
              {convRate !== null && (
                <g>
                  {/* Seta */}
                  <text
                    x={CX - 24} y={y - GAP / 2 + 6}
                    textAnchor="middle"
                    fill="rgba(167,139,250,0.7)"
                    fontSize="10"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    ↓
                  </text>
                  {/* Texto */}
                  <text
                    x={CX - 8} y={y - GAP / 2 + 6}
                    textAnchor="start"
                    fill="#a78bfa"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {convRate}% conversão
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ── Divisor + legenda ── */}
        <line
          x1={0} y1={LEGEND_Y - 12}
          x2={SVG_W} y2={LEGEND_Y - 12}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1"
        />

        <text
          x={0} y={LEGEND_Y}
          fill="rgba(255,255,255,0.25)"
          fontSize="9.5"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          style={{ letterSpacing: "1px", textTransform: "uppercase" }}
        >
          ETAPA
        </text>

        {/* Dots de legenda */}
        {stages.map((s, i) => (
          <g key={s.label + "-leg"} transform={`translate(${i * (SVG_W / N)}, ${LEGEND_Y + 14})`}>
            <circle cx="5" cy="0" r="4" fill={s.color1} />
            <text
              x={13} y={4}
              fill="rgba(255,255,255,0.45)"
              fontSize="9"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {s.label.replace("✓ ", "")}
            </text>
          </g>
        ))}

        {/* ── Descartados ── */}
        {lossStages.length > 0 && (() => {
          const baseY = LEGEND_Y + 34;
          return (
            <g>
              <text
                x={0} y={baseY}
                fill="rgba(255,255,255,0.25)"
                fontSize="9.5"
                fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif"
                style={{ letterSpacing: "1px" }}
              >
                DESCARTADOS
              </text>

              {lossStages.map((ls, li) => {
                const barMaxW = SVG_W * 0.6;
                const barW    = Math.max(6, (ls.count / maxLoss) * barMaxW);
                const ly      = baseY + 14 + li * 22;
                const pct     = totalLeads > 0 ? Math.round((ls.count / totalLeads) * 100) : 0;
                return (
                  <g key={ls.label}>
                    {/* Label */}
                    <text
                      x={0} y={ly + 8}
                      fill="rgba(255,255,255,0.4)"
                      fontSize="10"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {ls.label}
                    </text>
                    {/* Barra */}
                    <rect
                      x={120} y={ly}
                      width={barW} height={12}
                      rx="3"
                      fill="rgba(239,68,68,0.55)"
                    />
                    {/* Count + pct */}
                    <text
                      x={120 + barW + 8} y={ly + 9}
                      fill="rgba(255,255,255,0.5)"
                      fontSize="10"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {ls.count} · {pct}%
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
