import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type PropsWithChildren,
} from "react";
import type { Asset, AvailabilityResponse, Booking, MonthAvailabilityResponse, PublicUser, User } from "@scanya/shared";
import { api } from "../api";
import { supabase } from "../lib/supabase";
import { mapAsset, mapBooking, mapProfile } from "../lib/dbMappers";

type DbRow = Record<string, any>;

type SessionState = {
  token: string;
  user: PublicUser;
};

type BookingFormState = {
  contactEmail: string;
  contactName: string;
  endAt: string;
  notes: string;
  startAt: string;
};

type RegisterFormState = {
  company: string;
  email: string;
  name: string;
  password: string;
  role: User["role"];
};

type AssetFormState = {
  category: string;
  description: string;
  location: string;
  minimumNoticeHours: number;
  minimumRentalHours: number;
  priceLabel: string;
  title: string;
};

type AppContextValue = {
  assetForm: AssetFormState;
  assets: Asset[];
  availability: AvailabilityResponse | null;
  bookingForm: BookingFormState;
  bookings: Booking[];
  loginForm: { email: string; password: string };
  message: string;
  ownerBookings: Booking[];
  registerForm: RegisterFormState;
  selectedAsset: Asset | null;
  selectedDate: string;
  session: SessionState | null;
  calendarView: "month" | "day";
  selectedMonth: string;
  monthAvailability: MonthAvailabilityResponse | null;
  selectedSlot: { startAt: string; endAt: string } | null;
  bookingStep: "calendar" | "contact" | "success";
  lastBookingRef: string | null;
  setCalendarView: (view: "month" | "day") => void;
  setSelectedMonth: (month: string) => void;
  loadMonthAvailability: (assetId: string, month: string) => Promise<void>;
  selectSlot: (slot: { startAt: string; endAt: string } | null) => void;
  setBookingStep: (step: "calendar" | "contact" | "success") => void;
  createAnonymousBooking: (assetId: string, input: { contactName: string; contactEmail: string; notes: string }) => Promise<void>;
  clearMessage: () => void;
  createAsset: (event: FormEvent) => Promise<void>;
  createBooking: (event: FormEvent, assetId: string) => Promise<void>;
  loadAvailability: (assetId: string, date: string) => Promise<void>;
  refreshAssets: () => Promise<void>;
  selectDate: (date: string) => void;
  setAssetForm: (next: AssetFormState) => void;
  setBookingForm: (next: BookingFormState) => void;
  setLoginForm: (next: { email: string; password: string }) => void;
  setMessage: (value: string) => void;
  setRegisterForm: (next: RegisterFormState) => void;
  setSession: (next: SessionState | null) => void;
  signIn: (event: FormEvent) => Promise<boolean>;
  signOut: () => void;
  signUp: (event: FormEvent) => Promise<void>;
  updateBookingDecision: (bookingId: string, action: "confirm" | "reject") => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const emptyAssetForm: AssetFormState = {
  category: "Mobile Fridge",
  description: "",
  location: "Johannesburg",
  minimumNoticeHours: 24,
  minimumRentalHours: 6,
  priceLabel: "From R0 / booking",
  title: "",
};

const initialRegisterForm: RegisterFormState = {
  company: "",
  email: "",
  name: "",
  password: "password123",
  role: "attendee",
};

const initialBookingForm: BookingFormState = {
  contactEmail: "attendee@scanya.app",
  contactName: "Attendee Demo",
  endAt: `${tomorrow()}T16:00:00.000Z`,
  notes: "",
  startAt: `${tomorrow()}T10:00:00.000Z`,
};

function mergeAssets(primary: Asset[], secondary: Asset[]) {
  return Array.from(new Map([...primary, ...secondary].map((asset) => [asset.id, asset])).values());
}

function buildWindows(date: string, rules: any[]) {
  return rules.map((rule) => ({
    startAt: `${date}T${String(rule.start_hour).padStart(2, "0")}:00:00.000Z`,
    endAt: `${date}T${String(rule.end_hour).padStart(2, "0")}:00:00.000Z`,
  }));
}

function mapAuthUser(user: any, profile?: DbRow | null): PublicUser {
  if (profile) {
    return mapProfile(profile, user.email ?? "");
  }

  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    company: metadata.company ?? "",
    createdAt: user.created_at ?? "",
    email: user.email ?? "",
    lastLoginAt: null,
    name: metadata.name ?? user.email ?? "User",
    role: metadata.role ?? "attendee",
  };
}

