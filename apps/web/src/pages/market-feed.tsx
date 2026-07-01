import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/button";

interface MarketRow {
  id: string;
  itemName: string;
  serverName: string;
  camp: number;
  listingType: "auction" | "buy_now";
  currentBidGb: number;
  remainingSec: number;
}

const mockRows: MarketRow[] = [
  { id: "L-1", itemName: "Shard +8", serverName: "Zero", camp: 1, listingType: "auction", currentBidGb: 850, remainingSec: 88 },
  { id: "L-2", itemName: "Iron Necklace", serverName: "Zero", camp: 3, listingType: "buy_now", currentBidGb: 420, remainingSec: 0 }
];

export function MarketFeedPage() {
  const [rows] = useState<MarketRow[]>(mockRows);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3000/market/feed");
    socket.onmessage = () => setLiveCount((value) => value + 1);
    return () => socket.close();
  }, []);

  const auctionCount = useMemo(() => rows.filter((row) => row.listingType === "auction").length, [rows]);

  return (
    <section className="space-y-6" aria-label="Canli pazar yeri">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">Canli Pazar Yeri</h1>
          <p className="text-sm text-[var(--text-secondary)]">Zero sunucusunda anlik ilan ve teklif akisi</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            Anlik olay: {liveCount}
          </span>
          <Button>Filtreleri Ac</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="card p-4">
          <p className="text-xs text-[var(--text-secondary)]">Toplam Ilan</p>
          <p className="mt-2 text-xl font-bold">{rows.length}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs text-[var(--text-secondary)]">Acik Artirma</p>
          <p className="mt-2 text-xl font-bold">{auctionCount}</p>
        </article>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--panel-soft)] text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Sunucu</th>
              <th className="px-4 py-3">Camp</th>
              <th className="px-4 py-3">Tip</th>
              <th className="px-4 py-3">GB</th>
              <th className="px-4 py-3">Kalan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{row.itemName}</td>
                <td className="px-4 py-3">{row.serverName}</td>
                <td className="px-4 py-3">{row.camp}</td>
                <td className="px-4 py-3">{row.listingType === "auction" ? "Acik Artirma" : "Hemen Al"}</td>
                <td className="px-4 py-3">{row.currentBidGb} GB</td>
                <td className="px-4 py-3">{row.remainingSec > 0 ? `${row.remainingSec}s` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
