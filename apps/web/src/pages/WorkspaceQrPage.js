import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "../state/AppContext";
import { api } from "../api";
export function WorkspaceQrPage() {
    const { assets, session } = useAppState();
    const [qrCodes, setQrCodes] = useState([]);
    const [generating, setGenerating] = useState(null);
    const myAssets = assets.filter((a) => a.ownerId === session?.user.id);
    const loadQrCodes = useCallback(async () => {
        if (!session)
            return;
        try {
            const { qrCodes: codes } = await api.listMyQrCodes(session.token);
            setQrCodes(codes);
        }
        catch {
            // ignore
        }
    }, [session]);
    useEffect(() => {
        loadQrCodes();
    }, [loadQrCodes]);
    const handleGenerate = async (assetId) => {
        if (!session)
            return;
        setGenerating(assetId);
        try {
            await api.createQrCode(session.token, assetId);
            await loadQrCodes();
        }
        catch {
            // ignore
        }
        setGenerating(null);
    };
    const getQrForAsset = (assetId) => qrCodes.find((qr) => qr.targetId === assetId && qr.targetType === "asset_booking");
    const baseUrl = window.location.origin;
    return (_jsxs("div", { children: [_jsx("h1", { className: "section-title", style: { fontSize: 22, marginBottom: 16 }, children: "QR Codes" }), myAssets.map((asset) => {
                const qr = getQrForAsset(asset.id);
                return (_jsxs("div", { className: "workspace-asset-card", children: [_jsx("div", { className: "workspace-asset-title", children: asset.title }), qr ? (_jsxs("div", { style: { marginTop: 12 }, children: [_jsx("div", { className: "input-label", children: "Booking Link" }), _jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginTop: 4,
                                    }, children: [_jsxs("code", { style: {
                                                background: "var(--neutral-bg)",
                                                padding: "8px 12px",
                                                borderRadius: 8,
                                                fontSize: 14,
                                                flex: 1,
                                                wordBreak: "break-all",
                                            }, children: [baseUrl, "/q/", qr.token] }), _jsx("a", { href: `/q/${qr.token}`, target: "_blank", rel: "noopener noreferrer", className: "btn btn-brand", style: { whiteSpace: "nowrap" }, children: "Open" })] }), _jsxs("div", { style: { fontSize: 12, color: "var(--text-dimmed)", marginTop: 8 }, children: ["Scanned ", qr.scanCount, " time", qr.scanCount !== 1 ? "s" : "", " \u2022 Use this link in a QR code generator"] })] })) : (_jsx("div", { style: { marginTop: 12 }, children: _jsx("button", { className: "btn btn-brand", onClick: () => handleGenerate(asset.id), disabled: generating === asset.id, children: generating === asset.id ? "Generating..." : "Generate QR Link" }) }))] }, asset.id));
            }), myAssets.length === 0 && (_jsx("div", { className: "empty-state", children: "Create an asset first to generate QR codes." }))] }));
}
