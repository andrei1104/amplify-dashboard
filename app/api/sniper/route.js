const notionSecret = process.env.NOTION_SECRET;

// ─── CRM Sniper — um banco por SDR ───────────────────────────────────────────
// IDs extraídos do Plano Tático Q2 2026 (página do Notion)
const SNIPER_DBS = [
  { sdr: "Nicole Freitas", dbId: "345b0bbef1538163b153ca48b4631549" },
  { sdr: "Bruno Zardo",    dbId: "345b0bbef15381edb961d5f0d82b656c" },
];

// ─── Helper: busca paginada ───────────────────────────────────────────────────
async function queryDb(dbId, filter) {
  const allResults = [];
  let hasMore  = true;
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
        method:  "POST",
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
      throw new Error(err.message || `Erro ao consultar DB ${dbId} (status ${res.status})`);
    }

    const data = await res.json();
    allResults.push(...(data.results || []));
    hasMore = data.has_more;
    cursor  = data.next_cursor;
  }

  return allResults;
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

  // Filtro base: Status = Fechado (deal fechado / agenciado)
  const statusFilter = { property: "Status", status: { equals: "Fechado" } };

  // Filtro de data: usa created_time como proxy de quando o deal foi registrado
  const dateFilter = from && to
    ? {
        and: [
          { timestamp: "created_time", created_time: { on_or_after:  `${from}T00:00:00${tz}` } },
          { timestamp: "created_time", created_time: { on_or_before: `${to}T23:59:59${tz}`   } },
        ],
      }
    : null;

  const filter = dateFilter
    ? { and: [statusFilter, dateFilter] }
    : statusFilter;

  const allData  = [];
  const seenIds  = new Set();   // evita duplicatas caso os DBs sejam linked

  await Promise.allSettled(
    SNIPER_DBS.map(async ({ sdr, dbId }) => {
      try {
        const results = await queryDb(dbId, filter);
        results.forEach(r => {
          if (seenIds.has(r.id)) return;
          seenIds.add(r.id);

          const props = r.properties || {};
          allData.push({
            id:        r.id,
            sdr,
            categoria: props["Categoria"]?.select?.name  || null,
            gmv:       props["GMV (R$/mês)"]?.number     ?? 0,
            status:    props["Status"]?.status?.name     || null,
            // created_time é ISO 8601 com fuso — fatia só a data local
            date: (() => {
              const s = r.created_time;
              if (!s) return null;
              const d = new Date(s);
              if (isNaN(d.getTime())) return null;
              const sign = tz.startsWith("+") ? 1 : -1;
              const [h, m] = tz.slice(1).split(":").map(Number);
              return new Date(d.getTime() + sign * (h * 60 + m) * 60_000)
                .toISOString().slice(0, 10);
            })(),
          });
        });
      } catch (err) {
        console.error(`[/api/sniper] Erro ao consultar CRM de ${sdr}:`, err.message);
        // Não interrompe — retorna os outros SDRs mesmo assim
      }
    })
  );

  return Response.json({ success: true, data: allData, meta: { total: allData.length } });
}
