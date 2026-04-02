import { MongoClient, type Collection, type Db } from "mongodb";
import type {
  Asset,
  AssetAvailabilityRule,
  AvailabilityResponse,
  Booking,
  BookingStatus,
  DayAvailabilitySummary,
  MonthAvailabilityResponse,
  PublicUser,
  QrCode,
  Session,
  User,
  UserRole,
} from "@scanya/shared";

const now = () => new Date().toISOString();

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

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

type Collections = {
  assets: Collection<Asset>;
  availabilityRules: Collection<AssetAvailabilityRule>;
  bookings: Collection<Booking>;
  qrCodes: Collection<QrCode>;
  sessions: Collection<Session>;
  users: Collection<User>;
};

class MongoStore {
  private client: MongoClient;
  private db!: Db;
  private collections!: Collections;
  private initialized = false;

  constructor() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is required. Point the API at your MongoDB cluster.");
    }

    this.client = new MongoClient(uri);
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME ?? "scanya");
    this.collections = {
      assets: this.db.collection<Asset>("assets"),
      availabilityRules: this.db.collection<AssetAvailabilityRule>("assetAvailabilityRules"),
      bookings: this.db.collection<Booking>("bookings"),
      qrCodes: this.db.collection<QrCode>("qrCodes"),
      sessions: this.db.collection<Session>("sessions"),
      users: this.db.collection<User>("users"),
    };

    await Promise.all([
      this.collections.users.createIndex({ email: 1 }, { unique: true }),
      this.collections.sessions.createIndex({ token: 1 }, { unique: true }),
      this.collections.assets.createIndex({ ownerId: 1 }),
      this.collections.bookings.createIndex({ assetId: 1, startAt: 1 }),
      this.collections.qrCodes.createIndex({ token: 1 }, { unique: true }),
    ]);

    await this.seedIfEmpty();
    this.initialized = true;
  }

  private async seedIfEmpty() {
    const userCount = await this.collections.users.countDocuments();
    if (userCount > 0) {
      return;
    }

    const owner = await this.registerUser({
      email: "owner@scanya.app",
      name: "Owner Demo",
      password: "password123",
      role: "asset_owner",
      company: "scanYa Rentals",
    });

    const organizer = await this.registerUser({
      email: "organizer@scanya.app",
      name: "Organizer Demo",
      password: "password123",
      role: "event_organizer",
      company: "scanYa Events",
    });

    await this.registerUser({
      email: "attendee@scanya.app",
      name: "Attendee Demo",
      password: "password123",
      role: "attendee",
    });

    const fridge = await this.createAsset(owner.id, {
      category: "Mobile Fridge",
      description:
        "A towable mobile fridge suitable for outdoor festivals, weddings, and branded pop-up events.",
      location: "Johannesburg",
      minimumNoticeHours: 24,
      minimumRentalHours: 6,
      priceLabel: "From R2,500 / booking",
      title: "Festival Mobile Fridge",
    });

    await this.setAvailabilityRule(fridge.id, { dayOfWeek: 5, endHour: 18, startHour: 8 });
    await this.setAvailabilityRule(fridge.id, { dayOfWeek: 6, endHour: 18, startHour: 8 });

    await this.createQrCode(fridge.id, "asset_booking", owner.id);
    await this.createQrCode(organizer.id, "event_page", organizer.id);
  }

  async registerUser(input: RegisterInput): Promise<User> {
    const existing = await this.collections.users.findOne({ email: input.email.toLowerCase() });
    if (existing) {
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

    await this.collections.users.insertOne(user);
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.collections.users.findOne({
      email: email.toLowerCase(),
      password,
    });

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    const timestamp = now();
    await this.collections.users.updateOne({ id: user.id }, { $set: { lastLoginAt: timestamp } });

    const session: Session = {
      id: createId("session"),
      token: createId("token"),
      userId: user.id,
      createdAt: timestamp,
    };

    await this.collections.sessions.insertOne(session);

    return {
      session,
      user: {
        ...user,
        lastLoginAt: timestamp,
      },
    };
  }

  async getSession(token?: string) {
    if (!token) {
      return null;
    }

    return this.collections.sessions.findOne({ token });
  }

  async getUserById(userId: string) {
    return this.collections.users.findOne({ id: userId });
  }

  async updateUser(userId: string, updates: Partial<Pick<User, "company" | "name">>) {
    await this.collections.users.updateOne(
      { id: userId },
      {
        $set: {
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.company !== undefined ? { company: updates.company } : {}),
        },
      },
    );

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    return user;
  }

  async createAsset(ownerId: string, input: CreateAssetInput) {
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

    await this.collections.assets.insertOne(asset);
    return asset;
  }

  async updateAsset(assetId: string, ownerId: string, updates: Partial<CreateAssetInput>) {
    const asset = await this.collections.assets.findOne({ id: assetId, ownerId });
    if (!asset) {
      throw new Error("Asset not found.");
    }

    await this.collections.assets.updateOne(
      { id: assetId, ownerId },
      {
        $set: {
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.category !== undefined ? { category: updates.category } : {}),
          ...(updates.description !== undefined ? { description: updates.description } : {}),
          ...(updates.location !== undefined ? { location: updates.location } : {}),
          ...(updates.minimumNoticeHours !== undefined
            ? { minimumNoticeHours: updates.minimumNoticeHours }
            : {}),
          ...(updates.minimumRentalHours !== undefined
            ? { minimumRentalHours: updates.minimumRentalHours }
            : {}),
          ...(updates.priceLabel !== undefined ? { priceLabel: updates.priceLabel } : {}),
        },
      },
    );

    return (await this.collections.assets.findOne({ id: assetId, ownerId }))!;
  }

  async setAssetStatus(assetId: string, ownerId: string, status: Asset["status"]) {
    const result = await this.collections.assets.findOneAndUpdate(
      { id: assetId, ownerId },
      { $set: { status } },
      { returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Asset not found.");
    }

    return result;
  }

  async setAvailabilityRule(assetId: string, input: Omit<AssetAvailabilityRule, "assetId" | "id">) {
    const rule: AssetAvailabilityRule = {
      id: createId("availability"),
      assetId,
      dayOfWeek: input.dayOfWeek,
      startHour: input.startHour,
      endHour: input.endHour,
    };

    await this.collections.availabilityRules.insertOne(rule);
    return rule;
  }

  async getAvailability(assetId: string, date: string): Promise<AvailabilityResponse> {
    const asset = await this.collections.assets.findOne({ id: assetId, status: "published" });
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const target = new Date(date);
    const dayOfWeek = target.getUTCDay();
    const [rules, bookings] = await Promise.all([
      this.collections.availabilityRules.find({ assetId, dayOfWeek }).toArray(),
      this.collections.bookings
        .find({
          assetId,
          status: { $in: ["pending", "confirmed"] },
          startAt: { $regex: `^${date}` },
        })
        .toArray(),
    ]);

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

  async getMonthAvailability(assetId: string, month: string): Promise<MonthAvailabilityResponse> {
    const asset = await this.collections.assets.findOne({ id: assetId, status: "published" });
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const rules = await this.collections.availabilityRules.find({ assetId }).toArray();
    const monthBookings = await this.collections.bookings
      .find({
        assetId,
        status: { $in: ["pending", "confirmed"] },
        startAt: { $regex: `^${month}` },
      })
      .toArray();

    const days: DayAvailabilitySummary[] = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(date).getUTCDay();
      const dayRules = rules.filter((rule) => rule.dayOfWeek === dayOfWeek);
      const dayBookings = monthBookings.filter((booking) => booking.startAt.slice(0, 10) === date);

      let openSlots = 0;
      for (const rule of dayRules) {
        const ruleStart = new Date(`${date}T${String(rule.startHour).padStart(2, "0")}:00:00.000Z`);
        const ruleEnd = new Date(`${date}T${String(rule.endHour).padStart(2, "0")}:00:00.000Z`);

        const isFullyCovered = dayBookings.some(
          (booking) =>
            new Date(booking.startAt) <= ruleStart && new Date(booking.endAt) >= ruleEnd,
        );

        if (!isFullyCovered) {
          openSlots += 1;
        }
      }

      days.push({
        date,
        hasOpenSlots: openSlots > 0,
        slotCount: dayRules.length,
      });
    }

    return { assetId, month, days };
  }

  async createBooking(requesterId: string | null, input: CreateBookingInput) {
    const asset = await this.collections.assets.findOne({ id: input.assetId });
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

    const conflicting = await this.collections.bookings.findOne({
      assetId: input.assetId,
      status: { $in: ["pending", "confirmed"] },
      startAt: { $lt: input.endAt },
      endAt: { $gt: input.startAt },
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

    await this.collections.bookings.insertOne(booking);
    return booking;
  }

  async updateBookingStatus(bookingId: string, ownerId: string, status: BookingStatus) {
    const booking = await this.collections.bookings.findOne({ id: bookingId });
    if (!booking) {
      throw new Error("Booking not found.");
    }

    const asset = await this.collections.assets.findOne({ id: booking.assetId, ownerId });
    if (!asset) {
      throw new Error("Booking not found.");
    }

    await this.collections.bookings.updateOne({ id: bookingId }, { $set: { status } });
    return (await this.collections.bookings.findOne({ id: bookingId }))!;
  }

  async getOwnerBookings(ownerId: string) {
    const assets = await this.collections.assets.find({ ownerId }).project({ id: 1 }).toArray();
    const assetIds = assets.map((asset) => asset.id);
    return this.collections.bookings.find({ assetId: { $in: assetIds } }).toArray();
  }

  async getUserBookings(userId: string) {
    return this.collections.bookings.find({ requesterId: userId }).toArray();
  }

  async listPublishedAssets() {
    return this.collections.assets.find({ status: "published" }).toArray();
  }

  async listAssetsForOwner(ownerId: string) {
    return this.collections.assets.find({ ownerId }).toArray();
  }

  async createQrCode(targetId: string, targetType: QrCode["targetType"], ownerId: string) {
    const qrCode: QrCode = {
      id: createId("qr"),
      ownerId,
      scanCount: 0,
      status: "active",
      targetId,
      targetType,
      token: createId("q"),
    };

    await this.collections.qrCodes.insertOne(qrCode);
    return qrCode;
  }

  async listQrCodesForOwner(ownerId: string) {
    return this.collections.qrCodes.find({ ownerId }).toArray();
  }

  async resolveQr(token: string) {
    const qrCode = await this.collections.qrCodes.findOne({ token, status: "active" });
    if (!qrCode) {
      throw new Error("QR code not found.");
    }

    await this.collections.qrCodes.updateOne({ token }, { $inc: { scanCount: 1 } });
    return {
      ...qrCode,
      scanCount: qrCode.scanCount + 1,
    };
  }
}

export const store = new MongoStore();

export const toPublicUser = (user: User): PublicUser => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};
