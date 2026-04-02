import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { BookingCalendar } from "../components/BookingCalendar";

export function AssetDetailPage() {
  const { assetId, token } = useParams();
  const { assets, refreshAssets } = useAppState();

  useEffect(() => {
    if (assets.length === 0) {
      refreshAssets();
    }
  }, [assets.length, refreshAssets]);

  const asset = assets.find((a) => a.id === assetId || a.id === token);

  if (!asset) {
    return (
      <div className="asset-page">
        <div className="empty-state">Asset not found.</div>
      </div>
    );
  }

  return (
    <div className="asset-page">
      <div className="asset-hero">
        <span className="category-pill">{asset.category}</span>
        <h1 className="asset-title">{asset.title}</h1>
        <p className="asset-description">{asset.description}</p>
        <div className="asset-info-row">
          <div className="asset-info-pill">
            <div className="asset-info-label">Location</div>
            <div className="asset-info-value">{asset.location}</div>
          </div>
          <div className="asset-info-pill">
            <div className="asset-info-label">Min. notice</div>
            <div className="asset-info-value">{asset.minimumNoticeHours}h</div>
          </div>
          <div className="asset-info-pill">
            <div className="asset-info-label">Min. rental</div>
            <div className="asset-info-value">{asset.minimumRentalHours}h</div>
          </div>
          <div className="asset-info-pill">
            <div className="asset-info-label">Price</div>
            <div className="asset-info-value">{asset.priceLabel}</div>
          </div>
        </div>
      </div>
      <BookingCalendar assetId={asset.id} assetTitle={asset.title} />
    </div>
  );
}