export function AppProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(tomorrow());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ownerBookings, setOwnerBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState<string>("");
  const [loginForm, setLoginForm] = useState({
    email: "attendee@scanya.app",
    password: "password123",
  });
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [assetForm, setAssetForm] = useState(emptyAssetForm);
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const [calendarView, setCalendarView] = useState<"month" | "day">("month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [monthAvailability, setMonthAvailability] = useState<MonthAvailabilityResponse | null>(null);
  const [selectedSlot, selectSlot] = useState<{ startAt: string; endAt: string } | null>(null);
  const [bookingStep, setBookingStep] = useState<"calendar" | "contact" | "success">("calendar");
  const [lastBookingRef, setLastBookingRef] = useState<string | null>(null);
  const sessionToken = session?.token ?? "";
  const userId = session?.user.id ?? "";

  const refreshAssets = useCallback(async () => {
    try {
      const { data: publishedRows, error: publishedError } = await supabase
        .from("assets")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (publishedError) throw publishedError;

      let nextAssets = (publishedRows ?? []).map(mapAsset);

      if (userId) {
        const { data: ownedRows, error: ownedError } = await supabase
          .from("assets")
          .select("*")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false });

        if (ownedError) throw ownedError;
        nextAssets = mergeAssets((ownedRows ?? []).map(mapAsset), nextAssets);
      }

      setAssets(nextAssets);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, [userId]);

  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: any) => {
      const supaSession = data.session;
      if (!supaSession) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supaSession.user.id)
        .maybeSingle();

      setSession({
        token: supaSession.access_token,
        user: mapAuthUser(supaSession.user, profile),
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, supaSession: any) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setBookings([]);
        setOwnerBookings([]);
        return;
      }

      if (!supaSession || (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED")) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supaSession.user.id)
        .maybeSingle();

      setSession({
        token: supaSession.access_token,
        user: mapAuthUser(supaSession.user, profile),
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setBookings([]);
      setOwnerBookings([]);
      return;
    }

    void hydrateSession(session);
  }, [sessionToken]);

  async function loadAvailability(assetId: string, date: string) {
    try {
      const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
      const { data: rules, error: rulesError } = await supabase
        .from("asset_availability_rules")
        .select("*")
        .eq("asset_id", assetId)
        .eq("day_of_week", dayOfWeek);

      if (rulesError) throw rulesError;

      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;
      const { data: dayBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("asset_id", assetId)
        .in("status", ["pending", "confirmed"])
        .gte("start_at", dayStart)
        .lte("start_at", dayEnd);

      if (bookingsError) throw bookingsError;

      setAvailability({
        assetId,
        date,
        windows: buildWindows(date, rules ?? []),
        bookings: (dayBookings ?? []).map(mapBooking),
      });
    } catch (error) {
      setAvailability(null);
      setMessage((error as Error).message);
    }
  }

  async function hydrateSession(nextSession: SessionState) {
    try {
      const { data: myBookingRows, error: myBookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("requester_id", nextSession.user.id);

      if (myBookingsError) throw myBookingsError;
      setBookings((myBookingRows ?? []).map(mapBooking));

      if (nextSession.user.role === "asset_owner") {
        const { data: ownedRows, error: ownedError } = await supabase
          .from("bookings")
          .select("*, assets!inner(owner_id)")
          .eq("assets.owner_id", nextSession.user.id);

        if (ownedError) throw ownedError;
        setOwnerBookings((ownedRows ?? []).map(mapBooking));
      } else {
        setOwnerBookings([]);
      }
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function signIn(event: FormEvent): Promise<boolean> {
    event.preventDefault();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      const user = mapAuthUser(data.user, profile);
      setSession({ token: data.session.access_token, user });
      setMessage(`Signed in as ${user.name}.`);
      return true;
    } catch (error) {
      setMessage((error as Error).message);
      return false;
    }
  }

  async function signUp(event: FormEvent) {
    event.preventDefault();

    try {
      const { error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            role: registerForm.role,
            name: registerForm.name,
            company: registerForm.company,
          },
        },
      });

      if (error) throw error;

      setMessage("Account created. Sign in with the same credentials.");
      setLoginForm({ email: registerForm.email, password: registerForm.password });
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function createBooking(event: FormEvent, assetId: string) {
    event.preventDefault();

    if (!session) {
      setMessage("Sign in before creating a booking.");
      return;
    }

    try {
      const response = await api.createBooking(session.token, { assetId, ...bookingForm });
      setMessage(response.notification);
      await hydrateSession(session);
      await loadAvailability(assetId, selectedDate);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function createAsset(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      setMessage("Sign in as an asset owner first.");
      return;
    }

    try {
      await api.createAsset(session.token, assetForm);
      setAssetForm(emptyAssetForm);
      await refreshAssets();
      setMessage("Asset created. QR link generated.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function updateBookingDecision(bookingId: string, action: "confirm" | "reject") {
    if (!session) return;

    try {
      if (action === "confirm") {
        await api.confirmBooking(session.token, bookingId);
      } else {
        await api.rejectBooking(session.token, bookingId);
      }

      await hydrateSession(session);
      setMessage(`Booking ${action}ed.`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  const loadMonthAvailability = useCallback(async (assetId: string, month: string) => {
    try {
      const { data: rules, error: rulesError } = await supabase
        .from("asset_availability_rules")
        .select("*")
        .eq("asset_id", assetId);

      if (rulesError) throw rulesError;

      const [year, monthNumber] = month.split("-").map(Number);
      const daysInMonth = new Date(year, monthNumber, 0).getDate();
      const monthStart = `${month}-01T00:00:00.000Z`;
      const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}T23:59:59.999Z`;

      const { data: bookingRows, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("asset_id", assetId)
        .in("status", ["pending", "confirmed"])
        .gte("start_at", monthStart)
        .lte("start_at", monthEnd);

      if (bookingsError) throw bookingsError;

      const days = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = `${month}-${String(day).padStart(2, "0")}`;
        const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        const dayRules = ((rules ?? []) as DbRow[]).filter((rule) => rule.day_of_week === dayOfWeek);
        const dayBookings = ((bookingRows ?? []) as DbRow[]).filter((booking) => booking.start_at.slice(0, 10) === date);
        const slotCount = dayRules.reduce((sum: number, rule: DbRow) => sum + Math.max(rule.end_hour - rule.start_hour, 0), 0);

        return {
          date,
          hasOpenSlots: slotCount > dayBookings.length,
          slotCount,
        };
      });

      setMonthAvailability({ assetId, month, days });
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, []);

  const createAnonymousBooking = useCallback(async (
    assetId: string,
    input: { contactName: string; contactEmail: string; notes: string },
  ) => {
    if (!selectedSlot) return;
    try {
      const { booking } = await api.createAnonymousBooking({
        assetId,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        notes: input.notes || undefined,
      });
      setLastBookingRef(booking.id);
      setBookingStep("success");
      setMessage("Booking request sent!");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, [selectedSlot]);

  async function signOut() {
    setSession(null);
    setBookings([]);
    setOwnerBookings([]);
    setMessage("Signed out.");
    await supabase.auth.signOut();
  }

  function clearMessage() {
    setMessage("");
  }

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === availability?.assetId) ?? null,
    [assets, availability?.assetId],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      assetForm,
      assets,
      availability,
      bookingForm,
      bookings,
      loginForm,
      message,
      ownerBookings,
      registerForm,
      selectedAsset,
      selectedDate,
      session,
      calendarView,
      selectedMonth,
      monthAvailability,
      selectedSlot,
      bookingStep,
      lastBookingRef,
      clearMessage,
      createAsset,
      createBooking,
      loadAvailability,
      loadMonthAvailability,
      refreshAssets,
      selectDate: setSelectedDate,
      selectSlot,
      setAssetForm,
      setBookingForm,
      setBookingStep,
      setCalendarView,
      setLoginForm,
      setMessage,
      setRegisterForm,
      setSelectedMonth,
      setSession,
      signIn,
      signOut,
      signUp,
      updateBookingDecision,
      createAnonymousBooking,
    }),
    [
      assetForm,
      assets,
      availability,
      bookingForm,
      bookings,
      calendarView,
      loginForm,
      message,
      monthAvailability,
      ownerBookings,
      registerForm,
      selectedAsset,
      selectedDate,
      selectedMonth,
      selectedSlot,
      bookingStep,
      lastBookingRef,
      session,
      loadMonthAvailability,
      refreshAssets,
      createAnonymousBooking,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }

  return context;
}
