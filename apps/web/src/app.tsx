import { startTransition, useState } from "react";
import { useEffect } from "react";
import { Button } from "./components/button";
import { Shell } from "./components/layout/shell";
import { MarketFeedPage } from "./pages/market-feed";
import { MerchantDashboardPage } from "./pages/merchant-dashboard";
import { TradeRoomPage } from "./pages/trade-room";

type ViewKey = "market" | "merchant" | "trade";

const merchantUserId = "11111111-1111-1111-1111-111111111111";
const buyerUserId = "22222222-2222-2222-2222-222222222222";

function getViewFromHash(hash: string): ViewKey {
  const normalized = hash.replace("#", "");
  if (normalized === "merchant" || normalized === "trade" || normalized === "market") {
    return normalized;
  }
  return "market";
}

export function App() {
  const [view, setView] = useState<ViewKey>(() => getViewFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setView(getViewFromHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function changeView(nextView: ViewKey) {
    startTransition(() => {
      window.location.hash = nextView;
      setView(nextView);
    });
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button variant={view === "market" ? "primary" : "ghost"} onClick={() => changeView("market")}>Market</Button>
        <Button variant={view === "merchant" ? "primary" : "ghost"} onClick={() => changeView("merchant")}>Merchant</Button>
        <Button variant={view === "trade" ? "primary" : "ghost"} onClick={() => changeView("trade")}>Trade Room</Button>
      </div>

      {view === "market" ? <MarketFeedPage /> : null}
      {view === "merchant" ? <MerchantDashboardPage merchantUserId={merchantUserId} /> : null}
      {view === "trade" ? <TradeRoomPage defaultBuyerUserId={buyerUserId} /> : null}
    </Shell>
  );
}
