import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/button";
import { StatCard } from "../components/stat-card";
import { apiRequest } from "../lib/api";

interface TradeRoom {
  id: string;
  tradeCode: string;
  listingId: string;
  sellerUserId: string;
  buyerUserId: string;
  reason: "auction_end" | "buy_now";
  status: "pending" | "in_progress" | "completed" | "disputed" | "cancelled";
  serverName: string;
  camp: number;
  buyerGameNick: string;
  sellerGameNick: string;
  createdAt: string;
  updatedAt: string;
}

interface TradeRoomPageProps {
  defaultBuyerUserId: string;
}

export function TradeRoomPage({ defaultBuyerUserId }: TradeRoomPageProps) {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState({
    listingId: "f213a7d6-47dd-4793-8a66-c7ac638cbe8a",
    buyerUserId: defaultBuyerUserId,
    reason: "buy_now" as "auction_end" | "buy_now",
    buyerGameNick: "SeedBuyerNick",
    sellerGameNick: "SeedMerchantNick"
  });
  const [tradeCodeInput, setTradeCodeInput] = useState("");

  const roomQuery = useQuery({
    queryKey: ["trade-room", tradeCodeInput],
    queryFn: () => apiRequest<{ trade: TradeRoom }>(`/trade/rooms/${encodeURIComponent(tradeCodeInput)}`),
    enabled: tradeCodeInput.trim().length >= 8
  });

  const createMatchMutation = useMutation({
    mutationFn: () => apiRequest<{ ok: true; trade: TradeRoom }>("/trade/matches", {
      method: "POST",
      body: JSON.stringify(createForm)
    }),
    onSuccess: (data) => {
      setTradeCodeInput(data.trade.tradeCode);
      void queryClient.invalidateQueries({ queryKey: ["trade-room", data.trade.tradeCode] });
    }
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus: "in_progress" | "completed" | "disputed" | "cancelled") =>
      apiRequest<{ ok: true; trade: TradeRoom }>(`/trade/rooms/${encodeURIComponent(tradeCodeInput)}/status`, {
        method: "POST",
        body: JSON.stringify({ actorUserId: defaultBuyerUserId, status: nextStatus })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trade-room", tradeCodeInput] });
    }
  });

  useEffect(() => {
    if (roomQuery.data?.trade.tradeCode) {
      setTradeCodeInput(roomQuery.data.trade.tradeCode);
    }
  }, [roomQuery.data?.trade.tradeCode]);

  const trade = roomQuery.data?.trade;

  return (
    <section className="space-y-6" aria-label="Trade room">
      <header className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,159,67,0.25)] bg-[rgba(255,159,67,0.12)] px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#ffb35c]">
            Trade Room
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-(--text-primary) md:text-5xl">
            Alici ve saticiyi ayni islem odasinda bulusturan akisi yonet.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-(--text-secondary) md:text-base">
            Match olustur, trade kodunu ac ve tek bir yerden durum gecislerini tetikle.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Trade Kodu" value={trade?.tradeCode ?? "-"} helper="Aktif oda" />
          <StatCard label="Durum" value={trade?.status ?? "Bekliyor"} helper="Room state" />
          <StatCard label="Sebep" value={trade?.reason ?? "-"} helper="Auction / Buy now" />
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="card p-4">
          <h2 className="text-lg font-semibold text-(--text-primary)">Yeni trade olustur</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={createForm.listingId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, listingId: event.target.value }))}
              placeholder="Listing ID"
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
            />
            <input
              value={createForm.buyerUserId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, buyerUserId: event.target.value }))}
              placeholder="Buyer User ID"
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
            />
            <select
              value={createForm.reason}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, reason: event.target.value as "auction_end" | "buy_now" }))}
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
            >
              <option value="buy_now">Buy Now</option>
              <option value="auction_end">Auction End</option>
            </select>
            <input
              value={createForm.buyerGameNick}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, buyerGameNick: event.target.value }))}
              placeholder="Buyer Nick"
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
            />
            <input
              value={createForm.sellerGameNick}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, sellerGameNick: event.target.value }))}
              placeholder="Seller Nick"
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent) md:col-span-2"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-(--text-secondary)">Default veri seed buy-now listing ID ile geliyor.</p>
            <Button onClick={() => createMatchMutation.mutate()} disabled={createMatchMutation.isPending}>
              {createMatchMutation.isPending ? "Olusturuluyor" : "Trade Olustur"}
            </Button>
          </div>
        </section>

        <section className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-(--text-primary)">Trade odasi</h2>
              <p className="text-sm text-(--text-secondary)">Trade kodunu gir veya yeni olusturulan kodu kullan.</p>
            </div>
            <div className="flex w-full gap-2 md:w-auto">
              <input
                value={tradeCodeInput}
                onChange={(event) => setTradeCodeInput(event.target.value)}
                placeholder="#TRD-0000"
                className="h-11 min-w-[220px] rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
              />
              <Button variant="ghost" onClick={() => void queryClient.invalidateQueries({ queryKey: ["trade-room", tradeCodeInput] })}>Yenile</Button>
            </div>
          </div>

          {trade ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-(--line) bg-[rgba(12,18,31,0.75)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-(--text-secondary)">Alici / Satici</p>
                  <p className="mt-3 text-sm text-(--text-primary)">{trade.buyerGameNick} / {trade.sellerGameNick}</p>
                </div>
                <div className="rounded-2xl border border-(--line) bg-[rgba(12,18,31,0.75)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-(--text-secondary)">Sunucu / Camp</p>
                  <p className="mt-3 text-sm text-(--text-primary)">{trade.serverName} / Camp {trade.camp}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => statusMutation.mutate("in_progress")} disabled={statusMutation.isPending}>In Progress</Button>
                <Button onClick={() => statusMutation.mutate("completed")} disabled={statusMutation.isPending}>Completed</Button>
                <Button variant="ghost" onClick={() => statusMutation.mutate("disputed")} disabled={statusMutation.isPending}>Disputed</Button>
                <Button variant="ghost" onClick={() => statusMutation.mutate("cancelled")} disabled={statusMutation.isPending}>Cancelled</Button>
              </div>
            </div>
          ) : null}

          {roomQuery.isLoading ? <div className="mt-5 text-sm text-(--text-secondary)">Trade odasi yukleniyor...</div> : null}
          {roomQuery.isError ? <div className="mt-5 text-sm text-[#ff7b7b]">{(roomQuery.error as Error).message}</div> : null}
          {!trade && !roomQuery.isLoading && !roomQuery.isError ? <div className="mt-5 text-sm text-(--text-secondary)">Trade kodu girildiginde oda detaylari burada gorunur.</div> : null}
        </section>
      </div>
    </section>
  );
}