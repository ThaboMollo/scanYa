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
export function AppProvider({ children }) {
    const [session, setSession] = useState(null);
    const [assets, setAssets] = useState([]);
    const [availability, setAvailability] = useState(null);
    const [selectedDate, setSelectedDate] = useState(tomorrow());
    const [bookings, setBookings] = useState([]);
    const [ownerBookings, setOwnerBookings] = useState([]);
    const [message, setMessage] = useState("");
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
                if (event === "SIGNED_OUT" || !supaSession) {
                    setSession(null);
                    return;
                }
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
            },
        );

        return () => subscription.unsubscribe();
    }, []);
    async function refreshAssets() {
        try {
            const response = await api.listAssets();
            setAssets(response.assets);
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function loadAvailability(assetId, date) {
        try {
            const response = await api.getAvailability(assetId, date);
            setAvailability(response);
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
            const myBookings = await api.listMyBookings(session.token);
            setBookings(myBookings.bookings);
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
            const owner = await api.listOwnerBookings(session.token);
            setOwnerBookings(owner.bookings);
            setMessage(`Booking ${action}ed.`);
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    const loadMonthAvailability = useCallback(async (assetId, month) => {
        try {
            const data = await api.getMonthAvailability(assetId, month);
            setMonthAvailability(data);
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
        await supabase.auth.signOut();
        setSession(null);
        setMessage("Signed out.");
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
