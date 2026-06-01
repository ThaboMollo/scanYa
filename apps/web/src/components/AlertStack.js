import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAppState } from "../state/AppContext";
export function AlertStack() {
    const { alerts, dismissAlert } = useAppState();
    if (alerts.length === 0)
        return null;
    return (_jsx("div", { className: "alert-stack", role: "status", "aria-live": "polite", children: alerts.map((alert) => (_jsxs("div", { className: `alert alert--${alert.type}`, children: [_jsx("span", { className: "alert-message", children: alert.message }), _jsx("button", { type: "button", className: "alert-dismiss", "aria-label": "Dismiss alert", onClick: () => dismissAlert(alert.id), children: "\u00D7" })] }, alert.id))) }));
}
