import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";
import { queryClient } from "./lib/query-client";
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsxs(QueryClientProvider, { client: queryClient, children: [_jsx(App, {}), _jsx(ReactQueryDevtools, { initialIsOpen: false })] }) }));
