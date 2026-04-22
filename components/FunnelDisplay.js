"use client";

/**
 * FunnelDisplay — Visualização do funil de conversão
 *
 * Props:
 *   phaseData   {Object}  — { [faseName]: count } com totais globais
 *   totalLeads  {number}  — total de leads para calcular percentual
 *   title       {string}  — título do card (padrão: "Funil de Conversão")
 */

// Definição das etapas do funil com cores e agrupamento
const PIPELINE_STAGES = [
  { key: "Em progresso",          label: "Em progresso",            bar: "bar--em-progresso",    aliases: ["Em progresso", "Em progresso (Atendido)"] },
  { key: "Qualificado",           label: "Qualificado",             bar: "bar--qualificado",     aliases: ["Qualificado", "Qualificado (Atendido)"] },
  { key: "Enviar Convite",        label: "Enviar Convite",          bar: "bar--enviar-convite",  aliases: ["Enviar Convite", "Enviar Convite (Atendido)"] },
  { key: "Convite Enviado",       label: "Convite Enviado",         bar: "bar--convite-enviado", aliases: ["Convite Enviado"] },
  { key: "Convite Aceito",        label: "Convite Aceito",          bar: "bar--convite-aceito",  aliases: ["Convite Aceito"] },
  { key: "Agenciado",             label: "✓ Agenciado",             bar: "bar--agenciado",       aliases: ["Agenciado"] },
];

const LOSS_STAGES = [
  { key: "Não respondeu",         label: "Não respondeu",           bar: "bar--nao-respondeu",   aliases: ["Não respondeu"] },
  { key: "< 2000 seguidores",     label: "< 2k seguidores",         bar: "bar--baixo-seg",       aliases: ["< 2000 seguidores"] },
  { key: "Não tem interesse",     label: "Sem interesse",           bar: "bar--sem-interesse",   aliases: ["Não tem interesse"] },
  { key: "Já tem agência",        label: "Já tem agência",          bar: "bar--ja-tem-agencia",  aliases: ["Já tem agência", "Já tem agência (Não quer sair)", "Já tem agenda"] },
];

// Soma os aliases de um estágio no phaseData
function sumAliases(phaseData, aliases) {
  return aliases.reduce((acc, alias) => acc + (phaseData[alias] || 0), 0);
}

// Calcula a taxa de conversão entre duas etapas adjacentes
function convRate(fromCount, toCount) {
  if (!fromCount || fromCount === 0) return null;
  return ((toCount / fromCount) * 100).toFixed(0);
}

export default function FunnelDisplay({ phaseData = {}, totalLeads = 0, title = "Funil de Conversão" }) {
  const maxPipeline = Math.max(
    1,
    ...PIPELINE_STAGES.map(s => sumAliases(phaseData, s.aliases))
  );

  const maxLoss = Math.max(
    1,
    ...LOSS_STAGES.map(s => sumAliases(phaseData, s.aliases))
  );

  // Montar dados com contagem real
  const pipelineData = PIPELINE_STAGES.map(s => ({
    ...s,
    count: sumAliases(phaseData, s.aliases),
  }));

  const lossData = LOSS_STAGES.map(s => ({
    ...s,
    count: sumAliases(phaseData, s.aliases),
  }));

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <p className="section-label">{title}</p>

      {/* ── Etapas do pipeline ─── */}
      <div className="funnel-section-label">Pipeline ativo</div>

      <div className="flex flex-col gap-3">
        {pipelineData.map((stage, idx) => {
          const pct = ((stage.count / maxPipeline) * 100).toFixed(1);
          const prevCount = idx > 0 ? pipelineData[idx - 1].count : null;
          const rate = prevCount !== null ? convRate(prevCount, stage.count) : null;

          return (
            <div key={stage.key}>
              {/* Taxa de conversão entre etapas */}
              {rate !== null && (
                <div className="flex items-center gap-1 mb-1 pl-1" style={{ paddingLeft: "174px" }}>
                  <span style={{ fontSize: "0.6rem", color: "var(--accent-violet)" }}>↓</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--accent-violet)", fontWeight: 600 }}>
                    {rate}% conversão
                  </span>
                </div>
              )}
              <div className="funnel-stage">
                <span className="funnel-stage__label">{stage.label}</span>
                <div className="funnel-stage__track">
                  <div
                    className={`funnel-stage__bar ${stage.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="funnel-stage__count">{stage.count}</span>
                <span className="funnel-stage__pct">
                  {totalLeads > 0 ? ((stage.count / totalLeads) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="funnel-divider" />

      {/* ── Leads perdidos / descartados ─── */}
      <div className="funnel-section-label">Descartados / Não avançaram</div>

      <div className="flex flex-col gap-3">
        {lossData.map(stage => {
          const pct = ((stage.count / maxLoss) * 100).toFixed(1);
          return (
            <div key={stage.key} className="funnel-stage">
              <span className="funnel-stage__label">{stage.label}</span>
              <div className="funnel-stage__track">
                <div
                  className={`funnel-stage__bar ${stage.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="funnel-stage__count">{stage.count}</span>
              <span className="funnel-stage__pct">
                {totalLeads > 0 ? ((stage.count / totalLeads) * 100).toFixed(0) : 0}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
