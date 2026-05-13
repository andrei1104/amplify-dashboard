// ─── Google Sheets — Amplify Club (Renovações de Contrato) ───────────────────
// Planilha: https://docs.google.com/spreadsheets/d/1khnNg-nGR-4lLhrlpOF2cOl2qpkj_eP2mQIU32gcEw4
// Aba: gid=893779062
// Colunas relevantes: "Expirou?" | "@ do TikTok" | "Data de Expiração" | "Remover acesso?"

const SHEET_ID = "1khnNg-nGR-4lLhrlpOF2cOl2qpkj_eP2mQIU32gcEw4";
const GID      = "893779062";

// ─── Parser CSV simples (suporta campos entre aspas) ─────────────────────────
function parseCsvRow(row) {
  const result = [];
  let current  = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── DD/MM/YYYY → YYYY-MM-DD ──────────────────────────────────────────────────
function parseBrDate(str) {
  if (!str) return null;
  const clean = str.replace(/['"]/g, "").trim();
  const parts = clean.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length < 4) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const res    = await fetch(csvUrl, { cache: "no-store" });

    if (!res.ok) {
      return Response.json(
        { error: `Erro ao buscar planilha Google Sheets (status ${res.status}). Verifique se a planilha está compartilhada publicamente.` },
        { status: 500 }
      );
    }

    const text  = await res.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      return Response.json({ success: true, data: [], byDate: {}, totals: { total: 0, renovados: 0, removidos: 0, pendentes: 0, taxaReversao: "0.0" } });
    }

    // ── Localiza a linha de cabeçalho real (a planilha tem conteúdo antes da tabela)
    // Procura a linha que contém "TikTok" OU "Expiração" OU "Remover acesso"
    const HEADER_KEYWORDS = ["tiktok", "expira", "remover acesso"];
    let headerLineIdx = -1;
    let headers = [];
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const cells = parseCsvRow(lines[i]);
      const joined = cells.join(" ").toLowerCase();
      if (HEADER_KEYWORDS.some(k => joined.includes(k))) {
        headerLineIdx = i;
        headers = cells;
        break;
      }
    }

    // Fallback: usa linha 0
    if (headerLineIdx === -1) {
      headerLineIdx = 0;
      headers = parseCsvRow(lines[0]);
    }
    console.log(`[/api/contratos] Cabeçalho na linha ${headerLineIdx}:`, headers.slice(0, 6));

    // Localiza colunas por nome (case-insensitive)
    const idx = (needle) =>
      headers.findIndex(h => h.toLowerCase().includes(needle.toLowerCase()));

    const colExpirou = idx("expirou");
    const colTikTok  = idx("tiktok") !== -1 ? idx("tiktok") : idx("@");
    const colData    = idx("expira");   // "Data de Expiração"
    const colRemover = idx("remover");  // "Remover acesso?"

    // Fallback por posição (ordem esperada: Check | Expirou? | @ | Data | ... | Remover)
    const safeIdx = (i, fallback) => (i !== -1 ? i : fallback);
    const iExpirou = safeIdx(colExpirou, 1);
    const iTikTok  = safeIdx(colTikTok,  2);
    const iData    = safeIdx(colData,    3);
    const iRemover = safeIdx(colRemover, headers.length - 1);

    const rows = [];

    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const cells = parseCsvRow(lines[i]);
      if (cells.every(c => !c)) continue; // linha vazia

      const tiktok  = cells[iTikTok]  || "";
      const dataStr = cells[iData]    || "";
      const expirou = cells[iExpirou] || "";
      const remover = cells[iRemover] || "";

      // Pula linhas sem conteúdo útil
      if (!tiktok && !dataStr) continue;

      const date       = parseBrDate(dataStr);
      const isRenovado = remover.toLowerCase().includes("renovado");
      const isRemover  = remover.toLowerCase().includes("remover") && !isRenovado;
      const isExpirado = expirou.toLowerCase().includes("expirado");

      rows.push({
        tiktok,
        date,
        expirado:  isExpirado,
        renovado:  isRenovado,
        removido:  isRemover,
        pendente:  !isRenovado && !isRemover,
      });
    }

    // ── Agrega por data ───────────────────────────────────────────────────────
    const byDate = {};
    rows.forEach(r => {
      if (!r.date) return;
      if (!byDate[r.date]) byDate[r.date] = { expirando: 0, renovados: 0, removidos: 0, pendentes: 0 };
      byDate[r.date].expirando++;
      if (r.renovado) byDate[r.date].renovados++;
      if (r.removido) byDate[r.date].removidos++;
      if (r.pendente) byDate[r.date].pendentes++;
    });

    const totalRenovados = rows.filter(r => r.renovado).length;
    const totalRemovidos = rows.filter(r => r.removido).length;
    const totalProcessed = totalRenovados + totalRemovidos;
    const taxaReversao   = totalProcessed > 0
      ? ((totalRenovados / totalProcessed) * 100).toFixed(1)
      : "0.0";

    return Response.json({
      success: true,
      data: rows,
      byDate,
      totals: {
        total:       rows.length,
        renovados:   totalRenovados,
        removidos:   totalRemovidos,
        pendentes:   rows.filter(r => r.pendente).length,
        taxaReversao,
      },
    });
  } catch (err) {
    console.error("[/api/contratos] Erro:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
