import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/button";
const mockRows = [
    { id: "L-1", itemName: "Shard +8", serverName: "Zero", camp: 1, listingType: "auction", currentBidGb: 850, remainingSec: 88 },
    { id: "L-2", itemName: "Iron Necklace", serverName: "Zero", camp: 3, listingType: "buy_now", currentBidGb: 420, remainingSec: 0 }
];
export function MarketFeedPage() {
    const [rows] = useState(mockRows);
    const [liveCount, setLiveCount] = useState(0);
    useEffect(() => {
        const socket = new WebSocket("ws://localhost:3000/market/feed");
        socket.onmessage = () => setLiveCount((value) => value + 1);
        return () => socket.close();
    }, []);
    const auctionCount = useMemo(() => rows.filter((row) => row.listingType === "auction").length, [rows]);
    return (_jsxs("section", { className: "space-y-6", "aria-label": "Canli pazar yeri", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl", children: "Canli Pazar Yeri" }), _jsx("p", { className: "text-sm text-[var(--text-secondary)]", children: "Zero sunucusunda anlik ilan ve teklif akisi" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-xs text-[var(--text-secondary)]", children: ["Anlik olay: ", liveCount] }), _jsx(Button, { children: "Filtreleri Ac" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4", children: [_jsxs("article", { className: "card p-4", children: [_jsx("p", { className: "text-xs text-[var(--text-secondary)]", children: "Toplam Ilan" }), _jsx("p", { className: "mt-2 text-xl font-bold", children: rows.length })] }), _jsxs("article", { className: "card p-4", children: [_jsx("p", { className: "text-xs text-[var(--text-secondary)]", children: "Acik Artirma" }), _jsx("p", { className: "mt-2 text-xl font-bold", children: auctionCount })] })] }), _jsx("div", { className: "card overflow-hidden", children: _jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { className: "bg-[var(--panel-soft)] text-[var(--text-secondary)]", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3", children: "Item" }), _jsx("th", { className: "px-4 py-3", children: "Sunucu" }), _jsx("th", { className: "px-4 py-3", children: "Camp" }), _jsx("th", { className: "px-4 py-3", children: "Tip" }), _jsx("th", { className: "px-4 py-3", children: "GB" }), _jsx("th", { className: "px-4 py-3", children: "Kalan" })] }) }), _jsx("tbody", { children: rows.map((row) => (_jsxs("tr", { className: "border-t border-[var(--line)]", children: [_jsx("td", { className: "px-4 py-3 font-medium text-[var(--text-primary)]", children: row.itemName }), _jsx("td", { className: "px-4 py-3", children: row.serverName }), _jsx("td", { className: "px-4 py-3", children: row.camp }), _jsx("td", { className: "px-4 py-3", children: row.listingType === "auction" ? "Acik Artirma" : "Hemen Al" }), _jsxs("td", { className: "px-4 py-3", children: [row.currentBidGb, " GB"] }), _jsx("td", { className: "px-4 py-3", children: row.remainingSec > 0 ? `${row.remainingSec}s` : "-" })] }, row.id))) })] }) })] }));
}
