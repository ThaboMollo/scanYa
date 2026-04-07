import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { StatCard } from "../components/StatCard";
import { BookingCard } from "../components/BookingCard";
export function WorkspaceDashboardPage() {
    const { session, assets, ownerBookings, updateBookingDecision } = useAppState();
    const publishedCount = assets.filter((a) => a.ownerId === session?.user.id && a.status === "published").length;
    const pendingBookings = ownerBookings.filter((b) => b.status === "pending");
    const confirmedThisMonth = ownerBookings.filter((b) => {
        if (b.status !== "confirmed")
            return false;
        const bookingMonth = b.createdAt.slice(0, 7);
        const currentMonth = new Date().toISOString().slice(0, 7);
        return bookingMonth === currentMonth;
    }).length;
    const getAssetTitle = (assetId) => assets.find((a) => a.id === assetId)?.title ?? "Unknown asset";
    return (_jsxs("div", { children: [_jsxs("div", { className: "dashboard-header", children: [_jsxs("div", { children: [_jsxs("h1", { className: "dashboard-greeting", children: ["Good morning, ", session?.user.name.split(" ")[0]] }), _jsx("p", { className: "dashboard-subtitle", children: pendingBookings.length > 0
                                    ? `You have ${pendingBookings.length} pending booking request${pendingBookings.length > 1 ? "s" : ""}`
                                    : "No pending requests" })] }), _jsx(Link, { to: "/app/assets", className: "btn btn-brand", children: "+ New Asset" })] }), _jsxs("div", { className: "stats-row", children: [_jsx(StatCard, { label: "Published Assets", value: publishedCount }), _jsx(StatCard, { label: "Pending Requests", value: pendingBookings.length, variant: "brand" }), _jsx(StatCard, { label: "Confirmed This Month", value: confirmedThisMonth, variant: "success" })] }), pendingBookings.length > 0 && (_jsxs("div", { children: [_jsx("h2", { className: "section-title", children: "Pending Requests" }), _jsx("p", { className: "section-subtitle", children: "These people want to rent your assets" }), pendingBookings.map((booking) => (_jsx(BookingCard, { booking: booking, assetTitle: getAssetTitle(booking.assetId), showActions: true, onConfirm: () => updateBookingDecision(booking.id, "confirm"), onReject: () => updateBookingDecision(booking.id, "reject") }, booking.id)))] })), pendingBookings.length === 0 && (_jsx("div", { className: "empty-state", children: "All caught up! No pending booking requests." }))] }));
}
