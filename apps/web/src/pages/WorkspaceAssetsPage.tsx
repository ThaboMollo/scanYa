import { useAppState } from "../state/AppContext";
import { StatusPill } from "../components/StatusPill";

export function WorkspaceAssetsPage() {
  const { assets, session, assetForm, setAssetForm, createAsset } = useAppState();
  const myAssets = assets.filter((a) => a.ownerId === session?.user.id);

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="section-title" style={{ fontSize: 22 }}>My Assets</h1>
      </div>

      <div className="workspace-asset-card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Create New Asset</h3>
        <form onSubmit={createAsset} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="input-label">Title</label>
              <input className="input" value={assetForm.title} onChange={(e) => setAssetForm({ ...assetForm, title: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Category</label>
              <input className="input" value={assetForm.category} onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })} required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="input-label">Location</label>
              <input className="input" value={assetForm.location} onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Price label</label>
              <input className="input" value={assetForm.priceLabel} onChange={(e) => setAssetForm({ ...assetForm, priceLabel: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea className="input" rows={3} value={assetForm.description} onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="input-label">Min. notice (hours)</label>
              <input className="input" type="number" value={assetForm.minimumNoticeHours} onChange={(e) => setAssetForm({ ...assetForm, minimumNoticeHours: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="input-label">Min. rental (hours)</label>
              <input className="input" type="number" value={assetForm.minimumRentalHours} onChange={(e) => setAssetForm({ ...assetForm, minimumRentalHours: Number(e.target.value) })} required />
            </div>
          </div>
          <button className="btn btn-brand" type="submit">Create Asset</button>
        </form>
      </div>

      {myAssets.map((asset) => (
        <div key={asset.id} className="workspace-asset-card">
          <div className="workspace-asset-header">
            <div>
              <span className="category-pill" style={{ marginRight: 8 }}>{asset.category}</span>
              <span className="workspace-asset-title">{asset.title}</span>
            </div>
            <StatusPill status={asset.status === "published" ? "confirmed" : "pending"} />
          </div>
          <div className="workspace-asset-meta">
            <span>{asset.location}</span>
            <span>{asset.priceLabel}</span>
          </div>
        </div>
      ))}

      {myAssets.length === 0 && (
        <div className="empty-state">No assets yet. Create your first one above.</div>
      )}
    </div>
  );
}
