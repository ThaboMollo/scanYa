import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useAppState } from "../state/AppContext";
import { MonthCalendar } from "./MonthCalendar";
import { DayTimeline } from "./DayTimeline";
import { ContactForm } from "./ContactForm";
export function BookingCalendar({ assetId, assetTitle }) {
    const { calendarView, bookingStep, selectedMonth, loadMonthAvailability, } = useAppState();
    useEffect(() => {
        loadMonthAvailability(assetId, selectedMonth);
    }, [assetId, selectedMonth, loadMonthAvailability]);
    if (bookingStep === "contact") {
        return _jsx(ContactForm, { assetId: assetId, assetTitle: assetTitle });
    }
    if (bookingStep === "success") {
        return _jsx(BookingSuccess, { assetTitle: assetTitle });
    }
    return (_jsxs("div", { className: "booking-calendar", children: [_jsx("h3", { className: "booking-calendar-title", children: "Book this asset" }), calendarView === "month" ? (_jsx(MonthCalendar, { assetId: assetId })) : (_jsx(DayTimeline, { assetId: assetId }))] }));
}
function BookingSuccess({ assetTitle }) {
    const { lastBookingRef, bookingForm } = useAppState();
    return (_jsxs("div", { className: "booking-success", children: [_jsx("div", { className: "booking-success-icon", children: "\u2713" }), _jsx("h3", { className: "booking-success-title", children: "Booking request sent!" }), _jsxs("p", { className: "booking-success-text", children: ["The owner of ", _jsx("strong", { children: assetTitle }), " will review your request and contact you at ", _jsx("strong", { children: bookingForm.contactEmail }), "."] }), lastBookingRef && (_jsxs("p", { className: "booking-success-ref", children: ["Reference: #", lastBookingRef] })), _jsx("a", { href: "/assets", className: "btn btn-ghost", style: { marginTop: 16 }, children: "Browse more assets" })] }));
}
