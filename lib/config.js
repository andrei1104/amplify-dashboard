/**
 * Constantes e helpers compartilhados entre DashboardView, CustosView e AnaliseView.
 * Altere aqui para refletir em todas as páginas automaticamente.
 */

// ─── Navegação ────────────────────────────────────────────────
export const NAV_TABS = [
  { href: "/",                    label: "Hoje",         icon: "☀️" },
  { href: "/analise",             label: "Análise Entradas",     icon: "📊" },
  { href: "/analise-modificacao", label: "Análise Atendimentos", icon: "🔄" },
  { href: "/metricas",            label: "Métricas",     icon: "🎯" },
  { href: "/custos",              label: "Custos",       icon: "💰" },
];

// ─── SDRs ativos ──────────────────────────────────────────────
// Adicione ou remova nomes conforme o time muda.
export const MAIN_SDRS = ["Nicole Freitas", "Bruno Zardo", "Andrei Archer"];

// ─── Metadados por agente ─────────────────────────────────────
// "Andrei Archer" = conta da IA N8N que captura e classifica leads.
// isAI: true → aparece em seção separada no Dashboard com aviso de "idealmente zerado".
export const AGENT_META = {
  "Nicole Freitas": {
    displayName: "Nicole Freitas",
    role:        "SDR",
    isAI:        false,
    avatarClass: "sdr-avatar--nicole",
    accentColor: "#ec4899",
    color:       "#ec4899",
  },
  "Bruno Zardo": {
    displayName: "Bruno Zardo",
    role:        "SDR",
    isAI:        false,
    avatarClass: "sdr-avatar--bruno",
    accentColor: "#10b981",
    color:       "#10b981",
  },
  "Andrei Archer": {
    displayName: "IA · Amplify",
    role:        "Bot N8N",
    isAI:        true,
    avatarClass: "sdr-avatar--ai",
    accentColor: "#7c3aed",
    color:       "#7c3aed",
  },
};

// ─── Cores de origens — regras fixas por canal ───────────────
// Ads*          → azul   (#3b82f6)
// Orgânico*     → roxo   (#a855f7)
// Outbound      → verde  (#10b981)
// Indique/Ganhe → amarelo(#eab308)
// Live/Treino/UGC → vermelho (#ef4444)
// Demais (contratos, origem desconhecida) → cinza (#64748b)
export const ORIGIN_COLOR_MAP = {
  // Azul — Ads
  "Ads TikTok":                   "#3b82f6",
  "Ads Meta":                     "#3b82f6",
  // Roxo — Orgânicos
  "Orgânico Meta":                "#a855f7",
  "Orgânico TikTok":              "#a855f7",
  "Orgânico Site Amplify":        "#a855f7",
  "Instagram Orgânico":           "#a855f7",
  // Verde — Outbound
  "Outbound":                     "#10b981",
  // Amarelo — Indicação
  "Programa Indique e Ganhe":     "#eab308",
  "Indicadora Amplify":           "#eab308",
  // Vermelho — Live / Treinamento / UGC
  "Live tiktok":                  "#ef4444",
  "Live TikTok":                  "#ef4444",
  "Treinamento China":            "#ef4444",
  "Base UGC":                     "#ef4444",
  // Cinza — Contratos, desconhecidos e sem origem
  "Origem Desconhecida":          "#64748b",
  "Desconhecido":                 "#64748b",
  "Segunda conta":                "#64748b",
  "Contrato Expirado":            "#64748b",
  "Contrato Prestes à expirar":   "#64748b",
  "Sem origem":                   "#64748b",
};

// Paleta fallback para origens não mapeadas
export const ORIGIN_COLORS = [
  "#3b82f6", "#a855f7", "#10b981", "#eab308",
  "#ef4444", "#64748b", "#f97316", "#22d3ee",
  "#6366f1", "#14b8a6", "#84cc16", "#e879f9",
];

