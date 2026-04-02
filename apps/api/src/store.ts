import type {
  Asset,
  AssetAvailabilityRule,
  Booking,
  PublicUser,
  BookingStatus,
  QrCode,
  Session,
  User,
  UserRole,
} from "@scanya/shared";

const now = () => new Date().toISOString();

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export type RegisterInput = {
  company?: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

export type CreateAssetInput = {
  category: string;
  description: string;
  location: string;
  minimumNoticeHours: number;
  minimumRentalHours: number;
  priceLabel: string;
  title: string;
};

export type CreateBookingInput = {
  assetId: string;
  contactEmail: string;
  contactName: string;
  endAt: string;
  notes?: string;
  startAt: string;
};

class InMemoryStore {
  users: User[] = [];
  sessions: Session[] = [];
  assets: Asset[] = [];
  availabilityRules: AssetAvailabilityRule[] = [];
  bookings: Booking[] = [];
  qrCodes: QrCode[] = [];

  constructor() {
    const owner = this.registerUser({
      email: "owner@scanya.app",
      name: "Owner Demo",
      password: "password123",
      role: "asset_owner",
      company: "scanYa Rentals",
    });

    const organizer = this.registerUser({
      email: "organizer@scanya.app",
      name: "Organizer Demo",
      password: "password123",
      role: "event_organizer",
      company: "scanYa Events",
    });

    this.registerUser({
      email: "attendee@scanya.app",
      name: "Attendee Demo",
      password: "password123",
      role: "attendee",
    });

    const fridge = this.createAsset(owner.id, {
      category: "Mobile Fridge",
      description:
        "A towable mobile fridge suitable for outdoor festivals, weddings, and branded pop-up events.",
      location: "Johannesburg",
      minimumNoticeHours: 24,
      minimumRentalHours: 6,
      priceLabel: "From R2,500 / booking",
      title: "Festival Mobile Fridge",
    });

    this.setAvailabilityRule(fridge.id, {
      dayOfWeek: 5,
      endHour: 18,
      startHour: 8,
    });
    this.setAvailabilityRule(fridge.id, {
      dayOfWeek: 6,
      endHour: 18,
      startHour: 8,
    });

    this.createQrCode(fridge.id, "asset_booking", owner.id);
    this.createQrCode(organizer.id, "event_page", organizer.id);
  }

  registerUser(input: RegisterInput): User {
    if (this.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("An account with that email already exists.");
    }

    const user: User = {
      id: createId("user"),
      company: input.company ?? "",
      createdAt: now(),
      email: input.email.toLowerCase(),
      lastLoginAt: null,
      name: input.name,
      password: input.password,
      role: input.role,
    };

    this.users.push(user);
    return user;
  }

  login(email: string, password: string) {
    const user = this.users.find(
      (entry) => entry.email === email.toLowerCase() && entry.password === password,
    );

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    user.lastLoginAt = now();

    const session: Session = {
      id: createId("session"),
      token: createId("token"),
      userId: user.id,
      createdAt: now(),
    };

    this.sessions.push(session);

    return { session, user };
  }

  getSession(token?: string) {
    if (!token) {
      return null;
    }

    return this.sessions.find((session) => session.token === token) ?? null;
  }

  getUserById(userId: string) {
    return this.users.find((user) => user.id === userId) ?? null;
  }

  updateUser(userId: string, updates: Partial<Pick<User, "company" | "name">>) {
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    user.name = updates.name ?? user.name;
    user.company = updates.company ?? user.company;
    return user;
  }

  createAsset(ownerId: string, input: CreateAssetInput) {
    const asset: Asset = {
      id: createId("asset"),
      ownerId,
      title: input.title,
      category: input.category,
      description: input.description,
      location: input.location,
      minimumNoticeHours: input.minimumNoticeHours,
      minimumRentalHours: input.minimumRentalHours,
      priceLabel: input.priceLabel,
      status: "published",
      createdAt: now(),
    };

    this.assets.push(asset);
    return asset;
  }

  updateAsset(assetId: string, ownerId: string, updates: Partial<CreateAssetInput>) {
    const asset = this.assets.find((entry) => entry.id === assetId);

    if (!asset || asset.ownerId !== ownerId) {
      throw new Error("Asset not found.");
    }

    asset.title = updates.title ?? asset.title;
    asset.category = updates.category ?? asset.category;
    asset.description = updates.description ?? asset.description;
    asset.location = updates.location ?? asset.location;
    asset.minimumNoticeHours = updates.minimumNoticeHours ?? asset.minimumNoticeHours;
    asset.minimumRentalHours = updates.minimumRentalHours ?? asset.minimumRentalHours;
    asset.priceLabel = updates.priceLabel ?? asset.priceLabel;
    return asset;
  }

  setAssetStatus(assetId: string, ownerId: string, status: Asset["status"]) {
    const asset = this.assets.find((entry) => entry.id === assetId);

    if (!asset || asset.ownerId !== ownerId) {
      throw new Error("Asset not found.");
    }

    asset.status = status;
    return asset;
  }

  setAvailabilityRule(assetId: string, input: Omit<AssetAvailabilityRule, "assetId" | "id">) {
    const rule: AssetAvailabilityRule = {
      id: createId("availability"),
      assetId,
      dayOfWeek: input.dayOfWeek,
      startHour: input.startHour,
      endHour: input.endHour,
    };

    this.availabilityRules.push(rule);
    return rule;
  }

  getAvailability(assetId: string, date: string) {
    const asset = this.assets.find((entry) => entry.id === assetId && entry.status === "published");
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const target = new Date(date);
    const dayOfWeek = target.getUTCDay();
    const rules = this.availabilityRules.filter((rule) => rule.assetId === assetId && rule.dayOfWeek === dayOfWeek);
    const bookings = this.bookings.filter(
      (booking) =>
        booking.assetId === assetId &&
        ["pending", "confirmed"].includes(booking.status) &&
        booking.startAt.slice(0, 10) === date,
    );

    return {
      assetId,
      date,
      windows: rules.map((rule) => ({
        startAt: `${date}T${String(rule.startHour).padStart(2, "0")}:00:00.000Z`,
        endAt: `${date}T${String(rule.endHour).padStart(2, "0")}:00:00.000Z`,
      })),
      bookings,
    };
  }

  getMonthAvailability(assetId: string, month: string) {
    const asset = this.assets.find((entry) => entry.id === assetId && entry.status === "published");
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const days: { date: string; hasOpenSlots: boolean; slotCount: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const target = new Date(date);
      const dayOfWeek = target.getUTCDay();

      const rules = this.availabilityRules.filter(
        (rule) => rule.assetId === assetId && rule.dayOfWeek === dayOfWeek,
      );

      const dayBookings = this.bookings.filter(
        (booking) =>
          booking.assetId === assetId &&
          ["pending", "confirmed"].includes(booking.status) &&
          booking.startAt.slice(0, 10) === date,
      );

      let openSlots = 0;
      for (const rule of rules) {
        const ruleStart = new Date(`${date}T${String(rule.startHour).padStart(2, "0")}:00:00.000Z`);
        const ruleEnd = new Date(`${date}T${String(rule.endHour).padStart(2, "0")}:00:00.000Z`);

        const isFullyCovered = dayBookings.some(
          (booking) =>
            new Date(booking.startAt) <= ruleStart && new Date(booking.endAt) >= ruleEnd,
        );

        if (!isFullyCovered) {
          openSlots++;
        }
      }

      days.push({
        date,
        hasOpenSlots: openSlots > 0,
        slotCount: rules.length,
      });
    }

    return { assetId, month, days };
  }

  createBooking(requesterId: string | null, input: CreateBookingInput) {
    const asset = this.assets.find((entry) => entry.id === input.assetId);
    if (!asset || asset.status !== "published") {
      throw new Error("Asset is not bookable.");
    }

    const start = new Date(input.startAt);
    const end = new Date(input.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new Error("Invalid booking window.");
    }

    const durationHours = (end.getTime() - start.getTime()) / 3_600_000;
    if (durationHours < asset.minimumRentalHours) {
      throw new Error(`Minimum rental duration is ${asset.minimumRentalHours} hours.`);
    }

    const hoursUntilStart = (start.getTime() - Date.now()) / 3_600_000;
    if (hoursUntilStart < asset.minimumNoticeHours) {
      throw new Error(`Bookings require ${asset.minimumNoticeHours} hours notice.`);
    }

    const conflicting = this.bookings.some((booking) => {
      if (booking.assetId !== input.assetId || !["pending", "confirmed"].includes(booking.status)) {
        return false;
      }

      return start < new Date(booking.endAt) && end > new Date(booking.startAt);
    });

    if (conflicting) {
      throw new Error("That slot is no longer available.");
    }

    const booking: Booking = {
      id: createId("booking"),
      assetId: input.assetId,
      contactEmail: input.contactEmail,
      contactName: input.contactName,
      createdAt: now(),
      endAt: input.endAt,
      notes: input.notes ?? "",
      requesterId,
      startAt: input.startAt,
      status: "pending",
    };

    this.bookings.push(booking);
    return booking;
  }

  updateBookingStatus(bookingId: string, ownerId: string, status: BookingStatus) {
    const booking = this.bookings.find((entry) => entry.id === bookingId);
    if (!booking) {
      throw new Error("Booking not found.");
    }

    const asset = this.assets.find((entry) => entry.id === booking.assetId);
    if (!asset || asset.ownerId !== ownerId) {
      throw new Error("Booking not found.");
    }

    booking.status = status;
    return booking;
  }

  getOwnerBookings(ownerId: string) {
    const assetIds = this.assets.filter((asset) => asset.ownerId === ownerId).map((asset) => asset.id);
    return this.bookings.filter((booking) => assetIds.includes(booking.assetId));
  }

  getUserBookings(userId: string) {
    return this.bookings.filter((booking) => booking.requesterId === userId);
  }

  listPublishedAssets() {
    return this.assets.filter((asset) => asset.status === "published");
  }

  listAssetsForOwner(ownerId: string) {
    return this.assets.filter((asset) => asset.ownerId === ownerId);
  }

  createQrCode(targetId: string, targetType: QrCode["targetType"], ownerId: string) {
    const qrCode: QrCode = {
      id: createId("qr"),
      ownerId,
      scanCount: 0,
      status: "active",
      targetId,
      targetType,
      token: createId("q"),
    };

    this.qrCodes.push(qrCode);
    return qrCode;
  }

  listQrCodesForOwner(ownerId: string) {
    return this.qrCodes.filter((qr) => qr.ownerId === ownerId);
  }

  resolveQr(token: string) {
    const qrCode = this.qrCodes.find((entry) => entry.token === token && entry.status === "active");
    if (!qrCode) {
      throw new Error("QR code not found.");
    }

    qrCode.scanCount += 1;
    return qrCode;
  }
}

export const store = new InMemoryStore();

export const toPublicUser = (user: User): PublicUser => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};
