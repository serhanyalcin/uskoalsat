import type { PropsWithChildren } from "react";

export function Shell({ children }: PropsWithChildren) {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(68,138,255,0.25),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(31,215,163,0.18),transparent_35%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8 md:py-10">{children}</div>
    </main>
  );
}
