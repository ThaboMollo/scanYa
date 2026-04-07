import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";
export function AssetsPage() {
    const { assets } = useAppState();
    return (_jsxs("div", { className: "assets-page", children: [_jsx("h1", { className: "assets-page-title", children: "Browse Assets" }), _jsx("p", { className: "assets-page-subtitle", children: "Find and book what you need" }), _jsxs("div", { className: "assets-grid", children: [assets.map((asset) => (_jsxs(Link, { to: `/assets/${asset.id}`, className: "asset-card", children: [_jsx("span", { className: "category-pill", children: asset.category }), _jsx("h3", { className: "asset-card-title", children: asset.title }), _jsx("p", { className: "asset-card-description", children: asset.description }), _jsxs("div", { className: "asset-card-footer", children: [_jsx("span", { children: asset.location }), _jsx("span", { children: asset.priceLabel })] })] }, asset.id))), assets.length === 0 && (_jsx("div", { className: "empty-state", children: "No assets available yet." }))] })] }));
}
