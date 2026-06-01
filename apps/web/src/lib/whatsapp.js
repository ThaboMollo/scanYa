export function normalizeWhatsappNumber(value) {
    const digits = value.replace(/[^\d]/g, "");
    if (digits.startsWith("0")) {
        return `27${digits.slice(1)}`;
    }
    return digits;
}
export function formatDateTime(iso) {
    return new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
    });
}
export function buildWhatsappMessage(input) {
    return [
        `Hi, I would like to book ${input.assetTitle}.`,
        "",
        `Who: ${input.contactName}`,
        `Email: ${input.contactEmail}`,
        `Where: ${input.location}`,
        `When: ${formatDateTime(input.startAt)} to ${formatDateTime(input.endAt)}`,
        "",
        `Booking reference: ${input.bookingId}`,
        input.notes ? `Notes: ${input.notes}` : null,
    ]
        .filter((line) => line !== null)
        .join("\n");
}
export function buildWhatsappUrl(whatsappNumber, message) {
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
