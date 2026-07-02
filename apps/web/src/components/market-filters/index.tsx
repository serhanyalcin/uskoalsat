import type { ChangeEvent } from "react";
import { Button } from "../button";

export interface MarketFiltersValue {
  camp: string;
  listingType: string;
  itemType: string;
  status: string;
}

interface MarketFiltersProps {
  value: MarketFiltersValue;
  onChange: (nextValue: MarketFiltersValue) => void;
  onReset: () => void;
  totalCount: number;
}

function handleFieldChange(
  event: ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  value: MarketFiltersValue,
  onChange: (nextValue: MarketFiltersValue) => void
) {
  onChange({
    ...value,
    [event.target.name]: event.target.value
  });
}

export function MarketFilters({ value, onChange, onReset, totalCount }: MarketFiltersProps) {
  return (
    <section className="card grid gap-4 p-4 md:grid-cols-[1.15fr_repeat(4,minmax(0,1fr))] md:items-end" aria-label="Pazar filtreleri">
      <label className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">Item Ara</span>
        <input
          name="itemType"
          value={value.itemType}
          onChange={(event) => handleFieldChange(event, value, onChange)}
          placeholder="weapon, accessory..."
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-[rgba(12,18,31,0.85)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        />
      </label>

      <label className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">Camp</span>
        <select
          name="camp"
          value={value.camp}
          onChange={(event) => handleFieldChange(event, value, onChange)}
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-[rgba(12,18,31,0.85)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        >
          <option value="">Tum Camp'ler</option>
          <option value="1">Camp 1</option>
          <option value="2">Camp 2</option>
          <option value="3">Camp 3</option>
          <option value="4">Camp 4</option>
          <option value="5">Camp 5</option>
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">Tip</span>
        <select
          name="listingType"
          value={value.listingType}
          onChange={(event) => handleFieldChange(event, value, onChange)}
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-[rgba(12,18,31,0.85)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        >
          <option value="">Tum Tipler</option>
          <option value="auction">Acik Artirma</option>
          <option value="buy_now">Hemen Al</option>
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">Durum</span>
        <select
          name="status"
          value={value.status}
          onChange={(event) => handleFieldChange(event, value, onChange)}
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-[rgba(12,18,31,0.85)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        >
          <option value="active">Aktif</option>
          <option value="sold">Satildi</option>
          <option value="passive">Pasif</option>
          <option value="expired">Suresi Doldu</option>
        </select>
      </label>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <div className="text-xs text-[var(--text-secondary)]">Listelenen: {totalCount}</div>
        <Button variant="ghost" onClick={onReset}>Sifirla</Button>
      </div>
    </section>
  );
}