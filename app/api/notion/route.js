const databaseId  = process.env.NOTION_DATABASE_ID;
const notionSecret = process.env.NOTION_SECRET;

// ─── Cache em memória (60 s) ──────────────────────────────────────────────────
// Evita re-buscar os mesmos dados quando o usuário navega ou atualiza rápido.
const responseCache = new Map();
const CACHE_TTL_MS  = 60_000;

// ─── Utilitário: YYYY-MM-DD local ────────────────────────────────────────────
function toLocalDate(dateObj) {
  return (
    dateObj.getFullYear() + "-" +
    String(dateObj.getMonth() + 1).padStart(2, "0") + "-" +
    String(dateObj.getDate()).padStart(2, "0")
  );
}

// ─── Calcula o range de datas conforme o period ──────────────────────────────
function buildDateRange(targetDate, period) {
  const base = new Date(targetDate + "T12:00:00");

  if (period === "week") {
    const day      = base.getDay();
    const daysBack = day === 0 ? 6 : day - 1;
    const monday   = new Date(base);
    monday.setDate(base.getDate() - daysBack);
    return { from: toLocalDate(monday), to: targetDate };
  }

  if (period === "month") {
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    return { from: toLocalDate(first), to: targetDate };
  }

  return { from: targetDate, to: targetDate };
}

// ─── Filtro Notion com timezone explícito ────────────────────────────────────
const DEFAULT_DATE_FIELD = "Última mensagem enviada";

function buildNotionFilter(from, to, dateField = DEFAULT_DATE_FIELD, tz = "-03:00") {
  // Caso especial: filtrar pelo timestamp de última edição (campo de sistema)
  if (dateField === "last_edited_time") {
    return {
      and: [
        { timestamp: "last_edited_time", last_edited_time: { on_or_after:  `${from}T00:00:00${tz}` } },
        { timestamp: "last_edited_time", last_edited_time: { on_or_before: `${to}T23:59:59${tz}`   } },
      ],
    };
  }

  return {
    or: [
      // Caso 1: o campo de data está preenchido e cai no período
      {
        and: [
          { property: dateField, date: { on_or_after:  `${from}T00:00:00${tz}` } },
          { property: dateField, date: { on_or_before: `${to}T23:59:59${tz}`   } },
        ],
      },
      // Caso 2: campo vazio → usa created_time como fallback
      {
        and: [
          { property: dateField, date: { is_empty: true } },
          { timestamp: "created_time", created_time: { on_or_after:  `${from}T00:00:00${tz}` } },
          { timestamp: "created_time", created_time: { on_or_before: `${to}T23:59:59${tz}`   } },
        ],
      },
    ],
  };
}

// ─── Extração de campos server-side ──────────────────────────────────────────
// Reduz o payload de ~5-10 KB/registro para ~150 bytes/registro.

function extractSimple(prop) {
  if (!prop) return null;
  if (prop.type === "people"       && prop.people?.length > 0)       return prop.people[0].name;
  if (prop.type === "select"       && prop.select)                    return prop.select.name;
  if (prop.type === "status"       && prop.status)                    return prop.status.name;
  if (prop.type === "title"        && prop.title?.length > 0)        return prop.title[0].plain_text;
  if (prop.type === "rich_text"    && prop.rich_text?.length > 0)    return prop.rich_text[0].plain_text;
  if (prop.type === "multi_select" && prop.multi_select?.length > 0) return prop.multi_select[0].name;
  return null;
}

function extractDateWithTz(prop, tzOffset) {
  let s = null;
  if      (prop?.type === "date"            && prop.date?.start)             s = prop.date.start;
  else if (prop?.type === "created_time"    && prop.created_time)            s = prop.created_time;
  else if (prop?.type === "last_edited_time" && prop.last_edited_time)       s = prop.last_edited_time;
  else if (prop?.type === "formula"         && prop.formula?.type === "date") s = prop.formula.date?.start;

  if (!s) return null;
  if (s.length === 10) return s; // date-only — sem conversão

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;

  // Aplica o offset do timezone para obter a data local
  const sign     = tzOffset.startsWith("+") ? 1 : -1;
  const [h, m]   = tzOffset.slice(1).split(":").map(Number);
  const offsetMs = sign * (h * 60 + m) * 60_000;
  return new Date(d.getTime() + offsetMs).toISOString().slice(0, 10);
}

