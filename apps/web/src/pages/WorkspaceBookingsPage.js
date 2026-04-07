import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAppState } from "../state/AppContext";
import { BookingCard } from "../components/BookingCard";
const FILTERS = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Rejected", value: "rejected" },
    { label: "Completed", value: "completed" },
];
export function WorkspaceBookingsPage() {
    const { ownerBookings, assets, updateBookingDecision } = useAppState();
    const [filter, setFilter] = useState("all");
    const filtered = filter === "all"
        ? ownerBookings
        : ownerBookings.filter((b) => b.status === filter);
    const getAssetTitle = (assetId) => assets.find((a) => a.id === assetId)?.title ?? "Unknown asset";
    return (_jsxs("div", { children: [_jsx("h1", { className: "section-title", style: { fontSize: 22, marginBottom: 16 }, children: "Bookings" }), _jsx("div", { className: "filter-tabs", children: FILTERS.map((f) => (_jsx("button", { className: `filter-tab ${filter === f.value ? "filter-tab--active" : ""}`, onClick: () => setFilter(f.value), children: f.label }, f.value))) }), filtered.map((booking) => (_jsx(BookingCard, { booking: booking, assetTitle: getAssetTitle(booking.assetId), showActions: booking.status === "pending", onConfirm: () => updateBookingDecision(booking.id, "confirm"), onReject: () => updateBookingDecision(booking.id, "reject") }, booking.id))), filtered.length === 0 && (_jsx("div", { className: "empty-state", children: filter === "all" ? "No bookings yet." : `No ${filter} bookings.` }))] }));
}
