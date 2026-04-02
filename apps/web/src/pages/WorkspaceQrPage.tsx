import { useAppState } from "../state/AppContext";

export function WorkspaceQrPage() {
  const { assets, session } = useAppState();
  const myAssets = assets.filter((a) => a.ownerId === session?.user.id);

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 22, marginBottom: 16 }}>QR Codes</h1>
      {myAssets.map((asset) => (
        <div key={asset.id} className="workspace-asset-card">
          <div className="workspace-asset-title">{asset.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
            Public route:{" "}
            <code style={{ background: "var(--neutral-bg)", padding: "2px 8px", borderRadius: 4 }}>
              /q/[token]
            </code>
          </div>
        </div>
      ))}
      {myAssets.length === 0 && (
        <div className="empty-state">Create an asset first to generate QR codes.</div>
      )}
    </div>
  );
}
