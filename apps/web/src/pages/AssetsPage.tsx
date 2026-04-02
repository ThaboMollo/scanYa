import { Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";

export function AssetsPage() {
  const { assets } = useAppState();

  return (
    <div className="assets-page">
      <h1 className="assets-page-title">Browse Assets</h1>
      <p className="assets-page-subtitle">Find and book what you need</p>

      <div className="assets-grid">
        {assets.map((asset) => (
          <Link key={asset.id} to={`/assets/${asset.id}`} className="asset-card">
            <span className="category-pill">{asset.category}</span>
            <h3 className="asset-card-title">{asset.title}</h3>
            <p className="asset-card-description">{asset.description}</p>
            <div className="asset-card-footer">
              <span>{asset.location}</span>
              <span>{asset.priceLabel}</span>
            </div>
          </Link>
        ))}
        {assets.length === 0 && (
          <div className="empty-state">No assets available yet.</div>
        )}
      </div>
    </div>
  );
}
