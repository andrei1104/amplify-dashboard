"use client";

/**
 * KpiCard — Card de métrica individual
 *
 * Props:
 *   label      {string}  — rótulo curto em caixa alta
 *   value      {string|number} — valor principal exibido em destaque
 *   sub        {string}  — texto de suporte abaixo do valor (opcional)
 *   icon       {string}  — emoji ou símbolo exibido no ícone
 *   color      {string}  — 'purple' | 'blue' | 'green' | 'yellow' | 'cyan' | 'pink'
 */
export default function KpiCard({ label, value, sub, icon, color = "purple" }) {
  return (
    <div className="glass-panel kpi-card p-6">
      {/* Ícone */}
      <div className={`kpi-icon kpi-icon--${color}`}>
        {icon}
      </div>

      {/* Rótulo */}
      <p className="kpi-label">{label}</p>

      {/* Valor principal */}
      <p className={`kpi-value kpi-value--${color}`}>{value}</p>

      {/* Subtexto opcional */}
      {sub && <p className="kpi-sub">{sub}</p>}

      {/* Glow de fundo decorativo */}
      <div className={`kpi-glow kpi-glow--${color}`} aria-hidden="true" />
    </div>
  );
}
