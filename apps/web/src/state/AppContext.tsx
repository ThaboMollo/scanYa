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

  // Calendar state
  calendarView: "month" | "day";
  selectedMonth: string; // "YYYY-MM"
  monthAvailability: MonthAvailabilityResponse | null;
  selectedSlot: { startAt: string; endAt: string } | null;
  bookingStep: "calendar" | "contact" | "success";
  lastBookingRef: string | null;

  // Calendar actions
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

  useEffect(() => {
    void refreshAssets();
  }, []);

  useEffect(() => {
    if (!session) {
      setBookings([]);
      setOwnerBookings([]);
      return;
    }

    void hydrateSession(session);
  }, [sessionToken]);

  async function refreshAssets() {
    try {
      const response = await api.listAssets();
      setAssets(response.assets);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function loadAvailability(assetId: string, date: string) {
    try {
      const response = await api.getAvailability(assetId, date);
      setAvailability(response);
    } catch (error) {
      setAvailability(null);
      setMessage((error as Error).message);
    }
  }

  async function hydrateSession(nextSession: SessionState) {
    try {
      const me = await api.me(nextSession.token);
      setSession({ token: nextSession.token, user: me.user });
      const myBookings = await api.listMyBookings(nextSession.token);
      setBookings(myBookings.bookings);

      if (me.user.role === "asset_owner") {
        const owner = await api.listOwnerBookings(nextSession.token);
        setOwnerBookings(owner.bookings);
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
      const response = await api.login(loginForm.email, loginForm.password);
      setSession({ token: response.session.token, user: response.user });
      setMessage(`Signed in as ${response.user.name}.`);
      return true;
    } catch (error) {
      setMessage((error as Error).message);
      return false;
    }
  }

  async function signUp(event: FormEvent) {
    event.preventDefault();

    try {
      await api.register(registerForm);
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
      const myBookings = await api.listMyBookings(session.token);
      setBookings(myBookings.bookings);
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
      setMessage("Asset created.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function updateBookingDecision(bookingId: string, action: "confirm" | "reject") {
    if (!session) {
      return;
    }

    try {
      if (action === "confirm") {
        await api.confirmBooking(session.token, bookingId);
      } else {
        await api.rejectBooking(session.token, bookingId);
      }

      const owner = await api.listOwnerBookings(session.token);
      setOwnerBookings(owner.bookings);
      setMessage(`Booking ${action}ed.`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  const loadMonthAvailability = useCallback(async (assetId: string, month: string) => {
    try {
      const data = await api.getMonthAvailability(assetId, month);
      setMonthAvailability(data);
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

  function signOut() {
    setSession(null);
    setMessage("Signed out.");
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
