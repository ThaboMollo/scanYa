import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAppState } from "../state/AppContext";
import { supabase } from "../lib/supabase";
import { normalizeWhatsappNumber } from "../lib/whatsapp";
export function ProfilePage() {
    const { session, setSession, signOut, pushAlert } = useAppState();
    const [whatsapp, setWhatsapp] = useState(session?.user.whatsappNumber ?? "");
    const [saving, setSaving] = useState(false);
    if (!session)
        return null;
    const handleSave = async () => {
        const normalized = normalizeWhatsappNumber(whatsapp);
        if (!normalized) {
            pushAlert("warning", "Enter a valid WhatsApp number.");
            return;
        }
        setSaving(true);
        const { error } = await supabase
            .from("profiles")
            .update({ whatsapp_number: normalized })
            .eq("id", session.user.id);
        setSaving(false);
        if (error) {
            pushAlert("error", error.message);
            return;
        }
        setWhatsapp(normalized);
        setSession({
            ...session,
            user: { ...session.user, whatsappNumber: normalized },
        });
        pushAlert("success", "WhatsApp number saved.");
    };
    return (_jsxs("div", { children: [_jsx("h1", { className: "section-title", style: { fontSize: 22, marginBottom: 16 }, children: "Profile" }), _jsx("div", { className: "workspace-asset-card", children: _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { children: [_jsx("div", { className: "input-label", children: "Name" }), _jsx("div", { style: { fontSize: 15, fontWeight: 600 }, children: session.user.name })] }), _jsxs("div", { children: [_jsx("div", { className: "input-label", children: "Email" }), _jsx("div", { style: { fontSize: 15 }, children: session.user.email })] }), _jsxs("div", { children: [_jsx("div", { className: "input-label", children: "Company" }), _jsx("div", { style: { fontSize: 15 }, children: session.user.company || "—" })] }), _jsxs("div", { children: [_jsx("div", { className: "input-label", children: "Role" }), _jsx("div", { style: { fontSize: 15 }, children: session.user.role })] }), _jsxs("div", { children: [_jsx("label", { className: "input-label", htmlFor: "profile-whatsapp", children: "WhatsApp number" }), _jsx("input", { id: "profile-whatsapp", className: "input", type: "tel", inputMode: "tel", placeholder: "082 123 4567", value: whatsapp, onChange: (e) => setWhatsapp(e.target.value) }), _jsx("p", { className: "contact-note", style: { marginTop: 6 }, children: "Required before you can publish assets. Stored in international format." })] }), _jsx("button", { className: "btn btn-brand", style: { alignSelf: "flex-start" }, onClick: handleSave, disabled: saving, children: saving ? "Saving..." : "Save WhatsApp number" }), _jsx("button", { className: "btn btn-danger-outline", style: { alignSelf: "flex-start", marginTop: 8 }, onClick: signOut, children: "Sign Out" })] }) })] }));
}
