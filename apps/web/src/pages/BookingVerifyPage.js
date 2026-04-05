import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export function BookingVerifyPage() {
    const { token } = useParams();
    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("Verifying your booking...");

    useEffect(() => {
        fetch(`${apiBaseUrl}/bookings/verify/${token}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setStatus("error");
                    setMessage(data.error);
                } else {
                    setStatus("success");
                    setMessage(data.message);
                }
            })
            .catch(() => {
                setStatus("error");
                setMessage("Something went wrong. Please try again.");
            });
    }, [token]);

    return _jsx("div", {
        className: "login-page",
        children: _jsxs("div", {
            className: "login-card",
            style: { textAlign: "center" },
            children: [
                _jsx("h2", { className: "login-title", children: status === "verifying" ? "Verifying..." : status === "success" ? "Booking Confirmed" : "Verification Failed" }),
                _jsx("p", { style: { marginTop: 16 }, children: message }),
            ],
        }),
    });
}
