import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const VARIANT_CLASSES = {
    default: "stat-card",
    brand: "stat-card stat-card--brand",
    success: "stat-card stat-card--success",
};
export function StatCard({ label, value, variant = "default" }) {
    return (_jsxs("div", { className: VARIANT_CLASSES[variant], children: [_jsx("div", { className: "stat-card-label", children: label }), _jsx("div", { className: "stat-card-value", children: value })] }));
}
