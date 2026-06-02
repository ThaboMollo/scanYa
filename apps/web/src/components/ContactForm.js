import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
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
    const { selectedSlot, selectedDate, setBookingStep, session, bookingDetails, loadBookingDetails, submitBooking, } = useAppState();
    const [name, setName] = useState(session?.user.name ?? "");
    const [email, setEmail] = useState(session?.user.email ?? "");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        void loadBookingDetails(assetId);
    }, [assetId, loadBookingDetails]);
    if (!selectedSlot)
        return null;
    const dateObj = new Date(selectedDate + "T00:00:00Z");
    const dayLabel = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    });
    const ownerHasWhatsapp = Boolean(bookingDetails?.owner.whatsappNumber);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await submitBooking(assetId, {
            contactName: name,
            contactEmail: email,
            location,
            notes,
        });
        setSubmitting(false);
    };
    return (_jsxs("div", { className: "contact-form", children: [_jsxs("div", { className: "contact-slot-summary", children: [_jsxs("div", { children: [_jsx("div", { className: "contact-slot-label", children: "Your booking" }), _jsxs("div", { className: "contact-slot-value", children: [dayLabel, ", ", formatTime(selectedSlot.startAt), " \u2013", " ", formatTime(selectedSlot.endAt)] })] }), _jsx("button", { className: "contact-change-link", onClick: () => setBookingStep("calendar"), children: "Change" })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "contact-field", children: [_jsx("label", { className: "input-label", htmlFor: "booking-name", children: "Your name" }), _jsx("input", { id: "booking-name", className: "input", type: "text", required: true, value: name, onChange: (e) => setName(e.target.value), placeholder: "Full name" })] }), _jsxs("div", { className: "contact-field", children: [_jsx("label", { className: "input-label", htmlFor: "booking-email", children: "Your email" }), _jsx("input", { id: "booking-email", className: "input", type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com" })] }), _jsxs("div", { className: "contact-field", children: [_jsx("label", { className: "input-label", htmlFor: "booking-location", children: "Where do you need it?" }), _jsx("input", { id: "booking-location", className: "input", type: "text", required: true, minLength: 2, value: location, onChange: (e) => setLocation(e.target.value), placeholder: "Address or area" })] }), _jsxs("div", { className: "contact-field", children: [_jsx("label", { className: "input-label", htmlFor: "booking-notes", children: "Notes (optional)" }), _jsx("textarea", { id: "booking-notes", className: "input", rows: 3, value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "Tell the owner about your event or needs" })] }), _jsx("button", { className: "btn-brand-lg", type: "submit", disabled: submitting || !ownerHasWhatsapp, children: submitting ? "Sending..." : "Send via WhatsApp →" })] }), !ownerHasWhatsapp && (_jsx("p", { className: "contact-note", children: "This asset owner has not added a WhatsApp number yet, so booking is unavailable." })), _jsxs("p", { className: "contact-note", children: ["We'll save your request for ", _jsx("strong", { children: assetTitle }), ", then open WhatsApp to message the owner."] })] }));
}
