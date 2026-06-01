import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { api } from "../api";
import { supabase } from "../lib/supabase";
import { mapAsset, mapBooking, mapProfile } from "../lib/dbMappers";
const AppContext = createContext(null);
const tomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
};
const emptyAssetForm = {
    category: "Mobile Fridge",
    description: "",
    location: "Johannesburg",
    minimumNoticeHours: 24,
    minimumRentalHours: 6,
    priceLabel: "From R0 / booking",
    title: "",
};
const initialRegisterForm = {
    company: "",
    email: "",
    name: "",
    password: "password123",
    role: "attendee",
};
const initialBookingForm = {
    contactEmail: "attendee@scanya.app",
    contactName: "Attendee Demo",
    endAt: `${tomorrow()}T16:00:00.000Z`,
    notes: "",
    startAt: `${tomorrow()}T10:00:00.000Z`,
};
function mergeAssets(primary, secondary) {
    return Array.from(new Map([...primary, ...secondary].map((asset) => [asset.id, asset])).values());
}
function buildWindows(date, rules) {
    return rules.map((rule) => ({
        startAt: `${date}T${String(rule.start_hour).padStart(2, "0")}:00:00.000Z`,
        endAt: `${date}T${String(rule.end_hour).padStart(2, "0")}:00:00.000Z`,
    }));
}
function mapAuthUser(user, profile) {
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
        whatsappNumber: metadata.whatsapp_number ?? null,
    };
}
export function AppProvider({ children }) {
    const [session, setSession] = useState(null);
    const [assets, setAssets] = useState([]);
    const [authLoading, setAuthLoading] = useState(true);
    const [availability, setAvailability] = useState(null);
    const [selectedDate, setSelectedDate] = useState(tomorrow());
    const [bookings, setBookings] = useState([]);
    const [ownerBookings, setOwnerBookings] = useState([]);
    const [message, setMessage] = useState("");
    const [alerts, setAlerts] = useState([]);
    const [loginForm, setLoginForm] = useState({
        email: "attendee@scanya.app",
        password: "password123",
    });
    const [registerForm, setRegisterForm] = useState(initialRegisterForm);
    const [assetForm, setAssetForm] = useState(emptyAssetForm);
    const [bookingForm, setBookingForm] = useState(initialBookingForm);
    const [calendarView, setCalendarView] = useState("month");
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [monthAvailability, setMonthAvailability] = useState(null);
    const [selectedSlot, selectSlot] = useState(null);
    const [bookingStep, setBookingStep] = useState("calendar");
    const [lastBookingRef, setLastBookingRef] = useState(null);
    const sessionToken = session?.token ?? "";
    const userId = session?.user.id ?? "";
    const refreshAssets = useCallback(async () => {
        try {
            const { data: publishedRows, error: publishedError } = await supabase
                .from("assets")
                .select("*")
                .eq("status", "published")
                .order("created_at", { ascending: false });
            if (publishedError)
                throw publishedError;
            let nextAssets = (publishedRows ?? []).map(mapAsset);
            if (userId) {
                const { data: ownedRows, error: ownedError } = await supabase
                    .from("assets")
                    .select("*")
                    .eq("owner_id", userId)
                    .order("created_at", { ascending: false });
                if (ownedError)
                    throw ownedError;
                nextAssets = mergeAssets((ownedRows ?? []).map(mapAsset), nextAssets);
            }
            setAssets(nextAssets);
        }
        catch (error) {
            setMessage(error.message);
        }
    }, [userId]);
    useEffect(() => {
        void refreshAssets();
    }, [refreshAssets]);
    useEffect(() => {
        let mounted = true;
        async function applyAuthSession(supaSession) {
            if (!mounted)
                return;
            if (!supaSession) {
                setSession(null);
                setAuthLoading(false);
                return;
            }
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", supaSession.user.id)
                .maybeSingle();
            if (!mounted)
                return;
            setSession({
                token: supaSession.access_token,
                user: mapAuthUser(supaSession.user, profile),
            });
            setAuthLoading(false);
        }
        supabase.auth
            .getSession()
            .then(({ data }) => applyAuthSession(data.session))
            .catch((error) => {
            if (!mounted)
                return;
            setMessage(error.message);
            setAuthLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, supaSession) => {
            if (event === "SIGNED_OUT") {
                setSession(null);
                setBookings([]);
                setOwnerBookings([]);
                setAuthLoading(false);
                return;
            }
            if (!supaSession || (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED"))
                return;
            void applyAuthSession(supaSession).catch((error) => {
                setMessage(error.message);
                setAuthLoading(false);
            });
        });
        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);
    useEffect(() => {
        if (!session) {
            setBookings([]);
            setOwnerBookings([]);
            return;
        }
        void hydrateSession(session);
    }, [sessionToken]);
    async function loadAvailability(assetId, date) {
        try {
            const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
            const { data: rules, error: rulesError } = await supabase
                .from("asset_availability_rules")
                .select("*")
                .eq("asset_id", assetId)
                .eq("day_of_week", dayOfWeek);
            if (rulesError)
                throw rulesError;
            const dayStart = `${date}T00:00:00.000Z`;
            const dayEnd = `${date}T23:59:59.999Z`;
            const { data: dayBookings, error: bookingsError } = await supabase
                .from("bookings")
                .select("*")
                .eq("asset_id", assetId)
                .in("status", ["pending", "confirmed"])
                .gte("start_at", dayStart)
                .lte("start_at", dayEnd);
            if (bookingsError)
                throw bookingsError;
            setAvailability({
                assetId,
                date,
                windows: buildWindows(date, rules ?? []),
                bookings: (dayBookings ?? []).map(mapBooking),
            });
        }
        catch (error) {
            setAvailability(null);
            setMessage(error.message);
        }
    }
    async function hydrateSession(nextSession) {
        try {
            const { data: myBookingRows, error: myBookingsError } = await supabase
                .from("bookings")
                .select("*")
                .eq("requester_id", nextSession.user.id);
            if (myBookingsError)
                throw myBookingsError;
            setBookings((myBookingRows ?? []).map(mapBooking));
            if (nextSession.user.role === "asset_owner") {
                const { data: ownedRows, error: ownedError } = await supabase
                    .from("bookings")
                    .select("*, assets!inner(owner_id)")
                    .eq("assets.owner_id", nextSession.user.id);
                if (ownedError)
                    throw ownedError;
                setOwnerBookings((ownedRows ?? []).map(mapBooking));
            }
            else {
                setOwnerBookings([]);
            }
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function signIn(event) {
        event.preventDefault();
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginForm.email,
                password: loginForm.password,
            });
            if (error)
                throw error;
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", data.user.id)
                .maybeSingle();
            const user = mapAuthUser(data.user, profile);
            setSession({ token: data.session.access_token, user });
            setMessage(`Signed in as ${user.name}.`);
            return true;
        }
        catch (error) {
            setMessage(error.message);
            return false;
        }
    }
    async function signUp(event) {
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
            if (error)
                throw error;
            setMessage("Account created. Sign in with the same credentials.");
            setLoginForm({ email: registerForm.email, password: registerForm.password });
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function createBooking(event, assetId) {
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
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function createAsset(event) {
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
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function updateAssetStatus(assetId, status) {
        if (!session)
            return;
        try {
            await api.updateAssetStatus(session.token, assetId, status);
            await refreshAssets();
            setMessage(`Asset moved to ${status}.`);
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function updateBookingDecision(bookingId, action) {
        if (!session)
            return;
        try {
            if (action === "confirm") {
                await api.confirmBooking(session.token, bookingId);
            }
            else {
                await api.rejectBooking(session.token, bookingId);
            }
            await hydrateSession(session);
            setMessage(`Booking ${action}ed.`);
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    const loadMonthAvailability = useCallback(async (assetId, month) => {
        try {
            const { data: rules, error: rulesError } = await supabase
                .from("asset_availability_rules")
                .select("*")
                .eq("asset_id", assetId);
            if (rulesError)
                throw rulesError;
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
            if (bookingsError)
                throw bookingsError;
            const days = Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const date = `${month}-${String(day).padStart(2, "0")}`;
                const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
                const dayRules = (rules ?? []).filter((rule) => rule.day_of_week === dayOfWeek);
                const dayBookings = (bookingRows ?? []).filter((booking) => booking.start_at.slice(0, 10) === date);
                const slotCount = dayRules.reduce((sum, rule) => sum + Math.max(rule.end_hour - rule.start_hour, 0), 0);
                return {
                    date,
                    hasOpenSlots: slotCount > dayBookings.length,
                    slotCount,
                };
            });
            setMonthAvailability({ assetId, month, days });
        }
        catch (error) {
            setMessage(error.message);
        }
    }, []);
    const createAnonymousBooking = useCallback(async (assetId, input) => {
        if (!selectedSlot)
            return;
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
        }
        catch (error) {
            setMessage(error.message);
        }
    }, [selectedSlot]);
    async function signOut() {
        setAuthLoading(false);
        setSession(null);
        setBookings([]);
        setOwnerBookings([]);
        setMessage("Signed out.");
        await supabase.auth.signOut();
    }
    function clearMessage() {
        setMessage("");
    }
    const dismissAlert = useCallback((id) => {
        setAlerts((current) => current.filter((alert) => alert.id !== id));
    }, []);
    const pushAlert = useCallback((type, message) => {
        const id = typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setAlerts((current) => [
            ...current,
            { id, type, message, createdAt: new Date().toISOString() },
        ]);
        if (type === "success" || type === "info") {
            setTimeout(() => {
                setAlerts((current) => current.filter((alert) => alert.id !== id));
            }, 5000);
        }
    }, []);
    const clearAlerts = useCallback(() => setAlerts([]), []);
    const selectedAsset = useMemo(() => assets.find((asset) => asset.id === availability?.assetId) ?? null, [assets, availability?.assetId]);
    const value = useMemo(() => ({
        assetForm,
        assets,
        authLoading,
        availability,
        bookingForm,
        bookings,
        loginForm,
        message,
        alerts,
        pushAlert,
        dismissAlert,
        clearAlerts,
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
        updateAssetStatus,
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
    }), [
        assetForm,
        assets,
        authLoading,
        availability,
        bookingForm,
        bookings,
        calendarView,
        loginForm,
        alerts,
        pushAlert,
        dismissAlert,
        clearAlerts,
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
        updateAssetStatus,
    ]);
    return _jsx(AppContext.Provider, { value: value, children: children });
}
export function useAppState() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppState must be used within AppProvider");
    }
    return context;
}
