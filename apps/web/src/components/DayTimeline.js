import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAppState } from "../state/AppContext";
function formatTime(iso) {
    return new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
    });
}
function getHours(startAt, endAt) {
    const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
    return Math.round(ms / 3_600_000);
}
function buildSlots(windows, bookings, selectedSlot) {
    return windows.map((w) => {
        const isBooked = bookings.some((b) => ["pending", "confirmed"].includes(b.status) &&
            new Date(b.startAt) <= new Date(w.startAt) &&
            new Date(b.endAt) >= new Date(w.endAt));
        const isSelected = selectedSlot?.startAt === w.startAt && selectedSlot?.endAt === w.endAt;
        return {
            startAt: w.startAt,
            endAt: w.endAt,
            status: isSelected ? "selected" : isBooked ? "booked" : "available",
        };
    });
}
export function DayTimeline({ assetId }) {
    const { selectedDate, availability, selectedSlot, selectSlot, setCalendarView, setBookingStep, } = useAppState();
    const dateObj = new Date(selectedDate + "T00:00:00Z");
    const dayLabel = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    });
    const slots = availability
        ? buildSlots(availability.windows, availability.bookings, selectedSlot)
        : [];
    const availableCount = slots.filter((s) => s.status !== "booked").length;
    const handleSelect = (slot) => {
        if (slot.status === "booked")
            return;
        if (slot.status === "selected") {
            selectSlot(null);
        }
        else {
            selectSlot({ startAt: slot.startAt, endAt: slot.endAt });
        }
    };
    const handleContinue = () => {
        setBookingStep("contact");
    };
    return (_jsxs("div", { className: "day-timeline", children: [_jsxs("div", { className: "day-timeline-header", children: [_jsx("button", { className: "day-back-btn", onClick: () => setCalendarView("month"), "aria-label": "Back to month", children: "\u2190" }), _jsxs("div", { children: [_jsx("div", { className: "day-timeline-title", children: dayLabel }), _jsxs("div", { className: "day-timeline-subtitle", children: [slots.length, " slots \u2022 ", availableCount, " available"] })] })] }), _jsxs("div", { className: "day-slots", children: [slots.map((slot) => (_jsxs("div", { className: "day-slot-row", children: [_jsxs("div", { className: "day-slot-times", children: [_jsx("div", { className: "day-slot-start", children: formatTime(slot.startAt) }), _jsx("div", { className: "day-slot-end", children: formatTime(slot.endAt) })] }), _jsx("div", { className: `day-slot-bar day-slot-bar--${slot.status}` }), _jsxs("button", { className: `day-slot-card day-slot-card--${slot.status}`, onClick: () => handleSelect(slot), disabled: slot.status === "booked", children: [_jsxs("div", { children: [_jsxs("div", { className: "day-slot-label", children: [slot.status === "available" && "Available", slot.status === "selected" && "Selected \u2713", slot.status === "booked" && "Booked"] }), _jsxs("div", { className: "day-slot-duration", children: [getHours(slot.startAt, slot.endAt), " hours"] })] }), _jsxs("div", { className: "day-slot-action", children: [slot.status === "available" && "Select", slot.status === "selected" && "Change", slot.status === "booked" && "Unavailable"] })] })] }, slot.startAt))), slots.length === 0 && (_jsx("p", { className: "day-empty", children: "No availability slots for this day." }))] }), selectedSlot && (_jsxs("div", { className: "day-summary", children: [_jsxs("div", { children: [_jsx("div", { className: "day-summary-label", children: "Your booking" }), _jsxs("div", { className: "day-summary-value", children: [dayLabel, ", ", formatTime(selectedSlot.startAt), " \u2013", " ", formatTime(selectedSlot.endAt)] }), _jsxs("div", { className: "day-summary-duration", children: [getHours(selectedSlot.startAt, selectedSlot.endAt), " hours"] })] }), _jsx("button", { className: "btn-brand", onClick: handleContinue, children: "Continue \u2192" })] }))] }));
}
