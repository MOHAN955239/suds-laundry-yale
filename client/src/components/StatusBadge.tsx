const LABEL: Record<string, string> = {
  available: 'Available',
  in_use: 'In Use',
  almost_done: 'Almost Done',
  out_of_order: 'Out of Order',
  reserved: 'Reserved',
};

export function StatusBadge({ status, big = false }: { status: string; big?: boolean }) {
  return (
    <span
      className={`status-badge status-${status}`}
      style={big ? { fontSize: 13, padding: '5px 12px' } : undefined}
    >
      <span className="status-dot" />
      {LABEL[status] || status}
    </span>
  );
}
