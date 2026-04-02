import { useCallback, useEffect, useState } from "react";
import { useAppState } from "../state/AppContext";
import { api } from "../api";
import type { QrCode } from "@scanya/shared";

export function WorkspaceQrPage() {
  const { assets, session } = useAppState();
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  const myAssets = assets.filter((a) => a.ownerId === session?.user.id);

  const loadQrCodes = useCallback(async () => {
    if (!session) return;
    try {
      const { qrCodes: codes } = await api.listMyQrCodes(session.token);
      setQrCodes(codes);
    } catch {
      // ignore
    }
  }, [session]);

  useEffect(() => {
    loadQrCodes();
  }, [loadQrCodes]);

  const handleGenerate = async (assetId: string) => {
    if (!session) return;
    setGenerating(assetId);
    try {
      await api.createQrCode(session.token, assetId);
      await loadQrCodes();
    } catch {
      // ignore
    }
    setGenerating(null);
  };

  const getQrForAsset = (assetId: string) =>
    qrCodes.find((qr) => qr.targetId === assetId && qr.targetType === "asset_booking");

  const baseUrl = window.location.origin;

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 22, marginBottom: 16 }}>QR Codes</h1>

      {myAssets.map((asset) => {
        const qr = getQrForAsset(asset.id);
        return (
          <div key={asset.id} className="workspace-asset-card">
            <div className="workspace-asset-title">{asset.title}</div>
            {qr ? (
              <div style={{ marginTop: 12 }}>
                <div className="input-label">Booking Link</div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}>
                  <code style={{
                    background: "var(--neutral-bg)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 14,
                    flex: 1,
                    wordBreak: "break-all",
                  }}>
                    {baseUrl}/q/{qr.token}
                  </code>
                  <a
                    href={`/q/${qr.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-brand"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Open
                  </a>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dimmed)", marginTop: 8 }}>
                  Scanned {qr.scanCount} time{qr.scanCount !== 1 ? "s" : ""} &bull; Use this link in a QR code generator
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btn-brand"
                  onClick={() => handleGenerate(asset.id)}
                  disabled={generating === asset.id}
                >
                  {generating === asset.id ? "Generating..." : "Generate QR Link"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {myAssets.length === 0 && (
        <div className="empty-state">Create an asset first to generate QR codes.</div>
      )}
    </div>
  );
}
