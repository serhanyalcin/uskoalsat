import { jsx as _jsx } from "react/jsx-runtime";
import { Shell } from "./components/layout/shell";
import { MarketFeedPage } from "./pages/market-feed";
export function App() {
    return (_jsx(Shell, { children: _jsx(MarketFeedPage, {}) }));
}
