import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { BookingCalendar } from "../components/BookingCalendar";
import { supabase } from "../lib/supabase";
import { mapQrCode } from "../lib/dbMappers";

export function AssetDetailPage() {
  const { assetId, token } = useParams();
  const [searchParams] = useSearchParams();
  const {
    assets,
    refreshAssets,
    session,
    selectDate,
    selectSlot,
    loadAvailability,
    setCalendarView,
    setBookingStep,
  } = useAppState();
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
        const { data, error } = await supabase
          .from("qr_codes")
          .select("*")
          .eq("token", token!)
          .eq("status", "active")
          .single();

        if (error) throw error;

        const qrCode = mapQrCode(data);

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

  useEffect(() => {
    if (searchParams.get("booking") !== "1" || !session) return;

    const raw = sessionStorage.getItem("pendingBooking");
    if (!raw) return;

    try {
      const pending = JSON.parse(raw) as {
        assetId: string;
        selectedDate: string;
        selectedSlot: { startAt: string; endAt: string };
      };
      const targetAssetId = assetId ?? resolvedAssetId;
      if (pending.assetId !== targetAssetId) return;

      selectDate(pending.selectedDate);
      void loadAvailability(pending.assetId, pending.selectedDate);
      selectSlot(pending.selectedSlot);
      setCalendarView("day");
      setBookingStep("contact");
      sessionStorage.removeItem("pendingBooking");
      sessionStorage.removeItem("postLoginRedirect");
    } catch {
      // malformed JSON — discard it
      sessionStorage.removeItem("pendingBooking");
      sessionStorage.removeItem("postLoginRedirect");
    }
  }, [
    searchParams,
    session,
    assetId,
    resolvedAssetId,
    selectDate,
    loadAvailability,
    selectSlot,
    setCalendarView,
    setBookingStep,
  ]);

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
