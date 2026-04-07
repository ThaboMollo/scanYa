import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet } from "react-router-dom";
export function PublicLayout() {
    return (_jsxs("div", { children: [_jsxs("header", { className: "public-header", children: [_jsxs(Link, { to: "/assets", className: "brand-logo", children: ["scan", _jsx("span", { children: "Ya" })] }), _jsxs("div", { className: "header-actions", children: [_jsx(Link, { to: "/assets", className: "header-link", children: "Browse Assets" }), _jsx(Link, { to: "/app/login", className: "header-link", children: "Owner Login" })] })] }), _jsx("main", { children: _jsx(Outlet, {}) })] }));
}
