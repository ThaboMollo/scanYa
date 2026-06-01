export function normalizeWhatsappNumber(value: string): string {
  const digits = value.replace(/[^\d]/g, "");

  if (digits.startsWith("0")) {
    return `27${digits.slice(1)}`;
  }

  return digits;
}

export function formatDateTime(iso: string): string {
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

type WhatsappMessageInput = {
  assetTitle: string;
  contactName: string;
  contactEmail: string;
  location: string;
  startAt: string;
  endAt: string;
  bookingId: string;
  notes?: string;
};

export function buildWhatsappMessage(input: WhatsappMessageInput): string {
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

export function buildWhatsappUrl(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
