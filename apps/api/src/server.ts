import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { attachAuth, requireAuth, requireRole } from "./middleware/auth.js";
import type { AuthenticatedRequest } from "./middleware/auth.js";
import * as store from "./store.js";
import { sendBookingCreatedEmail, sendBookingVerificationEmail, sendBookingStatusEmail } from "./email.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

// ─── Security ───────────────────────────────────────────────────────────────

app.use(helmet());

const allowedOrigins = [
  process.env.APP_BASE_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS."));
    },
  }),
);

app.use(express.json());
app.use(attachAuth);

// Rate limiters
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many booking requests. Try again in a minute." },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Try again in a minute." },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Try again in a minute." },
});

app.use(generalLimiter);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const assetSchema = z.object({
  category: z.string().min(2),
  description: z.string().min(10),
  location: z.string().min(2),
  minimumNoticeHours: z.number().int().min(0),
  minimumRentalHours: z.number().int().min(1),
  priceLabel: z.string().min(2),
  title: z.string().min(3),
});

const bookingSchema = z.object({
  assetId: z.string().min(1),
  contactEmail: z.string().email(),
  contactName: z.string().min(2),
  endAt: z.string().datetime(),
  notes: z.string().optional(),
  startAt: z.string().datetime(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

// Assets (write operations only — reads go directly to Supabase from frontend)
app.post("/assets", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  const result = assetSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const asset = await store.createAsset(request.userId!, result.data as store.CreateAssetInput);
    response.status(201).json({ asset });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.patch("/assets/:id", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  const result = assetSchema.partial().safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const asset = await store.updateAsset(String(request.params.id), request.userId!, result.data);
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/publish", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const asset = await store.setAssetStatus(String(request.params.id), request.userId!, "published");
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/unpublish", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const asset = await store.setAssetStatus(String(request.params.id), request.userId!, "draft");
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

// Bookings
app.post("/bookings", bookingLimiter, async (request: AuthenticatedRequest, response) => {
  const result = bookingSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const { booking, asset, isAnonymous, verificationToken } = await store.createBooking(
      request.userId ?? null,
      result.data as store.CreateBookingInput,
    );

    if (isAnonymous && verificationToken) {
      const verifyUrl = `${process.env.APP_BASE_URL}/bookings/verify/${verificationToken}`;
      await sendBookingVerificationEmail(booking.contact_email, booking.contact_name, asset.title, verifyUrl);
      response.status(201).json({
        booking,
        notification: "Please check your email to confirm this booking.",
      });
    } else {
      const ownerEmail = await store.getAssetOwnerEmail(booking.asset_id);
      if (ownerEmail) {
        await sendBookingCreatedEmail(ownerEmail, asset.title, booking);
      }
      response.status(201).json({
        booking,
        notification: "Booking request received. Owner has been notified.",
      });
    }
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.get("/bookings/verify/:token", async (request, response) => {
  try {
    const booking = await store.verifyBooking(String(request.params.token));
    const bookingWithAsset = await store.getBookingWithAsset(booking.id);
    const ownerEmail = await store.getAssetOwnerEmail(booking.asset_id);

    if (ownerEmail) {
      await sendBookingCreatedEmail(ownerEmail, (bookingWithAsset as any).assets.title, booking);
    }

    response.json({ booking, message: "Booking verified. The asset owner has been notified." });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.post("/bookings/:id/confirm", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const booking = await store.updateBookingStatus(String(request.params.id), request.userId!, "confirmed");
    await sendBookingStatusEmail(booking.contact_email, booking.contact_name, "confirmed");

    response.json({ booking, notification: "Booking confirmed. Requester has been notified." });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/bookings/:id/reject", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const booking = await store.updateBookingStatus(String(request.params.id), request.userId!, "rejected");
    await sendBookingStatusEmail(booking.contact_email, booking.contact_name, "rejected");

    response.json({ booking, notification: "Booking rejected. Requester has been notified." });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

// QR Codes
app.post("/assets/:id/qr", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const qrCode = await store.createQrCode(String(request.params.id), "asset_booking", request.userId!);
    response.status(201).json({ qrCode });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

// ─── Start ──────────────────────────────────────────────────────────────────

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`scanYa API listening on port ${port}`);
  });
}

export default app;
