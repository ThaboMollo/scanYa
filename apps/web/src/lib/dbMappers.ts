import type { Asset, Booking, PublicUser, QrCode } from "@scanya/shared";

type DbRow = Record<string, any>;

export function mapProfile(row: DbRow, email = ""): PublicUser {
  return {
    id: row.id,
    company: row.company ?? "",
    createdAt: row.created_at ?? "",
    email,
    lastLoginAt: null,
    name: row.name ?? "",
    role: row.role,
    whatsappNumber: row.whatsapp_number ?? null,
  };
}

export function mapAsset(row: DbRow): Asset {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    category: row.category,
    description: row.description,
    location: row.location,
    minimumNoticeHours: row.minimum_notice_hours,
    minimumRentalHours: row.minimum_rental_hours,
    priceLabel: row.price_label,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapBooking(row: DbRow): Booking {
  return {
    id: row.id,
    assetId: row.asset_id,
    contactEmail: row.contact_email,
    contactName: row.contact_name,
    createdAt: row.created_at,
    endAt: row.end_at,
    location: row.location ?? "",
    notes: row.notes ?? "",
    requesterId: row.requester_id,
    startAt: row.start_at,
    status: row.status,
  };
}

export function mapQrCode(row: DbRow): QrCode {
  return {
    id: row.id,
    ownerId: row.owner_id,
    scanCount: row.scan_count,
    status: row.status,
    targetId: row.target_id,
    targetType: row.target_type,
    token: row.token,
  };
}