function toSlim(result, tzOffset, dateField) {
  const props = result.properties || {};
  const titleProp = props["Name"] || Object.values(props).find(p => p.type === "title");

  let date;
  if (dateField === "last_edited_time") {
    // Usa o timestamp de sistema diretamente do resultado
    const s = result.last_edited_time;
    if (s) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const sign     = tzOffset.startsWith("+") ? 1 : -1;
        const [h, m]   = tzOffset.slice(1).split(":").map(Number);
        const offsetMs = sign * (h * 60 + m) * 60_000;
        date = new Date(d.getTime() + offsetMs).toISOString().slice(0, 10);
      }
    }
  } else {
    // Tenta extrair a data pelo campo configurado; se vazio, usa created_time como fallback
    date = extractDateWithTz(props[dateField], tzOffset);
    if (!date && result.created_time) {
      const d = new Date(result.created_time);
      if (!isNaN(d.getTime())) {
        const sign     = tzOffset.startsWith("+") ? 1 : -1;
        const [h, m]   = tzOffset.slice(1).split(":").map(Number);
        const offsetMs = sign * (h * 60 + m) * 60_000;
        date = new Date(d.getTime() + offsetMs).toISOString().slice(0, 10);
      }
    }
  }

  return {
    id:     result.id,
    sdr:    extractSimple(props["Responsável"]),
    fase:   extractSimple(props["Qual fase do agenciamento?"]),
    origem: extractSimple(props["Origem"]),
    nome:   titleProp ? extractSimple(titleProp) : null,
    date,
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function GET(request) {
  if (!databaseId || !notionSecret) {
    return Response.json(
      { error: "Variáveis de ambiente do Notion ausentes." },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);

    const dateField = url.searchParams.get("dateField") || DEFAULT_DATE_FIELD;
    const tz        = url.searchParams.get("tz")        || "-03:00";

    let fromDirect = url.searchParams.get("from");
    let toDirect   = url.searchParams.get("to");
    const fetchAll = url.searchParams.get("all") === "true";

    let filter;
    let from, to;

    if (fetchAll) {
      filter = undefined;
    } else if (fromDirect || toDirect) {
      from   = fromDirect;
      to     = toDirect || fromDirect;
      filter = buildNotionFilter(from, to, dateField, tz);
    } else {
      const period      = url.searchParams.get("period") || "day";
      const todayString = toLocalDate(new Date());
      const targetDate  = url.searchParams.get("date") || todayString;
      const range       = buildDateRange(targetDate, period);
      from   = range.from;
      to     = range.to;
      filter = buildNotionFilter(from, to, dateField, tz);
    }

    // ── Cache hit ─────────────────────────────────────────────
    const cacheKey = `${from}|${to}|${dateField}|${tz}`;
    const hit      = responseCache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      return Response.json({ success: true, data: hit.data, meta: { ...hit.meta, cached: true } });
    }

    // ── Busca paginada ────────────────────────────────────────
    const bodyParams = { ...(filter ? { filter } : {}), page_size: 100 };

    let allResults = [];
    let hasMore    = true;
    let nextCursor = undefined;
    const MAX_PAGES = 100; // até 10.000 registros
    let pageCount   = 0;

    while (hasMore && pageCount < MAX_PAGES) {
      if (nextCursor) bodyParams.start_cursor = nextCursor;

      const res = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method:  "POST",
          cache:   "no-store",
          headers: {
            Authorization:    `Bearer ${notionSecret}`,
            "Notion-Version": "2022-06-28",
            "Content-Type":   "application/json",
          },
          body: JSON.stringify(bodyParams),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Notion API Error:", errorData);
        return Response.json(
          { error: errorData.message || "Erro na API do Notion." },
          { status: res.status }
        );
      }

      const data = await res.json();
      allResults  = allResults.concat(data.results);
      hasMore     = data.has_more;
      nextCursor  = data.next_cursor;
      pageCount++;
    }

    // ── Transforma para slim e guarda cache ───────────────────
    const slimResults = allResults.map(r => toSlim(r, tz, dateField));
    const meta        = { from, to, total: slimResults.length };

    responseCache.set(cacheKey, { data: slimResults, meta, ts: Date.now() });

    // Limpa entradas antigas do cache (máx 100 entradas)
    if (responseCache.size > 100) {
      const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      responseCache.delete(oldest[0]);
    }

    return Response.json({ success: true, data: slimResults, meta });
  } catch (error) {
    console.error("Erro consultando Notion:", error);
    return Response.json(
      { error: "Ocorreu um erro ao buscar os dados do Notion." },
      { status: 500 }
    );
  }
}
