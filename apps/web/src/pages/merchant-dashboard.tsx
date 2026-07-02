import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/button";
import { StatCard } from "../components/stat-card";
import { apiRequest } from "../lib/api";

interface MerchantListing {
  id: string;
  itemName: string;
  itemType: string;
  serverName: string;
  camp: number;
  listingType: "auction" | "buy_now";
  status: "active" | "sold" | "passive" | "expired";
  currentBidGb: number | null;
  buyNowGb: number | null;
  createdAt: string;
}

interface MerchantListingResponse {
  items: MerchantListing[];
  nextCursor: string | null;
}

interface DashboardProps {
  merchantUserId: string;
}

function useMerchantListings(merchantUserId: string) {
  return useQuery({
    queryKey: ["merchant-listings", merchantUserId],
    queryFn: () =>
      apiRequest<MerchantListingResponse>(`/market/merchant/listings?merchantUserId=${merchantUserId}&limit=20`)
  });
}

export function MerchantDashboardPage({ merchantUserId }: DashboardProps) {
  const queryClient = useQueryClient();
  const listingsQuery = useMerchantListings(merchantUserId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState({
    itemName: "Dark Vane +7",
    itemType: "weapon",
    camp: "4",
    listingType: "auction",
    buyNowGb: "500",
    startBidGb: "480"
  });

  const bulkStatusMutation = useMutation({
    mutationFn: (nextStatus: "active" | "sold" | "passive") =>
      apiRequest<{ ok: true; updated: number }>("/market/merchant/listings/bulk-status", {
        method: "POST",
        body: JSON.stringify({
          merchantUserId,
          listingIds: selectedIds,
          nextStatus
        })
      }),
    onSuccess: () => {
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ["merchant-listings", merchantUserId] });
      void queryClient.invalidateQueries({ queryKey: ["market-feed"] });
    }
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ ok: true }>("/market/merchant/listings/bulk-create", {
        method: "POST",
        body: JSON.stringify({
          merchantUserId,
          items: [
            {
              itemName: createForm.itemName,
              itemType: createForm.itemType,
              camp: Number(createForm.camp),
              listingType: createForm.listingType,
              buyNowGb: createForm.listingType === "buy_now" ? Number(createForm.buyNowGb) : undefined,
              startBidGb: createForm.listingType === "auction" ? Number(createForm.startBidGb) : undefined,
              durationMinutes: createForm.listingType === "auction" ? 90 : undefined
            }
          ]
        })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["merchant-listings", merchantUserId] });
      void queryClient.invalidateQueries({ queryKey: ["market-feed"] });
    }
  });

  const rows = listingsQuery.data?.items ?? [];
  const activeCount = useMemo(() => rows.filter((row) => row.status === "active").length, [rows]);
  const passiveCount = useMemo(() => rows.filter((row) => row.status === "passive").length, [rows]);
  const soldCount = useMemo(() => rows.filter((row) => row.status === "sold").length, [rows]);

  return (
    <section className="space-y-6" aria-label="Merchant dashboard">
      <header className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(47,128,237,0.25)] bg-[rgba(47,128,237,0.1)] px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#7fb3ff]">
            Merchant Dashboard
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-(--text-primary) md:text-5xl">
            Toplu ilanlarini tek ekranda yonet, hizlica pasife cek veya satildiya al.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-(--text-secondary) md:text-base">
            Merchant ID: {merchantUserId}. Bu panel backend bulk-create ve bulk-status endpointlerine bagli.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Aktif" value={activeCount} helper="Pazarda gorunen ilan" />
          <StatCard label="Pasif" value={passiveCount} helper="Gizlenen ilan" />
          <StatCard label="Satildi" value={soldCount} helper="Islemi kapanan ilan" />
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-4">
          <h2 className="text-lg font-semibold text-(--text-primary)">Yeni ilan ekle</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={createForm.itemName}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, itemName: event.target.value }))}
              placeholder="Item adi"
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
            />
            <input
              value={createForm.itemType}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, itemType: event.target.value }))}
              placeholder="Item tipi"
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
            />
            <select
              value={createForm.camp}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, camp: event.target.value }))}
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
            >
              <option value="1">Camp 1</option>
              <option value="2">Camp 2</option>
              <option value="3">Camp 3</option>
              <option value="4">Camp 4</option>
              <option value="5">Camp 5</option>
            </select>
            <select
              value={createForm.listingType}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, listingType: event.target.value as "auction" | "buy_now" }))}
              className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
            >
              <option value="auction">Acik Artirma</option>
              <option value="buy_now">Hemen Al</option>
            </select>
            {createForm.listingType === "auction" ? (
              <input
                value={createForm.startBidGb}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, startBidGb: event.target.value }))}
                placeholder="Baslangic GB"
                className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
              />
            ) : (
              <input
                value={createForm.buyNowGb}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, buyNowGb: event.target.value }))}
                placeholder="Hemen al GB"
                className="h-11 rounded-xl border border-(--line) bg-[rgba(12,18,31,0.85)] px-3 text-sm text-(--text-primary) outline-none focus:border-(--accent)"
              />
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-(--text-secondary)">Yeni ilan backend bulk-create endpointi uzerinden olusturulur.</p>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Ekleniyor" : "Ilan Ekle"}
            </Button>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--line) px-4 py-4">
            <div>
              <h2 className="text-lg font-semibold text-(--text-primary)">Ilan yonetimi</h2>
              <p className="text-sm text-(--text-secondary)">Secili ilanlarda tek tik durum gecisi</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => bulkStatusMutation.mutate("active")} disabled={selectedIds.length === 0 || bulkStatusMutation.isPending}>Aktif</Button>
              <Button variant="ghost" onClick={() => bulkStatusMutation.mutate("passive")} disabled={selectedIds.length === 0 || bulkStatusMutation.isPending}>Pasif</Button>
              <Button onClick={() => bulkStatusMutation.mutate("sold")} disabled={selectedIds.length === 0 || bulkStatusMutation.isPending}>Satildi</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-(--panel-soft) text-(--text-secondary)">
                <tr>
                  <th className="px-4 py-3">Sec</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">GB</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-(--line)">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={(event) => {
                          setSelectedIds((prev) => event.target.checked ? [...prev, row.id] : prev.filter((value) => value !== row.id));
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-(--text-primary)">{row.itemName}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-(--text-secondary)">Camp {row.camp} / {row.serverName}</div>
                    </td>
                    <td className="px-4 py-3">{row.listingType === "auction" ? "Acik Artirma" : "Hemen Al"}</td>
                    <td className="px-4 py-3 font-semibold">{row.listingType === "buy_now" ? (row.buyNowGb ?? 0) : (row.currentBidGb ?? 0)} GB</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-(--line) px-2 py-1 text-xs text-(--text-secondary)">{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {listingsQuery.isLoading ? <div className="px-4 py-6 text-sm text-(--text-secondary)">Merchant ilanlari yukleniyor...</div> : null}
          {listingsQuery.isError ? <div className="px-4 py-6 text-sm text-[#ff7b7b]">{(listingsQuery.error as Error).message}</div> : null}
        </section>
      </div>
    </section>
  );
}