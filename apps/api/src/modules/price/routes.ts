import { Elysia, t } from "elysia";
import { getPriceHistory } from "./service";

export const priceRoutes = new Elysia({ prefix: "/price-history" }).get(
  "",
  async ({ query }) => {
    const items = await getPriceHistory({
      itemName: query.itemName,
      serverName: query.serverName,
      camp: query.camp,
      limit: query.limit
    });

    return { items };
  },
  {
    query: t.Object({
      itemName: t.String({ minLength: 2, maxLength: 100 }),
      serverName: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
      camp: t.Optional(t.Numeric({ minimum: 1, maximum: 5 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 200 }))
    })
  }
);
