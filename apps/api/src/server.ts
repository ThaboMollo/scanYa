import cors from "cors";
import express from "express";
import { z } from "zod";
import { attachAuth, requireAuth, requireRole } from "./auth.js";
import { store, toPublicUser } from "./store.js";
import type { AuthenticatedRequest } from "./types.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:5173";

app.use(
  cors({
    origin: appBaseUrl,
  }),
);
app.use(express.json());
app.use(attachAuth);

const registerSchema = z.object({
  company: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["asset_owner", "event_organizer", "attendee"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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

const profileSchema = z.object({
  company: z.string().optional(),
  name: z.string().min(2).optional(),
});

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/auth/register", (request, response) => {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const user = store.registerUser(result.data);
    response.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.post("/auth/login", (request, response) => {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const payload = store.login(result.data.email, result.data.password);
    response.json({ ...payload, user: toPublicUser(payload.user) });
  } catch (error) {
    response.status(401).json({ error: (error as Error).message });
  }
});

app.get("/me", requireAuth, (request: AuthenticatedRequest, response) => {
  response.json({ user: toPublicUser(request.user!), session: request.session });
});

app.patch("/me", requireAuth, (request: AuthenticatedRequest, response) => {
  const result = profileSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const user = store.updateUser(request.user!.id, result.data);
    response.json({ user: toPublicUser(user) });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.get("/assets", (_request, response) => {
  response.json({ assets: store.listPublishedAssets() });
});

app.get("/assets/mine", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  response.json({ assets: store.listAssetsForOwner(request.user!.id) });
});

app.post("/assets", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  const result = assetSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const asset = store.createAsset(request.user!.id, result.data);
    response.status(201).json({ asset });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.patch("/assets/:id", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  const result = assetSchema.partial().safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const asset = store.updateAsset(String(request.params.id), request.user!.id, result.data);
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/publish", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  try {
    const asset = store.setAssetStatus(String(request.params.id), request.user!.id, "published");
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/unpublish", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  try {
    const asset = store.setAssetStatus(String(request.params.id), request.user!.id, "draft");
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.get("/assets/:id/availability/month", (req, res) => {
  const month = req.query.month as string;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month query parameter required (YYYY-MM)" });
    return;
  }
  try {
    const result = store.getMonthAvailability(req.params.id, month);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.get("/assets/:id/availability", (request, response) => {
  const date = String(request.query.date ?? "").slice(0, 10);
  if (!date) {
    response.status(400).json({ error: "Query param 'date' is required." });
    return;
  }

  try {
    const availability = store.getAvailability(request.params.id, date);
    response.json(availability);
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/bookings", (request: AuthenticatedRequest, response) => {
  const result = bookingSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const booking = store.createBooking(request.user?.id ?? null, result.data);
    response.status(201).json({
      booking,
      notification: "Booking request received. Owner notification queued.",
    });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.get("/bookings/mine", requireAuth, (request: AuthenticatedRequest, response) => {
  response.json({ bookings: store.getUserBookings(request.user!.id) });
});

app.get("/owner/bookings", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  response.json({ bookings: store.getOwnerBookings(request.user!.id) });
});

app.post("/bookings/:id/confirm", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  try {
    const booking = store.updateBookingStatus(String(request.params.id), request.user!.id, "confirmed");
    response.json({
      booking,
      notification: "Booking confirmed. Requester notification queued.",
    });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/bookings/:id/reject", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  try {
    const booking = store.updateBookingStatus(String(request.params.id), request.user!.id, "rejected");
    response.json({
      booking,
      notification: "Booking rejected. Requester notification queued.",
    });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/qr", requireRole("asset_owner"), (request: AuthenticatedRequest, response) => {
  try {
    const qrCode = store.createQrCode(String(request.params.id), "asset_booking", request.user!.id);
    response.status(201).json({ qrCode });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.get("/q/:token", (request, response) => {
  try {
    const qrCode = store.resolveQr(String(request.params.token));
    response.json({ qrCode });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.listen(port, () => {
  console.log(`scanYa API listening on port ${port}`);
});
