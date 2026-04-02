export type UserRole = "asset_owner" | "event_organizer" | "attendee";

export type User = {
  id: string;
  company: string;
  createdAt: string;
  email: string;
  lastLoginAt: string | null;
  name: string;
  password: string;
  role: UserRole;
};

export type PublicUser = Omit<User, "password">;

export type Session = {
  id: string;
  token: string;
  userId: string;
  createdAt: string;
};

export type AssetStatus = "draft" | "published" | "archived";

export type Asset = {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  description: string;
  location: string;
  minimumNoticeHours: number;
  minimumRentalHours: number;
  priceLabel: string;
  status: AssetStatus;
  createdAt: string;
};

export type AssetAvailabilityRule = {
  id: string;
  assetId: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";

export type Booking = {
  id: string;
  assetId: string;
  contactEmail: string;
  contactName: string;
  createdAt: string;
  endAt: string;
  notes: string;
  requesterId: string | null;
  startAt: string;
  status: BookingStatus;
};

export type QrCode = {
  id: string;
  ownerId: string;
  scanCount: number;
  status: "active" | "disabled";
  targetId: string;
  targetType: "asset_booking" | "event_page";
  token: string;
};

export type AvailabilityWindow = {
  startAt: string;
  endAt: string;
};

export type AvailabilityResponse = {
  assetId: string;
  date: string;
  windows: AvailabilityWindow[];
  bookings: Booking[];
};

export type DayAvailabilitySummary = {
  date: string;
  hasOpenSlots: boolean;
  slotCount: number;
};

export type MonthAvailabilityResponse = {
  assetId: string;
  month: string;
  days: DayAvailabilitySummary[];
};

export type LoginResponse = {
  session: Session;
  user: PublicUser;
};
