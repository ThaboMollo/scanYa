import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { api } from "../api";
import { supabase } from "../lib/supabase";
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
    password: "",
    role: "attendee",
};
const initialBookingForm = {
    contactEmail: "",
    contactName: "",
    endAt: `${tomorrow()}T16:00:00.000Z`,
    notes: "",
    startAt: `${tomorrow()}T10:00:00.000Z`,
};
export function AppProvider({ children }) {
    const [session, setSession] = useState(null);
    const [assets, setAssets] = useState([]);
    const [availability, setAvailability] = useState(null);
    const [selectedDate, setSelectedDate] = useState(tomorrow());
    const [bookings, setBookings] = useState([]);
    const [ownerBookings, setOwnerBookings] = useState([]);
    const [message, setMessage] = useState("");
    const [loginForm, setLoginForm] = useState({
        email: "",
        password: "",
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
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
            if (supaSession) {
                supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", supaSession.user.id)
                    .single()
                    .then(({ data: profile }) => {
                        if (profile) {
                            setSession({
                                token: supaSession.access_token,
                                user: { ...profile, email: supaSession.user.email },
                            });
                        }
                    });
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, supaSession) => {
                if (event === "SIGNED_OUT") {
                    setSession(null);
                    setBookings([]);
                    setOwnerBookings([]);
                    return;
                }
                if (!supaSession) return;
                if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", supaSession.user.id)
                        .single();
                    if (profile) {
                        setSession({
                            token: supaSession.access_token,
                            user: { ...profile, email: supaSession.user.email },
                        });
                    }
                }
            },
        );

        return () => subscription.unsubscribe();
    }, []);
    async function refreshAssets() {
        try {
            const { data, error } = await supabase
                .from("assets")
                .select("*")
                .eq("status", "published");
            if (error) throw error;
            setAssets(data);
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function loadAvailability(assetId, date) {
        try {
            const dayOfWeek = new Date(date).getDay();
            const { data: rules } = await supabase
                .from("asset_availability_rules")
                .select("*")
                .eq("asset_id", assetId)
                .eq("day_of_week", dayOfWeek);

            const dayStart = `${date}T00:00:00.000Z`;
            const dayEnd = `${date}T23:59:59.999Z`;
            const { data: dayBookings } = await supabase
                .from("bookings")
                .select("*")
                .eq("asset_id", assetId)
                .in("status", ["pending", "confirmed"])
                .gte("start_at", dayStart)
                .lte("start_at", dayEnd);

            setAvailability({
                assetId,
                date,
                windows: (rules ?? []).map((r) => ({
                    startHour: r.start_hour,
                    endHour: r.end_hour,
                })),
                bookings: dayBookings ?? [],
            });
        }
        catch (error) {
            setAvailability(null);
            setMessage(error.message);
        }
    }
    async function hydrateSession(nextSession) {
        try {
            const { data: myBookings } = await supabase
                .from("bookings")
                .select("*, assets(title)")
                .eq("requester_id", nextSession.user.id);
            setBookings(myBookings ?? []);

            if (nextSession.user.role === "asset_owner") {
                const { data: owned } = await supabase
                    .from("bookings")
                    .select("*, assets!inner(title, owner_id)")
                    .eq("assets.owner_id", nextSession.user.id);
                setOwnerBookings(owned ?? []);
            } else {
                setOwnerBookings([]);
            }
        } catch (error) {
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
            if (error) throw error;
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", data.user.id)
                .single();
            setSession({
                token: data.session.access_token,
                user: { ...profile, email: data.user.email },
            });
            setMessage(`Signed in as ${profile.name}.`);
            return true;
        } catch (error) {
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
            if (error) throw error;
            setMessage("Account created. Sign in with the same credentials.");
            setLoginForm({ email: registerForm.email, password: registerForm.password });
        } catch (error) {
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
            const { data: myBookings } = await supabase
                .from("bookings")
                .select("*, assets(title)")
                .eq("requester_id", session.user.id);
            setBookings(myBookings ?? []);
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
            setMessage("Asset created.");
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function updateBookingDecision(bookingId, action) {
        if (!session) {
            return;
        }
        try {
            if (action === "confirm") {
                await api.confirmBooking(session.token, bookingId);
            }
            else {
                await api.rejectBooking(session.token, bookingId);
            }
            const { data: owned } = await supabase
                .from("bookings")
                .select("*, assets!inner(title, owner_id)")
                .eq("assets.owner_id", session.user.id);
            setOwnerBookings(owned ?? []);
            setMessage(`Booking ${action}ed.`);
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    const loadMonthAvailability = useCallback(async (assetId, month) => {
        try {
            const { data: rules } = await supabase
                .from("asset_availability_rules")
                .select("*")
                .eq("asset_id", assetId);

            const [year, mo] = month.split("-").map(Number);
            const daysInMonth = new Date(year, mo, 0).getDate();
            const monthStart = `${month}-01T00:00:00.000Z`;
            const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}T23:59:59.999Z`;

            const { data: monthBookings } = await supabase
                .from("bookings")
                .select("*")
                .eq("asset_id", assetId)
                .in("status", ["pending", "confirmed"])
                .gte("start_at", monthStart)
                .lte("start_at", monthEnd);

            const days = {};
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${month}-${String(d).padStart(2, "0")}`;
                const dayOfWeek = new Date(dateStr).getDay();
                const dayRules = (rules ?? []).filter((r) => r.day_of_week === dayOfWeek);
                const dayBk = (monthBookings ?? []).filter(
                    (b) => b.start_at.slice(0, 10) === dateStr
                );
                days[dateStr] = {
                    totalWindowHours: dayRules.reduce((sum, r) => sum + (r.end_hour - r.start_hour), 0),
                    bookedHours: dayBk.reduce((sum, b) => {
                        const s = new Date(b.start_at);
                        const e = new Date(b.end_at);
                        return sum + (e - s) / (1000 * 60 * 60);
                    }, 0),
                    hasAvailability: dayRules.length > 0,
                };
            }
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
        setSession(null);
        setBookings([]);
        setOwnerBookings([]);
        setMessage("Signed out.");
        await supabase.auth.signOut();
    }
    function clearMessage() {
        setMessage("");
    }
    const selectedAsset = useMemo(() => assets.find((asset) => asset.id === availability?.assetId) ?? null, [assets, availability?.assetId]);
    const value = useMemo(() => ({
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
    }), [
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
