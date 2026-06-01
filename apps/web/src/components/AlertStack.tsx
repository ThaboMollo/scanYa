import { useAppState } from "../state/AppContext";

export function AlertStack() {
  const { alerts, dismissAlert } = useAppState();

  if (alerts.length === 0) return null;

  return (
    <div className="alert-stack" role="status" aria-live="polite">
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
