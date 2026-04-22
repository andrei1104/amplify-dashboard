"use client";

/**
 * SdrTable — Tabela comparativa de SDRs
 *
 * Props:
 *   sdrStats  {Array} — array de objetos:
 *     { name, total, agenciados, qualificados, enviarConvite, conviteEnviado, conviteAceito, descartados }
 *   maxTotal  {number} — valor máximo de total para calcular mini-barra
 */

// Metadados de exibição — espelhado do DashboardView para manter consistência
const AGENT_META = {
  "Nicole Freitas": { displayName: "Nicole Freitas", role: "SDR",      isAI: false, avatarClass: "sdr-avatar--nicole" },
  "Bruno Zardo":    { displayName: "Bruno Zardo",    role: "SDR",      isAI: false, avatarClass: "sdr-avatar--bruno"  },
  "Andrei Archer":  { displayName: "IA · Amplify",   role: "Bot N8N",  isAI: true,  avatarClass: "sdr-avatar--ai"     },
};

function getAgentMeta(name) {
  return AGENT_META[name] || { displayName: name, role: "SDR", isAI: false, avatarClass: "sdr-avatar--default" };
}

function convBadgeClass(rate) {
  const n = parseFloat(rate);
  if (isNaN(n) || n === 0) return "conv-badge--zero";
  if (n >= 15) return "conv-badge--high";
  if (n >= 7)  return "conv-badge--mid";
  return "conv-badge--low";
}

export default function SdrTable({ sdrStats = [], maxTotal = 1 }) {
  if (sdrStats.length === 0) {
    return (
      <div className="glass-panel p-6 flex flex-col gap-3">
        <p className="section-label">Performance por SDR</p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
          Nenhum dado disponível para o período selecionado.
        </p>
      </div>
    );
  }

  // Calcula totais globais para a linha de rodapé
  const totalRow = sdrStats.reduce(
    (acc, s) => ({
      total:          acc.total          + s.total,
      agenciados:     acc.agenciados     + s.agenciados,
      qualificados:   acc.qualificados   + s.qualificados,
      enviarConvite:  acc.enviarConvite  + s.enviarConvite,
      conviteEnviado: acc.conviteEnviado + s.conviteEnviado,
      conviteAceito:  acc.conviteAceito  + s.conviteAceito,
      descartados:    acc.descartados    + s.descartados,
    }),
    { total: 0, agenciados: 0, qualificados: 0, enviarConvite: 0, conviteEnviado: 0, conviteAceito: 0, descartados: 0 }
  );

  const totalConvRate = totalRow.total > 0
    ? ((totalRow.agenciados / totalRow.total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <p className="section-label">Performance por SDR</p>

      <div className="sdr-table-wrap">
        <table className="sdr-table">
          <thead>
            <tr>
              <th>SDR</th>
              <th style={{ textAlign: "center" }}>Total</th>
              <th style={{ textAlign: "center" }}>Qualificado</th>
              <th style={{ textAlign: "center" }}>Enviar Convite</th>
              <th style={{ textAlign: "center" }}>Convite Enviado</th>
              <th style={{ textAlign: "center" }}>Convite Aceito</th>
              <th style={{ textAlign: "center" }}>Agenciados</th>
              <th style={{ textAlign: "center" }}>Conversão</th>
              <th style={{ textAlign: "center" }}>Descartados</th>
            </tr>
          </thead>
          <tbody>
            {sdrStats.map((sdr) => {
              const meta     = getAgentMeta(sdr.name);
              const rate     = sdr.total > 0 ? ((sdr.agenciados / sdr.total) * 100).toFixed(1) : "0.0";
              const barWidth = maxTotal > 0 ? (sdr.total / maxTotal) * 100 : 0;

              return (
                <tr key={sdr.name}>
                  {/* Agente */}
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`sdr-avatar ${meta.avatarClass}`}>
                        {meta.isAI ? "🤖" : meta.displayName.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                            {meta.displayName}
                          </p>
                          {meta.isAI && <span className="ai-badge">IA</span>}
                        </div>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{meta.role}</p>
                      </div>
                    </div>
                  </td>

                  {/* Total c/ mini-barra */}
                  <td style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>{sdr.total}</p>
                    <div className="mini-track" style={{ margin: "4px auto 0" }}>
                      <div className="mini-fill" style={{ width: `${barWidth}%` }} />
                    </div>
                  </td>

                  {/* Qualificado */}
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: "#c4b5fd", fontWeight: 600 }}>{sdr.qualificados}</span>
                  </td>

                  {/* Enviar Convite */}
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: "#60a5fa", fontWeight: 600 }}>{sdr.enviarConvite}</span>
                  </td>

                  {/* Convite Enviado */}
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: "#a78bfa", fontWeight: 600 }}>{sdr.conviteEnviado}</span>
                  </td>

                  {/* Convite Aceito */}
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: "#22d3ee", fontWeight: 600 }}>{sdr.conviteAceito}</span>
                  </td>

                  {/* Agenciados */}
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: "#34d399", fontWeight: 700, fontSize: "1rem" }}>
                      {sdr.agenciados}
                    </span>
                  </td>

                  {/* Taxa de conversão */}
                  <td style={{ textAlign: "center" }}>
                    <span className={`conv-badge ${convBadgeClass(rate)}`}>
                      {rate}%
                    </span>
                  </td>

                  {/* Descartados */}
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: "#f87171" }}>{sdr.descartados}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Linha de totais */}
          {sdrStats.length > 1 && (
            <tfoot>
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <td style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Total Geral
                </td>
                <td style={{ textAlign: "center", fontWeight: 700, color: "var(--text-primary)" }}>
                  {totalRow.total}
                </td>
                <td style={{ textAlign: "center", color: "#c4b5fd", fontWeight: 600 }}>{totalRow.qualificados}</td>
                <td style={{ textAlign: "center", color: "#60a5fa", fontWeight: 600 }}>{totalRow.enviarConvite}</td>
                <td style={{ textAlign: "center", color: "#a78bfa", fontWeight: 600 }}>{totalRow.conviteEnviado}</td>
                <td style={{ textAlign: "center", color: "#22d3ee", fontWeight: 600 }}>{totalRow.conviteAceito}</td>
                <td style={{ textAlign: "center", color: "#34d399", fontWeight: 700, fontSize: "1rem" }}>
                  {totalRow.agenciados}
                </td>
                <td style={{ textAlign: "center" }}>
                  <span className={`conv-badge ${convBadgeClass(totalConvRate)}`}>
                    {totalConvRate}%
                  </span>
                </td>
                <td style={{ textAlign: "center", color: "#f87171" }}>{totalRow.descartados}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
