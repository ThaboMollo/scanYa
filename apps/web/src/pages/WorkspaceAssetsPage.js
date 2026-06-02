import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAppState } from "../state/AppContext";
const STATUS_STYLES = {
    draft: { bg: "var(--brand-light)", color: "var(--brand)", label: "Draft" },
    published: { bg: "var(--success-light)", color: "var(--success)", label: "Published" },
    archived: { bg: "var(--neutral-bg)", color: "var(--text-muted)", label: "Archived" },
};
function AssetStatusPill({ status }) {
    const style = STATUS_STYLES[status];
    return (_jsx("span", { className: "status-pill", style: { background: style.bg, color: style.color }, children: style.label }));
}
function getStatusActions(status) {
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
function getVisibleAssets(assets, sessionUserId, role) {
    if (role === "super_admin") {
        return assets;
    }
    return assets.filter((asset) => asset.ownerId === sessionUserId);
}
export function WorkspaceAssetsPage() {
    const { assets, session, assetForm, setAssetForm, createAsset, updateAssetStatus } = useAppState();
    const visibleAssets = getVisibleAssets(assets, session?.user.id, session?.user.role);
    const title = session?.user.role === "super_admin" ? "All Assets" : "My Assets";
    return (_jsxs("div", { children: [_jsx("div", { className: "dashboard-header", children: _jsx("h1", { className: "section-title", style: { fontSize: 22 }, children: title }) }), _jsxs("div", { className: "workspace-asset-card", style: { marginBottom: 24 }, children: [_jsx("h3", { className: "section-title", children: "Create New Asset" }), _jsxs("form", { onSubmit: createAsset, style: { display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }, children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [_jsxs("div", { children: [_jsx("label", { className: "input-label", children: "Title" }), _jsx("input", { className: "input", value: assetForm.title, onChange: (e) => setAssetForm({ ...assetForm, title: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "input-label", children: "Category" }), _jsx("input", { className: "input", value: assetForm.category, onChange: (e) => setAssetForm({ ...assetForm, category: e.target.value }), required: true })] })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [_jsxs("div", { children: [_jsx("label", { className: "input-label", children: "Location" }), _jsx("input", { className: "input", value: assetForm.location, onChange: (e) => setAssetForm({ ...assetForm, location: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "input-label", children: "Price label" }), _jsx("input", { className: "input", value: assetForm.priceLabel, onChange: (e) => setAssetForm({ ...assetForm, priceLabel: e.target.value }), required: true })] })] }), _jsxs("div", { children: [_jsx("label", { className: "input-label", children: "Description" }), _jsx("textarea", { className: "input", rows: 3, value: assetForm.description, onChange: (e) => setAssetForm({ ...assetForm, description: e.target.value }), required: true })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [_jsxs("div", { children: [_jsx("label", { className: "input-label", children: "Min. notice (hours)" }), _jsx("input", { className: "input", type: "number", value: assetForm.minimumNoticeHours, onChange: (e) => setAssetForm({ ...assetForm, minimumNoticeHours: Number(e.target.value) }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "input-label", children: "Min. rental (hours)" }), _jsx("input", { className: "input", type: "number", value: assetForm.minimumRentalHours, onChange: (e) => setAssetForm({ ...assetForm, minimumRentalHours: Number(e.target.value) }), required: true })] })] }), _jsx("button", { className: "btn btn-brand", type: "submit", children: "Create Asset" })] })] }), visibleAssets.map((asset) => (_jsxs("div", { className: "workspace-asset-card", children: [_jsxs("div", { className: "workspace-asset-header", children: [_jsxs("div", { children: [_jsx("span", { className: "category-pill", style: { marginRight: 8 }, children: asset.category }), _jsx("span", { className: "workspace-asset-title", children: asset.title })] }), _jsx(AssetStatusPill, { status: asset.status })] }), _jsxs("div", { className: "workspace-asset-meta", children: [_jsx("span", { children: asset.location }), _jsx("span", { children: asset.priceLabel }), session?.user.role === "super_admin" && _jsxs("span", { children: ["Owner: ", asset.ownerId] })] }), _jsx("div", { className: "workspace-asset-actions", children: getStatusActions(asset.status).map((action) => (_jsx("button", { type: "button", className: action.className, onClick: () => updateAssetStatus(asset.id, action.status), children: action.label }, action.status))) })] }, asset.id))), visibleAssets.length === 0 && (_jsx("div", { className: "empty-state", children: "No assets yet. Create your first one above." }))] }));
}
