export function Legend() {
  return (
    <div className="legend">
      <span><span className="dot" style={{ background: '#22c55e' }} />Available</span>
      <span><span className="dot" style={{ background: '#f59e0b' }} />In Use</span>
      <span><span className="dot" style={{ background: '#ef4444' }} />Almost Done</span>
      <span><span className="dot" style={{ background: '#94a3b8' }} />Out of Order</span>
    </div>
  );
}
