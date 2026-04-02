type Props = {
  label: string;
  value: number;
  variant?: "default" | "brand" | "success";
};

const VARIANT_CLASSES: Record<string, string> = {
  default: "stat-card",
  brand: "stat-card stat-card--brand",
  success: "stat-card stat-card--success",
};

export function StatCard({ label, value, variant = "default" }: Props) {
  return (
    <div className={VARIANT_CLASSES[variant]}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
}
