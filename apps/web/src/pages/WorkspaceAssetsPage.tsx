import type { Asset, AssetStatus } from "@scanya/shared";
import { useAppState } from "../state/AppContext";

const STATUS_STYLES: Record<AssetStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: "var(--brand-light)", color: "var(--brand)", label: "Draft" },
  published: { bg: "var(--success-light)", color: "var(--success)", label: "Published" },
  archived: { bg: "var(--neutral-bg)", color: "var(--text-muted)", label: "Archived" },
};

function AssetStatusPill({ status }: { status: AssetStatus }) {
  const style = STATUS_STYLES[status];

  return (
    <span className="status-pill" style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
}

function getStatusActions(status: AssetStatus): { label: string; status: AssetStatus; className: string }[] {
  if (status === "draft") {
    return [
      { label: "Publish", status: "published", className: "btn btn-brand" },
      { label: "Archive", status: "archived", className: "btn btn-danger-outline" },
    ];
  }

  if (status === "published") {
    return [
      { label: "Move to draft", status: "draft", className: "btn btn-ghost" },
      { label: "Archive", status: "archived", className: "btn btn-danger-outline" },
    ];
  }

  return [
    { label: "Restore draft", status: "draft", className: "btn btn-ghost" },
    { label: "Publish", status: "published", className: "btn btn-brand" },
  ];
}

function getVisibleAssets(assets: Asset[], sessionUserId?: string, role?: string) {
  if (role === "super_admin") {
    return assets;
  }

  return assets.filter((asset) => asset.ownerId === sessionUserId);
}

export function WorkspaceAssetsPage() {
  const { assets, session, assetForm, setAssetForm, createAsset, updateAssetStatus } = useAppState();
  const visibleAssets = getVisibleAssets(assets, session?.user.id, session?.user.role);
  const title = session?.user.role === "super_admin" ? "All Assets" : "My Assets";

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="section-title" style={{ fontSize: 22 }}>{title}</h1>
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

      {visibleAssets.map((asset) => (
        <div key={asset.id} className="workspace-asset-card">
          <div className="workspace-asset-header">
            <div>
              <span className="category-pill" style={{ marginRight: 8 }}>{asset.category}</span>
              <span className="workspace-asset-title">{asset.title}</span>
            </div>
            <AssetStatusPill status={asset.status} />
          </div>
          <div className="workspace-asset-meta">
            <span>{asset.location}</span>
            <span>{asset.priceLabel}</span>
            {session?.user.role === "super_admin" && <span>Owner: {asset.ownerId}</span>}
          </div>
          <div className="workspace-asset-actions">
            {getStatusActions(asset.status).map((action) => (
              <button
                key={action.status}
                type="button"
                className={action.className}
                onClick={() => updateAssetStatus(asset.id, action.status)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {visibleAssets.length === 0 && (
        <div className="empty-state">No assets yet. Create your first one above.</div>
      )}
    </div>
  );
}
