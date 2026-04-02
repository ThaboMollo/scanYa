import { useAppState } from "../state/AppContext";

export function ProfilePage() {
  const { session, signOut } = useAppState();
  if (!session) return null;

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
          <button className="btn btn-danger-outline" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
