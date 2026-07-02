import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  accent?: ReactNode;
}

export function StatCard({ label, value, helper, accent }: StatCardProps) {
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-(--text-secondary)">{label}</p>
          <p className="mt-2 text-2xl font-bold text-(--text-primary)">{value}</p>
          {helper ? <p className="mt-1 text-xs text-(--text-secondary)">{helper}</p> : null}
        </div>
        {accent ? <div className="text-(--accent)">{accent}</div> : null}
      </div>
    </article>
  );
}