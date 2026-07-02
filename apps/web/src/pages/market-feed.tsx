import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { MarketFilters, type MarketFiltersValue } from "../components/market-filters";
import { StatCard } from "../components/stat-card";
import { apiRequest, getApiBaseUrl, getMarketWebSocketUrl } from "../lib/api";

interface ListingDto {
  id: string;
  itemName: string;
  itemType: string;
  serverName: string;
  camp: number;
  listingType: "auction" | "buy_now";
  status: "active" | "sold" | "passive" | "expired";
  currentBidGb: number | null;
  buyNowGb: number | null;
  endAt: string | null;
  createdAt: string;
}

interface ListingFeedResponse {
  items: ListingDto[];
  nextCursor: string | null;
}

const defaultFilters: MarketFiltersValue = {
  camp: "",
  listingType: "",
  itemType: "",
  status: "active"
};

function buildListingsQuery(filters: MarketFiltersValue, cursor?: string | null): string {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", "12");

  if (filters.camp) {
    searchParams.set("camp", filters.camp);
  }
  if (filters.listingType) {
    searchParams.set("listingType", filters.listingType);
  }
  if (filters.itemType) {
    searchParams.set("itemType", filters.itemType);
  }
  if (filters.status) {
    searchParams.set("status", filters.status);
  }
  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return `/market/listings?${searchParams.toString()}`;
}

