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
    // Assets (writes only — reads go through Supabase client)
    createAsset(token, input) {
        return request("/assets", {
            method: "POST",
            body: JSON.stringify(input),
        }, token);
    },
    updateAsset(token, assetId, input) {
        return request(`/assets/${assetId}`, {
            method: "PATCH",
            body: JSON.stringify(input),
        }, token);
    },
    publishAsset(token, assetId) {
        return request(`/assets/${assetId}/publish`, { method: "POST" }, token);
    },
    unpublishAsset(token, assetId) {
        return request(`/assets/${assetId}/unpublish`, { method: "POST" }, token);
    },

    // Bookings (writes only)
    createBooking(token, input) {
        return request("/bookings", {
            method: "POST",
            body: JSON.stringify(input),
        }, token);
    },
    createAnonymousBooking(input) {
        return request("/bookings", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },
    confirmBooking(token, bookingId) {
        return request(`/bookings/${bookingId}/confirm`, { method: "POST" }, token);
    },
    rejectBooking(token, bookingId) {
        return request(`/bookings/${bookingId}/reject`, { method: "POST" }, token);
    },

    // QR (writes only)
    createQrCode(token, assetId) {
        return request(`/assets/${assetId}/qr`, { method: "POST" }, token);
    },
};
