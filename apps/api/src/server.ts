import cors from "cors";
import express from "express";
import { z } from "zod";
import { attachAuth, requireAuth, requireRole } from "./auth.js";
import { store, toPublicUser } from "./store.js";
import type { AuthenticatedRequest } from "./types.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const configuredOrigins = [
  process.env.APP_BASE_URL,
  process.env.ALLOWED_ORIGINS,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin?: string) => {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS."));
    },
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

app.post("/auth/register", async (request, response) => {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const user = await store.registerUser(result.data);
    response.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.post("/auth/login", async (request, response) => {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const payload = await store.login(result.data.email, result.data.password);
    response.json({ ...payload, user: toPublicUser(payload.user) });
  } catch (error) {
    response.status(401).json({ error: (error as Error).message });
  }
});

app.get("/me", requireAuth, (request: AuthenticatedRequest, response) => {
  response.json({ user: toPublicUser(request.user!), session: request.session });
});

app.patch("/me", requireAuth, async (request: AuthenticatedRequest, response) => {
  const result = profileSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const user = await store.updateUser(request.user!.id, result.data);
    response.json({ user: toPublicUser(user) });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.get("/assets", async (_request, response) => {
  response.json({ assets: await store.listPublishedAssets() });
});

app.get("/assets/mine", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  response.json({ assets: await store.listAssetsForOwner(request.user!.id) });
});

app.post("/assets", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  const result = assetSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const asset = await store.createAsset(request.user!.id, result.data);
    response.status(201).json({ asset });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.patch("/assets/:id", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  const result = assetSchema.partial().safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const asset = await store.updateAsset(String(request.params.id), request.user!.id, result.data);
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/publish", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const asset = await store.setAssetStatus(String(request.params.id), request.user!.id, "published");
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/unpublish", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const asset = await store.setAssetStatus(String(request.params.id), request.user!.id, "draft");
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.get("/assets/:id/availability/month", async (req, res) => {
  const month = req.query.month as string;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month query parameter required (YYYY-MM)" });
    return;
  }
  try {
    const result = await store.getMonthAvailability(req.params.id, month);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.get("/assets/:id/availability", async (request, response) => {
  const date = String(request.query.date ?? "").slice(0, 10);
  if (!date) {
    response.status(400).json({ error: "Query param 'date' is required." });
    return;
  }

  try {
    const availability = await store.getAvailability(request.params.id, date);
    response.json(availability);
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/bookings", async (request: AuthenticatedRequest, response) => {
  const result = bookingSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const booking = await store.createBooking(request.user?.id ?? null, result.data);
    response.status(201).json({
      booking,
      notification: "Booking request received. Owner notification queued.",
    });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.get("/bookings/mine", requireAuth, async (request: AuthenticatedRequest, response) => {
  response.json({ bookings: await store.getUserBookings(request.user!.id) });
});

app.get("/owner/bookings", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  response.json({ bookings: await store.getOwnerBookings(request.user!.id) });
});

app.post("/bookings/:id/confirm", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const booking = await store.updateBookingStatus(String(request.params.id), request.user!.id, "confirmed");
    response.json({
      booking,
      notification: "Booking confirmed. Requester notification queued.",
    });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/bookings/:id/reject", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const booking = await store.updateBookingStatus(String(request.params.id), request.user!.id, "rejected");
    response.json({
      booking,
      notification: "Booking rejected. Requester notification queued.",
    });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.get("/qr/mine", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  const qrCodes = await store.listQrCodesForOwner(request.user!.id);
  response.json({ qrCodes });
});

app.post("/assets/:id/qr", requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const qrCode = await store.createQrCode(String(request.params.id), "asset_booking", request.user!.id);
    response.status(201).json({ qrCode });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.get("/q/:token", async (request, response) => {
  try {
    const qrCode = await store.resolveQr(String(request.params.token));
    response.json({ qrCode });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

await store.initialize();

app.listen(port, () => {
  console.log(`scanYa API listening on port ${port}`);
});
