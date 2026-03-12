const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "status-badge status-draft" },
  processing: { label: "Processando", className: "status-badge status-processing" },
  authorized: { label: "Autorizada", className: "status-badge status-authorized" },
  rejected: { label: "Rejeitada", className: "status-badge status-rejected" },
  cancelled: { label: "Cancelada", className: "status-badge status-cancelled" },
  substituted: { label: "Substituída", className: "status-badge status-cancelled" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  return <span className={config.className}>{config.label}</span>;
}
