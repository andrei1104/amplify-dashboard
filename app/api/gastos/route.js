const databaseId  = process.env.NOTION_GASTOS_DATABASE_ID;
const notionSecret = process.env.NOTION_SECRET;

function toLocalDate(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function buildFilter(from, to) {
  if (!from && !to) return null;
  if (from && !to) {
    return { property: "Competência", date: { on_or_after: from } };
  }
  if (!from && to) {
    return { property: "Competência", date: { on_or_before: to } };
  }
  return {
    and: [
      { property: "Competência", date: { on_or_after:  from } },
      { property: "Competência", date: { on_or_before: to   } },
    ],
  };
}

export async function GET(request) {
  if (!databaseId || !notionSecret) {
    return Response.json({ error: "Variáveis NOTION_GASTOS_DATABASE_ID ou NOTION_SECRET ausentes." }, { status: 500 });
  }

  try {
    const url  = new URL(request.url);
    const today = new Date();

    // Suporta from/to diretos OU period/date legado
    let from = url.searchParams.get("from");
    let to   = url.searchParams.get("to");

    if (!from && !to) {
      // Compatibilidade com chamadas antigas (period=month&date=...)
      const period = url.searchParams.get("period") || "month";
      const target = url.searchParams.get("date")   || toLocalDate(today);
      const base   = new Date(target + "T12:00:00");

      if (period === "month") {
        from = toLocalDate(new Date(base.getFullYear(), base.getMonth(), 1));
        to   = toLocalDate(new Date(base.getFullYear(), base.getMonth() + 1, 0));
      } else if (period === "week") {
        const day  = base.getDay();
        const back = day === 0 ? 6 : day - 1;
        const mon  = new Date(base); mon.setDate(base.getDate() - back);
        const sun  = new Date(mon);  sun.setDate(mon.getDate() + 6);
        from = toLocalDate(mon);
        to   = toLocalDate(sun);
      } else if (period === "year") {
        from = `${base.getFullYear()}-01-01`;
        to   = `${base.getFullYear()}-12-31`;
      }
      // period === "all" → from/to ficam null → sem filtro
    }

    const filter = buildFilter(from, to);

    const bodyParams = {
      ...(filter ? { filter } : {}),
      sorts:     [{ property: "Competência", direction: "descending" }],
      page_size: 100,
    };

    let allResults = [];
    let hasMore    = true;
    let cursor     = undefined;
    const MAX_PAGES = 50; // até 5.000 registros (50 páginas × 100 por página)
    let pageCount   = 0;

    while (hasMore && pageCount < MAX_PAGES) {
      if (cursor) bodyParams.start_cursor = cursor;

      const res = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method:  "POST",
          cache:   "no-store",
          headers: {
            Authorization:   `Bearer ${notionSecret}`,
            "Notion-Version": "2022-06-28",
            "Content-Type":  "application/json",
          },
          body: JSON.stringify(bodyParams),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        return Response.json({ error: err.message || "Erro na API do Notion." }, { status: res.status });
      }

      const data = await res.json();
      allResults = allResults.concat(data.results);
      hasMore    = data.has_more;
      cursor     = data.next_cursor;
      pageCount++;
    }

    return Response.json({
      success: true,
      data:    allResults,
      meta:    { from, to, total: allResults.length },
    });
  } catch (err) {
    console.error("Erro gastos:", err);
    return Response.json({ error: "Erro ao buscar dados de gastos." }, { status: 500 });
  }
}
