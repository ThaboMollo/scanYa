const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
async function request(path, options = {}, token) {
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
    return payload;
}
export const api = {
    login(email, password) {
        return request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
    },
    register(input) {
        return request("/auth/register", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },
    me(token) {
        return request("/me", {}, token);
    },
    updateMe(token, input) {
        return request("/me", {
            method: "PATCH",
            body: JSON.stringify(input),
        }, token);
    },
    listAssets() {
        return request("/assets");
    },
    listMyAssets(token) {
        return request("/assets/mine", {}, token);
    },
    createAsset(token, input) {
        return request("/assets", {
            method: "POST",
            body: JSON.stringify(input),
        }, token);
    },
    updateAssetStatus(token, assetId, status) {
        const actions = {
            draft: "unpublish",
            published: "publish",
            archived: "archive",
        };
        return request(`/assets/${assetId}/${actions[status]}`, { method: "POST" }, token);
    },
    getAvailability(assetId, date) {
        return request(`/assets/${assetId}/availability?date=${date}`);
    },
    getMonthAvailability: (assetId, month) => request(`/assets/${assetId}/availability/month?month=${month}`),
    getAssetBookingDetails(token, assetId) {
        return request(`/assets/${assetId}/booking-details`, {}, token);
    },
    createAnonymousBooking: (input) => request("/bookings", {
        method: "POST",
        body: JSON.stringify(input),
    }),
    createBooking(token, input) {
        return request("/bookings", {
            method: "POST",
            body: JSON.stringify(input),
        }, token);
    },
    listMyBookings(token) {
        return request("/bookings/mine", {}, token);
    },
    listOwnerBookings(token) {
        return request("/owner/bookings", {}, token);
    },
    confirmBooking(token, bookingId) {
        return request(`/bookings/${bookingId}/confirm`, { method: "POST" }, token);
    },
    rejectBooking(token, bookingId) {
        return request(`/bookings/${bookingId}/reject`, { method: "POST" }, token);
    },
    listMyQrCodes(token) {
        return request("/qr/mine", {}, token);
    },
    resolveQr(token) {
        return request(`/q/${token}`);
    },
    createQrCode(token, assetId) {
        return request(`/assets/${assetId}/qr`, { method: "POST" }, token);
    },
};
