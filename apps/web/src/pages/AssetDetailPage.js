import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { BookingCalendar } from "../components/BookingCalendar";
import { api } from "../api";
export function AssetDetailPage() {
    const { assetId, token } = useParams();
    const { assets, refreshAssets } = useAppState();
    const [resolvedAssetId, setResolvedAssetId] = useState(assetId ?? null);
    const [isResolving, setIsResolving] = useState(Boolean(token && !assetId));
    const [resolveError, setResolveError] = useState("");
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
                const { qrCode } = await api.resolveQr(token);
                if (cancelled) {
                    return;
                }
                if (qrCode.targetType !== "asset_booking") {
                    setResolvedAssetId(null);
                    setResolveError("This QR code does not point to an asset booking page.");
                    return;
                }
                setResolvedAssetId(qrCode.targetId);
            }
            catch (error) {
                if (!cancelled) {
                    setResolvedAssetId(null);
                    setResolveError(error.message || "QR code could not be resolved.");
                }
            }
            finally {
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
    const asset = useMemo(() => assets.find((entry) => entry.id === resolvedAssetId) ?? null, [assets, resolvedAssetId]);
    if (isResolving || (resolvedAssetId && assets.length === 0)) {
        return (_jsx("div", { className: "asset-page", children: _jsx("div", { className: "empty-state", children: "Loading asset\u2026" }) }));
    }
    if (resolveError) {
        return (_jsx("div", { className: "asset-page", children: _jsx("div", { className: "empty-state", children: resolveError }) }));
    }
    if (!asset) {
        return (_jsx("div", { className: "asset-page", children: _jsx("div", { className: "empty-state", children: "Asset not found." }) }));
    }
    return (_jsxs("div", { className: "asset-page", children: [_jsxs("div", { className: "asset-hero", children: [_jsx("span", { className: "category-pill", children: asset.category }), _jsx("h1", { className: "asset-title", children: asset.title }), _jsx("p", { className: "asset-description", children: asset.description }), _jsxs("div", { className: "asset-info-row", children: [_jsxs("div", { className: "asset-info-pill", children: [_jsx("div", { className: "asset-info-label", children: "Location" }), _jsx("div", { className: "asset-info-value", children: asset.location })] }), _jsxs("div", { className: "asset-info-pill", children: [_jsx("div", { className: "asset-info-label", children: "Min. notice" }), _jsxs("div", { className: "asset-info-value", children: [asset.minimumNoticeHours, "h"] })] }), _jsxs("div", { className: "asset-info-pill", children: [_jsx("div", { className: "asset-info-label", children: "Min. rental" }), _jsxs("div", { className: "asset-info-value", children: [asset.minimumRentalHours, "h"] })] }), _jsxs("div", { className: "asset-info-pill", children: [_jsx("div", { className: "asset-info-label", children: "Price" }), _jsx("div", { className: "asset-info-value", children: asset.priceLabel })] })] })] }), _jsx(BookingCalendar, { assetId: asset.id, assetTitle: asset.title })] }));
}
