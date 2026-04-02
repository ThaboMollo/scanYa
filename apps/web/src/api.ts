import type {
  Asset,
  AvailabilityResponse,
  Booking,
  LoginResponse,
  MonthAvailabilityResponse,
  PublicUser,
  QrCode,
  Session,
  User,
} from "@scanya/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload as T;
}

export const api = {
  login(email: string, password: string) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  register(input: {
    company?: string;
    email: string;
    name: string;
    password: string;
    role: User["role"];
  }) {
    return request<{ user: PublicUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  me(token: string) {
    return request<{ session: Session; user: PublicUser }>("/me", {}, token);
  },
  updateMe(token: string, input: Partial<Pick<PublicUser, "company" | "name">>) {
    return request<{ user: PublicUser }>(
      "/me",
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
      token,
    );
  },
  listAssets() {
    return request<{ assets: Asset[] }>("/assets");
  },
  listMyAssets(token: string) {
    return request<{ assets: Asset[] }>("/assets/mine", {}, token);
  },
  createAsset(token: string, input: Omit<Asset, "createdAt" | "id" | "ownerId" | "status">) {
    return request<{ asset: Asset }>(
      "/assets",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token,
    );
  },
  getAvailability(assetId: string, date: string) {
    return request<AvailabilityResponse>(`/assets/${assetId}/availability?date=${date}`);
  },
  getMonthAvailability: (assetId: string, month: string) =>
    request<MonthAvailabilityResponse>(`/assets/${assetId}/availability/month?month=${month}`),

  createAnonymousBooking: (input: {
    assetId: string;
    contactEmail: string;
    contactName: string;
    endAt: string;
    notes?: string;
    startAt: string;
  }) =>
    request<{ booking: Booking }>("/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createBooking(
    token: string,
    input: {
      assetId: string;
      contactEmail: string;
      contactName: string;
      endAt: string;
      notes?: string;
      startAt: string;
    },
  ) {
    return request<{ booking: Booking; notification: string }>(
      "/bookings",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token,
    );
  },
  listMyBookings(token: string) {
    return request<{ bookings: Booking[] }>("/bookings/mine", {}, token);
  },
  listOwnerBookings(token: string) {
    return request<{ bookings: Booking[] }>("/owner/bookings", {}, token);
  },
  confirmBooking(token: string, bookingId: string) {
    return request<{ booking: Booking }>(
      `/bookings/${bookingId}/confirm`,
      { method: "POST" },
      token,
    );
  },
  rejectBooking(token: string, bookingId: string) {
    return request<{ booking: Booking }>(
      `/bookings/${bookingId}/reject`,
      { method: "POST" },
      token,
    );
  },
  listMyQrCodes(token: string) {
    return request<{ qrCodes: QrCode[] }>("/qr/mine", {}, token);
  },
  resolveQr(token: string) {
    return request<{ qrCode: QrCode }>(`/q/${token}`);
  },
  createQrCode(token: string, assetId: string) {
    return request<{ qrCode: QrCode }>(
      `/assets/${assetId}/qr`,
      { method: "POST" },
      token,
    );
  },
};
