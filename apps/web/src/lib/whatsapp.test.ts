import { describe, expect, it } from "vitest";
import {
  buildWhatsappMessage,
  buildWhatsappUrl,
  formatDateTime,
  normalizeWhatsappNumber,
} from "./whatsapp";

describe("normalizeWhatsappNumber", () => {
  it("strips spaces, plus, and punctuation", () => {
    expect(normalizeWhatsappNumber("+27 82 123 4567")).toBe("27821234567");
  });

  it("converts a South African leading zero to the 27 country code", () => {
    expect(normalizeWhatsappNumber("082 123 4567")).toBe("27821234567");
  });

  it("leaves an already-international number unchanged", () => {
    expect(normalizeWhatsappNumber("27821234567")).toBe("27821234567");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeWhatsappNumber("")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("formats an ISO string as a readable UTC date and time", () => {
    expect(formatDateTime("2026-06-02T10:00:00.000Z")).toBe("2 Jun 2026, 10:00");
  });
});

describe("buildWhatsappMessage", () => {
  it("includes who, where, when, title, and reference, omitting empty notes", () => {
    const message = buildWhatsappMessage({
      assetTitle: "Mobile Fridge",
      contactName: "Thabo",
      contactEmail: "thabo@example.com",
      location: "Soweto",
      startAt: "2026-06-02T10:00:00.000Z",
      endAt: "2026-06-02T16:00:00.000Z",
      bookingId: "abc-123",
      notes: "",
    });

    expect(message).toContain("Hi, I would like to book Mobile Fridge.");
    expect(message).toContain("Who: Thabo");
    expect(message).toContain("Email: thabo@example.com");
    expect(message).toContain("Where: Soweto");
    expect(message).toContain("When: 2 Jun 2026, 10:00 to 2 Jun 2026, 16:00");
    expect(message).toContain("Booking reference: abc-123");
    expect(message).not.toContain("Notes:");
  });

  it("appends notes when present", () => {
    const message = buildWhatsappMessage({
      assetTitle: "Mobile Fridge",
      contactName: "Thabo",
      contactEmail: "thabo@example.com",
      location: "Soweto",
      startAt: "2026-06-02T10:00:00.000Z",
      endAt: "2026-06-02T16:00:00.000Z",
      bookingId: "abc-123",
      notes: "Need it cold by 9am",
    });

    expect(message).toContain("Notes: Need it cold by 9am");
  });
});

describe("buildWhatsappUrl", () => {
  it("builds a wa.me url with the encoded message", () => {
    const url = buildWhatsappUrl("27821234567", "Hi there");
    expect(url).toBe("https://wa.me/27821234567?text=Hi%20there");
  });
});
