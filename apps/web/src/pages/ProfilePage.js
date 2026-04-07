import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAppState } from "../state/AppContext";
export function ProfilePage() {
    const { session, signOut } = useAppState();
    if (!session)
        return null;
    return (_jsxs("div", { children: [_jsx("h1", { className: "section-title", style: { fontSize: 22, marginBottom: 16 }, children: "Profile" }), _jsx("div", { className: "workspace-asset-card", children: _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { children: [_jsx("div", { className: "input-label", children: "Name" }), _jsx("div", { style: { fontSize: 15, fontWeight: 600 }, children: session.user.name })] }), _jsxs("div", { children: [_jsx("div", { className: "input-label", children: "Email" }), _jsx("div", { style: { fontSize: 15 }, children: session.user.email })] }), _jsxs("div", { children: [_jsx("div", { className: "input-label", children: "Company" }), _jsx("div", { style: { fontSize: 15 }, children: session.user.company || "—" })] }), _jsxs("div", { children: [_jsx("div", { className: "input-label", children: "Role" }), _jsx("div", { style: { fontSize: 15 }, children: session.user.role })] }), _jsx("button", { className: "btn btn-danger-outline", style: { alignSelf: "flex-start", marginTop: 8 }, onClick: signOut, children: "Sign Out" })] }) })] }));
}