function formatRemaining(endAt: string | null, now: number): string {
  if (!endAt) {
    return "Hemen Al";
  }

  const diffMs = new Date(endAt).getTime() - now;
  if (diffMs <= 0) {
    return "Kapandi";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}s ${minutes}d`;
  }
  if (minutes > 0) {
    return `${minutes}d ${seconds}s`;
  }
  return `${seconds}s`;
}

function useListingsFeed(filters: MarketFiltersValue) {
  return useInfiniteQuery({
    queryKey: ["market-feed", filters],
    queryFn: ({ pageParam }) => apiRequest<ListingFeedResponse>(buildListingsQuery(filters, pageParam ?? null)),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });
}

export function MarketFeedPage() {
  const [filters, setFilters] = useState<MarketFiltersValue>(defaultFilters);
  const [liveCount, setLiveCount] = useState(0);
  const [connectionState, setConnectionState] = useState<"connecting" | "open" | "closed">("connecting");
  const [now, setNow] = useState(() => Date.now());
  const deferredFilters = useDeferredValue(filters);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const feedQuery = useListingsFeed(deferredFilters);
  const rows = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data]
  );

  useEffect(() => {
    const socket = new WebSocket(getMarketWebSocketUrl());

    socket.onopen = () => setConnectionState("open");
    socket.onclose = () => setConnectionState("closed");
    socket.onmessage = () => {
      setLiveCount((value) => value + 1);
      queryClient.invalidateQueries({ queryKey: ["market-feed"] });
    };

    return () => socket.close();
  }, [queryClient]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !feedQuery.hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
        void feedQuery.fetchNextPage();
      }
    }, { rootMargin: "300px" });

    observer.observe(target);
    return () => observer.disconnect();
  }, [feedQuery]);

  const auctionCount = useMemo(() => rows.filter((row) => row.listingType === "auction").length, [rows]);
  const buyNowCount = useMemo(() => rows.filter((row) => row.listingType === "buy_now").length, [rows]);
  const hottestBid = useMemo(() => Math.max(0, ...rows.map((row) => row.currentBidGb ?? 0)), [rows]);

  const isLoading = feedQuery.isLoading;
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <section className="space-y-6" aria-label="Canli pazar yeri">
      <header className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(35,213,171,0.3)] bg-[rgba(35,213,171,0.08)] px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-(--accent)">
            Realtime Market Feed
          </div>
          <div>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-(--text-primary) md:text-5xl">
              Zero sunucusundaki GB odakli pazar akisina aninda baglan.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-(--text-secondary) md:text-base">
              Filtrele, teklif hareketlerini canli izle ve pazar shout trafiğini tek bir akista takip et. API kaynagi: {getApiBaseUrl()}
            </p>
          </div>
        </div>

        <div className="card flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-(--text-secondary)">Socket Durumu</span>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${connectionState === "open" ? "bg-[rgba(35,213,171,0.12)] text-(--accent)" : "bg-[rgba(255,159,67,0.12)] text-[#ff9f43]"}`}>
              {connectionState === "open" ? "Canli" : connectionState === "connecting" ? "Baglaniyor" : "Kapali"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-(--text-secondary)">Anlik Olay</p>
              <p className="mt-1 text-xl font-bold">{liveCount}</p>
            </div>
            <div>
              <p className="text-(--text-secondary)">Veri Durumu</p>
              <p className="mt-1 text-xl font-bold">{feedQuery.isFetching ? "Sync" : "Hazir"}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Toplam Ilan" value={rows.length} helper="Yuklenen anlik feed parcasi" />
        <StatCard label="Acik Artirma" value={auctionCount} helper="Teklif almaya acik ilanlar" />
        <StatCard label="Hemen Al" value={buyNowCount} helper="Sabit GB ile alinabilir" />
        <StatCard label="En Yuksek GB" value={`${hottestBid} GB`} helper="Feed icindeki zirve teklif" />
      </div>

      <MarketFilters value={filters} onChange={setFilters} onReset={() => setFilters(defaultFilters)} totalCount={rows.length} />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="card overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-(--panel-soft) text-(--text-secondary)">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Sunucu</th>
                  <th className="px-4 py-3">Camp</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Fiyat</th>
                  <th className="px-4 py-3">Kalan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--line)] align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-(--text-primary)">{row.itemName}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-(--text-secondary)">{row.itemType}</div>
                    </td>
                    <td className="px-4 py-3">{row.serverName}</td>
                    <td className="px-4 py-3">{row.camp}</td>
                    <td className="px-4 py-3">{row.listingType === "auction" ? "Acik Artirma" : "Hemen Al"}</td>
                    <td className="px-4 py-3 font-semibold">{row.listingType === "buy_now" ? (row.buyNowGb ?? 0) : (row.currentBidGb ?? 0)} GB</td>
                    <td className="px-4 py-3">{formatRemaining(row.endAt, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-(--line) bg-[rgba(11,16,27,0.8)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-(--text-primary)">{row.itemName}</h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-(--text-secondary)">{row.itemType}</p>
                  </div>
                  <span className="rounded-full border border-(--line) px-2 py-1 text-xs text-(--text-secondary)">Camp {row.camp}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-(--text-secondary)">Tip</p>
                    <p className="mt-1 font-medium">{row.listingType === "auction" ? "Acik Artirma" : "Hemen Al"}</p>
                  </div>
                  <div>
                    <p className="text-(--text-secondary)">Sunucu</p>
                    <p className="mt-1 font-medium">{row.serverName}</p>
                  </div>
                  <div>
                    <p className="text-(--text-secondary)">Fiyat</p>
                    <p className="mt-1 font-medium">{row.listingType === "buy_now" ? (row.buyNowGb ?? 0) : (row.currentBidGb ?? 0)} GB</p>
                  </div>
                  <div>
                    <p className="text-(--text-secondary)">Kalan</p>
                    <p className="mt-1 font-medium">{formatRemaining(row.endAt, now)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {isLoading ? <div className="p-6 text-sm text-(--text-secondary)">Feed yukleniyor...</div> : null}
          {feedQuery.isError ? <div className="p-6 text-sm text-[#ff7b7b]">{(feedQuery.error as Error).message}</div> : null}
          {isEmpty ? <div className="p-6 text-sm text-(--text-secondary)">Bu filtrelerle eslesen ilan bulunamadi.</div> : null}
          <div ref={sentinelRef} className="h-4" />
          {feedQuery.isFetchingNextPage ? <div className="px-6 pb-6 text-sm text-(--text-secondary)">Daha fazla ilan yukleniyor...</div> : null}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-secondary)">Realtime Ozet</p>
            <div className="mt-4 space-y-3 text-sm text-(--text-secondary)">
              <p>Yeni bir teklif geldiginde sorgu cache'i invalidation ile yenilenir.</p>
              <p>Anti-snipe uzatmalari backend tarafindan uygulanir ve feed otomatik guncellenir.</p>
              <p>Mobilde kart gorunumu, desktop'ta hizli tablo akisi kullanilir.</p>
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-secondary)">Bir Sonraki Adimlar</p>
            <ul className="mt-4 space-y-3 text-sm text-(--text-secondary)">
              <li>Teklif modal'i ve buy-now etkileşimleri</li>
              <li>Notification center baglantisi</li>
              <li>Merchant dashboard ve trade room client ekranlari</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
