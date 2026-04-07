import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAppState } from "../state/AppContext";
function formatTime(iso) {
    return new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
    });
}
export function ContactForm({ assetId, assetTitle }) {
    const { selectedSlot, selectedDate, setBookingStep, createAnonymousBooking } = useAppState();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    if (!selectedSlot)
        return null;
    const dateObj = new Date(selectedDate + "T00:00:00Z");
    const dayLabel = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    });
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await createAnonymousBooking(assetId, {
            contactName: name,
            contactEmail: email,
            notes,
        });
        setSubmitting(false);
    };
    return (_jsxs("div", { className: "contact-form", children: [_jsxs("div", { className: "contact-slot-summary", children: [_jsxs("div", { children: [_jsx("div", { className: "contact-slot-label", children: "Your booking" }), _jsxs("div", { className: "contact-slot-value", children: [dayLabel, ", ", formatTime(selectedSlot.startAt), " \u2013", " ", formatTime(selectedSlot.endAt)] })] }), _jsx("button", { className: "contact-change-link", onClick: () => setBookingStep("calendar"), children: "Change" })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "contact-field", children: [_jsx("label", { className: "input-label", htmlFor: "booking-name", children: "Your name" }), _jsx("input", { id: "booking-name", className: "input", type: "text", required: true, value: name, onChange: (e) => setName(e.target.value), placeholder: "Full name" })] }), _jsxs("div", { className: "contact-field", children: [_jsx("label", { className: "input-label", htmlFor: "booking-email", children: "Your email" }), _jsx("input", { id: "booking-email", className: "input", type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com" })] }), _jsxs("div", { className: "contact-field", children: [_jsx("label", { className: "input-label", htmlFor: "booking-notes", children: "Notes (optional)" }), _jsx("textarea", { id: "booking-notes", className: "input", rows: 3, value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "Tell the owner about your event or needs" })] }), _jsx("button", { className: "btn-brand-lg", type: "submit", disabled: submitting, children: submitting ? "Sending..." : "Request Booking \u2192" })] }), _jsx("p", { className: "contact-note", children: "No account needed. The owner will confirm via your email." })] }));
}
