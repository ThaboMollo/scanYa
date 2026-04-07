import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";
export function LoginPage() {
    const { signIn, setLoginForm, loginForm, message } = useAppState();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const success = await signIn(e);
        setSubmitting(false);
        if (success) {
            navigate("/app");
        }
    };
    return (_jsx("div", { className: "login-page", children: _jsxs("div", { className: "login-card", children: [
        _jsx("h2", { className: "login-title", children: "Owner Login" }),
        _jsx("p", { className: "login-subtitle", children: "Sign in to manage your assets and bookings" }),
        message && (_jsx("p", { style: { color: "var(--danger)", fontSize: 13, marginBottom: 16 }, children: message })),
        _jsxs("form", { onSubmit: handleSubmit, children: [
            _jsxs("div", { className: "contact-field", children: [
                _jsx("label", { className: "input-label", htmlFor: "login-email", children: "Email" }),
                _jsx("input", { id: "login-email", className: "input", type: "email", required: true, value: loginForm.email, onChange: (e) => setLoginForm({ ...loginForm, email: e.target.value }) })
            ] }),
            _jsxs("div", { className: "contact-field", children: [
                _jsx("label", { className: "input-label", htmlFor: "login-password", children: "Password" }),
                _jsx("input", { id: "login-password", className: "input", type: "password", required: true, value: loginForm.password, onChange: (e) => setLoginForm({ ...loginForm, password: e.target.value }) })
            ] }),
            _jsx("button", { className: "btn-brand-lg", type: "submit", disabled: submitting, children: submitting ? "Signing in..." : "Sign In" })
        ] }),
        _jsx("p", { style: { textAlign: "center", marginTop: 16, fontSize: 13 }, children: _jsxs("span", { children: [
            "Don't have an account? ",
            _jsx(Link, { to: "/app/register", style: { color: "var(--brand, #6366f1)" }, children: "Create one" })
        ] }) })
    ] }) }));
}
