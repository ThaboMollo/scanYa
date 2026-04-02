import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { BookingCalendar } from "../components/BookingCalendar";
import { api } from "../api";

export function AssetDetailPage() {
  const { assetId, token } = useParams();
  const { assets, refreshAssets } = useAppState();
  const [resolvedAssetId, setResolvedAssetId] = useState<string | null>(assetId ?? null);
  const [isResolving, setIsResolving] = useState<boolean>(Boolean(token && !assetId));
  const [resolveError, setResolveError] = useState<string>("");

  useEffect(() => {
    if (assets.length === 0) {
      void refreshAssets();
    }
  }, [assets.length, refreshAssets]);

  useEffect(() => {
    if (assetId) {
      setResolvedAssetId(assetId);
      setIsResolving(false);
      setResolveError("");
      return;
    }

    if (!token) {
      setResolvedAssetId(null);
      setIsResolving(false);
      setResolveError("Missing asset route.");
      return;
    }

    let cancelled = false;

    async function resolveToken() {
      setIsResolving(true);
      setResolveError("");

      try {
        const { qrCode } = await api.resolveQr(token!);

        if (cancelled) {
          return;
        }

        if (qrCode.targetType !== "asset_booking") {
          setResolvedAssetId(null);
          setResolveError("This QR code does not point to an asset booking page.");
          return;
        }

        setResolvedAssetId(qrCode.targetId);
      } catch (error) {
        if (!cancelled) {
          setResolvedAssetId(null);
          setResolveError((error as Error).message || "QR code could not be resolved.");
        }
      } finally {
        if (!cancelled) {
          setIsResolving(false);
        }
      }
    }

    void resolveToken();

    return () => {
      cancelled = true;
    };
  }, [assetId, token]);

  const asset = useMemo(
    () => assets.find((entry) => entry.id === resolvedAssetId) ?? null,
    [assets, resolvedAssetId],
  );

  if (isResolving || (resolvedAssetId && assets.length === 0)) {
    return (
      <div className="asset-page">
        <div className="empty-state">Loading asset…</div>
      </div>
    );
  }

  if (resolveError) {
    return (
      <div className="asset-page">
        <div className="empty-state">{resolveError}</div>
      </div>
    );
  }

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
