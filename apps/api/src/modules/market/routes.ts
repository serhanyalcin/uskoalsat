import { Elysia, t } from "elysia";

const SERVER = "Zero";

const listings = [
  {
    id: "LST-1001",
    itemName: "Shard +8",
    itemType: "weapon",
    serverName: SERVER,
    camp: 1,
    listingType: "auction",
    currentBidGb: 850,
    endAt: new Date(Date.now() + 1000 * 60 * 12).toISOString()
  }
];

export const marketRoutes = new Elysia({ prefix: "/market" })
  .get(
    "/listings",
    ({ query }) => {
      const filtered = listings.filter((listing) => {
        if (query.camp && Number(query.camp) !== listing.camp) {
          return false;
        }
        if (query.listingType && query.listingType !== listing.listingType) {
          return false;
        }
        return true;
      });

      return {
        items: filtered,
        nextCursor: null
      };
    },
    {
      query: t.Object({
        camp: t.Optional(t.Union([t.Literal("1"), t.Literal("2"), t.Literal("3"), t.Literal("4"), t.Literal("5")])),
        listingType: t.Optional(t.Union([t.Literal("auction"), t.Literal("buy_now")]))
      })
    }
  )
  .ws("/feed", {
    message(ws, message) {
      ws.send({
        kind: "market_event",
        payload: message
      });
    },
    open(ws) {
      ws.send({
        kind: "welcome",
        payload: "Realtime pazar feed baglantisi aktif"
      });
    }
  });
