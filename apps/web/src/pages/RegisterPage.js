import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";
export function RegisterPage() {
    const { signUp, setRegisterForm, registerForm, message } = useAppState();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await signUp(e);
        setSubmitting(false);
    };
    return (_jsx("div", { className: "login-page", children: _jsxs("div", { className: "login-card", children: [
        _jsx("h2", { className: "login-title", children: "Create Account" }),
        _jsx("p", { className: "login-subtitle", children: "Sign up to manage assets or track your bookings" }),
        message && (_jsx("p", { style: { color: message.includes("created") ? "var(--success, green)" : "var(--danger)", fontSize: 13, marginBottom: 16 }, children: message })),
        _jsxs("form", { onSubmit: handleSubmit, children: [
            _jsxs("div", { className: "contact-field", children: [
                _jsx("label", { className: "input-label", htmlFor: "reg-name", children: "Full Name" }),
                _jsx("input", { id: "reg-name", className: "input", type: "text", required: true, minLength: 2, value: registerForm.name, onChange: (e) => setRegisterForm({ ...registerForm, name: e.target.value }) })
            ] }),
            _jsxs("div", { className: "contact-field", children: [
                _jsx("label", { className: "input-label", htmlFor: "reg-email", children: "Email" }),
                _jsx("input", { id: "reg-email", className: "input", type: "email", required: true, value: registerForm.email, onChange: (e) => setRegisterForm({ ...registerForm, email: e.target.value }) })
            ] }),
            _jsxs("div", { className: "contact-field", children: [
                _jsx("label", { className: "input-label", htmlFor: "reg-password", children: "Password" }),
                _jsx("input", { id: "reg-password", className: "input", type: "password", required: true, minLength: 8, value: registerForm.password, onChange: (e) => setRegisterForm({ ...registerForm, password: e.target.value }) })
            ] }),
            _jsxs("div", { className: "contact-field", children: [
                _jsx("label", { className: "input-label", htmlFor: "reg-role", children: "I am a..." }),
                _jsxs("select", { id: "reg-role", className: "input", value: registerForm.role, onChange: (e) => setRegisterForm({ ...registerForm, role: e.target.value }), children: [
                    _jsx("option", { value: "attendee", children: "Attendee / Booker" }),
                    _jsx("option", { value: "asset_owner", children: "Asset Owner" }),
                    _jsx("option", { value: "event_organizer", children: "Event Organizer" }),
                ] })
            ] }),
            registerForm.role === "asset_owner" && _jsxs("div", { className: "contact-field", children: [
                _jsx("label", { className: "input-label", htmlFor: "reg-company", children: "Company (optional)" }),
                _jsx("input", { id: "reg-company", className: "input", type: "text", value: registerForm.company, onChange: (e) => setRegisterForm({ ...registerForm, company: e.target.value }) })
            ] }),
            _jsx("button", { className: "btn-brand-lg", type: "submit", disabled: submitting, children: submitting ? "Creating account..." : "Create Account" }),
        ] }),
        _jsx("p", { style: { textAlign: "center", marginTop: 16, fontSize: 13 }, children: _jsxs("span", { children: [
            "Already have an account? ",
            _jsx(Link, { to: "/app/login", style: { color: "var(--brand, #6366f1)" }, children: "Sign in" })
        ] }) })
    ] }) }));
}
