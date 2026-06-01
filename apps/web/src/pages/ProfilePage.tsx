import { useState } from "react";
import { useAppState } from "../state/AppContext";
import { supabase } from "../lib/supabase";
import { normalizeWhatsappNumber } from "../lib/whatsapp";

export function ProfilePage() {
  const { session, setSession, signOut, pushAlert } = useAppState();
  const [whatsapp, setWhatsapp] = useState(session?.user.whatsappNumber ?? "");
  const [saving, setSaving] = useState(false);

  if (!session) return null;

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

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 22, marginBottom: 16 }}>Profile</h1>
      <div className="workspace-asset-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="input-label">Name</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{session.user.name}</div>
          </div>
          <div>
            <div className="input-label">Email</div>
            <div style={{ fontSize: 15 }}>{session.user.email}</div>
          </div>
          <div>
            <div className="input-label">Company</div>
            <div style={{ fontSize: 15 }}>{session.user.company || "—"}</div>
          </div>
          <div>
            <div className="input-label">Role</div>
            <div style={{ fontSize: 15 }}>{session.user.role}</div>
          </div>
          <div>
            <label className="input-label" htmlFor="profile-whatsapp">
              WhatsApp number
            </label>
            <input
              id="profile-whatsapp"
              className="input"
              type="tel"
              inputMode="tel"
              placeholder="082 123 4567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <p className="contact-note" style={{ marginTop: 6 }}>
              Required before you can publish assets. Stored in international format.
            </p>
          </div>
          <button
            className="btn btn-brand"
            style={{ alignSelf: "flex-start" }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save WhatsApp number"}
          </button>
          <button className="btn btn-danger-outline" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
