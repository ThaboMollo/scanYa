import { useAppState } from "../state/AppContext";

export function AlertStack() {
  const { alerts, dismissAlert } = useAppState();

  if (alerts.length === 0) return null;

  const liveMode = alerts.some((alert) => alert.type === "error" || alert.type === "warning")
    ? "assertive"
    : "polite";

  return (
    <div className="alert-stack" role="status" aria-live={liveMode}>
      {alerts.map((alert) => (
        <div key={alert.id} className={`alert alert--${alert.type}`}>
          <span className="alert-message">{alert.message}</span>
          <button
            type="button"
            className="alert-dismiss"
            aria-label="Dismiss alert"
            onClick={() => dismissAlert(alert.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
