import { supabaseAdmin } from "./lib/supabase.js";
import crypto from "node:crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateAssetInput {
  title: string;
  category: string;
  description: string;
  location: string;
  minimumNoticeHours: number;
  minimumRentalHours: number;
  priceLabel: string;
}

export interface CreateBookingInput {
  assetId: string;
  contactName: string;
  contactEmail: string;
  startAt: string;
  endAt: string;
  notes?: string;
}

// ─── Assets ─────────────────────────────────────────────────────────────────

export async function createAsset(ownerId: string, input: CreateAssetInput) {
  const { data, error } = await supabaseAdmin
    .from("assets")
    .insert({
      owner_id: ownerId,
      title: input.title,
      category: input.category,
      description: input.description,
      location: input.location,
      minimum_notice_hours: input.minimumNoticeHours,
      minimum_rental_hours: input.minimumRentalHours,
      price_label: input.priceLabel,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateAsset(
  assetId: string,
  ownerId: string,
  input: Partial<CreateAssetInput>,
) {
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.minimumNoticeHours !== undefined) updateData.minimum_notice_hours = input.minimumNoticeHours;
  if (input.minimumRentalHours !== undefined) updateData.minimum_rental_hours = input.minimumRentalHours;
  if (input.priceLabel !== undefined) updateData.price_label = input.priceLabel;

  const { data, error } = await supabaseAdmin
    .from("assets")
    .update(updateData)
    .eq("id", assetId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw new Error("Asset not found or access denied.");
  return data;
}

export async function setAssetStatus(
  assetId: string,
  ownerId: string,
  status: "draft" | "published" | "archived",
) {
  const { data, error } = await supabaseAdmin
    .from("assets")
    .update({ status })
    .eq("id", assetId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw new Error("Asset not found or access denied.");
  return data;
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export async function createBooking(
  requesterId: string | null,
  input: CreateBookingInput,
) {
  // Validate asset exists and is published
  const { data: asset, error: assetError } = await supabaseAdmin
    .from("assets")
    .select("*")
    .eq("id", input.assetId)
    .eq("status", "published")
    .single();

  if (assetError || !asset) throw new Error("Asset not found or not available.");

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  const now = new Date();

  // Validate booking window
  if (endAt <= startAt) throw new Error("End time must be after start time.");

  const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
  if (durationHours < asset.minimum_rental_hours) {
    throw new Error(`Minimum rental is ${asset.minimum_rental_hours} hours.`);
  }

  const noticeHours = (startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (noticeHours < asset.minimum_notice_hours) {
    throw new Error(`At least ${asset.minimum_notice_hours} hours advance notice required.`);
  }

  // Check for conflicts
  const { data: conflicts } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("asset_id", input.assetId)
    .in("status", ["pending", "confirmed"])
    .lt("start_at", input.endAt)
    .gt("end_at", input.startAt);

  if (conflicts && conflicts.length > 0) {
    throw new Error("This time slot conflicts with an existing booking.");
  }

  // Determine status: anonymous bookings need email verification
  const isAnonymous = !requesterId;
  const verificationToken = isAnonymous
    ? crypto.randomBytes(32).toString("hex")
    : null;
  const verificationExpiresAt = isAnonymous
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      asset_id: input.assetId,
      requester_id: requesterId,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      start_at: input.startAt,
      end_at: input.endAt,
      status: isAnonymous ? "pending_verification" : "pending",
      verification_token: verificationToken,
      verification_expires_at: verificationExpiresAt,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return { booking, asset, isAnonymous, verificationToken };
}

export async function verifyBooking(token: string) {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("verification_token", token)
    .eq("status", "pending_verification")
    .single();

  if (error || !booking) throw new Error("Invalid or expired verification link.");

  if (new Date(booking.verification_expires_at) < new Date()) {
    throw new Error("Verification link has expired.");
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "pending",
      verification_token: null,
      verification_expires_at: null,
    })
    .eq("id", booking.id)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);
  return updated;
}

export async function updateBookingStatus(
  bookingId: string,
  ownerId: string,
  status: "confirmed" | "rejected",
) {
  // Verify the booking belongs to an asset owned by this user
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("*, assets!inner(owner_id)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) throw new Error("Booking not found.");
  if ((booking as any).assets.owner_id !== ownerId) throw new Error("Access denied.");

  const { data: updated, error } = await supabaseAdmin
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated;
}

// ─── QR Codes ───────────────────────────────────────────────────────────────

export async function createQrCode(
  assetId: string,
  targetType: "asset_booking" | "event_page",
  ownerId: string,
) {
  const token = `q_${crypto.randomBytes(8).toString("hex")}`;

  const { data, error } = await supabaseAdmin
    .from("qr_codes")
    .insert({
      owner_id: ownerId,
      target_type: targetType,
      target_id: assetId,
      token,
      status: "active",
      scan_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export async function getAssetOwnerEmail(assetId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("assets")
    .select("owner_id")
    .eq("id", assetId)
    .single();

  if (!data) return null;

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(data.owner_id);
  return user?.user?.email ?? null;
}

export async function getBookingWithAsset(bookingId: string) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*, assets(title, location, owner_id)")
    .eq("id", bookingId)
    .single();

  if (error) throw new Error("Booking not found.");
  return data;
}