// ─── Cores oficiais por fase (equivale às tags do Notion) ────
export const FASE_COLOR = {
  "Não respondeu":                  "#64748b",
  "< 2000 seguidores":              "#f97316",
  "Em progresso":                   "#3b82f6",
  "Em progresso (Atendido)":        "#60a5fa",
  "Qualificado":                    "#a855f7",
  "Qualificado (Atendido)":         "#c084fc",
  "Enviar Convite":                 "#ec4899",
  "Enviar Convite (Atendido)":      "#f472b6",
  "Convite Enviado":                "#eab308",
  "Convite Aceito":                 "#14b8a6",
  "Agenciado":                      "#10b981",
  "Não tem interesse":              "#ef4444",
  "Já tem agência (Não quer sair)": "#78716c",
  "Já tem agência":                 "#78716c",
  "Já tem agenda":                  "#92400e",
};
export const getFaseColor = (fase) => FASE_COLOR[fase] || "#64748b";

// ─── Fases que indicam conversão ─────────────────────────────
export const CONVERTED_STAGES = ["agenciado", "convite aceito"];

export const isConverted = (fase) => {
  if (!fase) return false;
  const f = fase.toLowerCase();
  return CONVERTED_STAGES.some(s => f.includes(s));
};

// ─── Fases que indicam perda ──────────────────────────────────
export const LOSS_PHASES = [
  "Não respondeu",
  "< 2000 seguidores",
  "Não tem interesse",
  "Já tem agência (Não quer sair)",
  "Já tem agência",
  "Já tem agenda",
];

// ─── Ordem do funil ───────────────────────────────────────────
export const FASES_ORDER = [
  "Não respondeu",
  "< 2000 seguidores",
  "Em progresso",
  "Em progresso (Atendido)",
  "Qualificado",
  "Qualificado (Atendido)",
  "Enviar Convite",
  "Enviar Convite (Atendido)",
  "Convite Enviado",
  "Convite Aceito",
  "Agenciado",
  "Não tem interesse",
  "Já tem agência (Não quer sair)",
  "Já tem agência",
  "Já tem agenda",
];

// ─── Helpers de data ──────────────────────────────────────────
/** Formata um objeto Date como "YYYY-MM-DD" sem depender de timezone UTC. */
export const toLocalDate = (d) =>
  d.getFullYear() + "-" +
  String(d.getMonth() + 1).padStart(2, "0") + "-" +
  String(d.getDate()).padStart(2, "0");

/** Formata "YYYY-MM-DD" → "DD/MM/YYYY" */
export const fmtDate = (ds) => ds.split("-").reverse().join("/");

// ─── Helpers de extração de propriedades Notion ───────────────
export const extractValue = (prop) => {
  if (!prop) return "Desconhecido";
  if (prop.type === "people"    && prop.people?.length > 0)   return prop.people[0].name;
  if (prop.type === "select"    && prop.select)                return prop.select.name;
  if (prop.type === "status"    && prop.status)                return prop.status.name;
  if (prop.type === "title"     && prop.title?.length > 0)     return prop.title[0].plain_text;
  if (prop.type === "rich_text" && prop.rich_text?.length > 0) return prop.rich_text[0].plain_text;
  return "Desconhecido";
};

export const extractDateProp = (prop) => {
  if (!prop) return null;
  if (prop.type === "date" && prop.date?.start) return prop.date.start.slice(0, 10);
  return null;
};

export const extractProp = (prop) => {
  if (!prop) return null;
  if (prop.type === "title"        && prop.title?.length > 0)        return prop.title[0].plain_text;
  if (prop.type === "rich_text"    && prop.rich_text?.length > 0)    return prop.rich_text[0].plain_text;
  if (prop.type === "select"       && prop.select)                    return prop.select.name;
  if (prop.type === "multi_select" && prop.multi_select?.length > 0)
    return prop.multi_select.map(s => s.name).join(", ");
  if (prop.type === "number")                                         return prop.number;
  if (prop.type === "date"         && prop.date)                      return prop.date.start;
  if (prop.type === "people"       && prop.people?.length > 0)       return prop.people[0].name;
  if (prop.type === "status"       && prop.status)                    return prop.status.name;
  return null;
};
