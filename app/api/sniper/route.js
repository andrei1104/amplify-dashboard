const notionSecret = process.env.NOTION_SECRET;

// ─── Database Leads Outbound (Plano Sniper) ──────────────────────────────────
// https://www.notion.so/amplifyugc/344b0bbef153803d9fe9f956e2f67f20
const SNIPER_DB_ID = "344b0bbef153803d9fe9f956e2f67f20";

// ─── Busca paginada ───────────────────────────────────────────────────────────
async function queryDb(dbId, filter) {
  const allResults = [];
  let hasMore = true;
  let cursor;

  while (hasMore) {
    const body = {
      ...(filter ? { filter } : {}),
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    };

    const res = await fetch(
      `https://api.notion.com/v1/databases/${dbId}/query`,
      {
        method: "POST",
        headers: {
          Authorization:    `Bearer ${notionSecret}`,
          "Notion-Version": "2022-06-28",
          "Content-Type":   "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erro ao consultar DB (status ${res.status})`);
    }

    const data = await res.json();
    allResults.push(...(data.results || []));
    hasMore = data.has_more;
    cursor  = data.next_cursor;
  }

  return allResults;
}

// ─── Converte ISO timestamp para data local (fuso explícito) ─────────────────
function toLocalDate(s, tz) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const sign = tz.startsWith("+") ? 1 : -1;
  const [h, m] = tz.slice(1).split(":").map(Number);
  return new Date(d.getTime() + sign * (h * 60 + m) * 60_000)
    .toISOString().slice(0, 10);
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function GET(request) {
  if (!notionSecret) {
    return Response.json({ error: "NOTION_SECRET ausente." }, { status: 500 });
  }

  const url  = new URL(request.url);
  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");
  const tz   = url.searchParams.get("tz") || "-03:00";

  // Sem filtro de data na API — busca todos os registros.
  // A filtragem por período é feita no cliente usando o campo `date`
  // (que prefere "Data do primeiro Huggy" sobre created_time), evitando
  // erros por nomes de propriedade ou leads criados antes do período selecionado.
  const filter = null;

  try {
    const results = await queryDb(SNIPER_DB_ID, filter);

    const data = results.map(r => {
      const props = r.properties || {};

      // Responsável (person)
      const responsavel = props["Responsável"]?.people?.[0]?.name || null;

      // Status de contato (select)
      const status = props["Status de contato"]?.select?.name || null;

      // Categoria (formula → string: Silver / Gold / Diamond / ...)
      const categoria = props["Categoria"]?.formula?.string || null;

      // Followers
      const followers = props["Followers"]?.number || 0;

      // Data do primeiro Huggy (date property) → fallback para created_time
      const huggyDate = props["Data do primeiro Huggy"]?.date?.start?.slice(0, 10) || null;
      const date = huggyDate || toLocalDate(r.created_time, tz);

      return {
        id:          r.id,
        responsavel,
        status,
        categoria,
        followers,
        date,
        huggyDate,   // null se não preenchido — usado para filtrar por período no cliente
      };
    });

    return Response.json({ success: true, data, meta: { total: data.length } });
  } catch (err) {
    console.error("[/api/sniper] Erro:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
