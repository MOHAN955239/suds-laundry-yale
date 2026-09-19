import type { Machine } from '../api';
import { StatusBadge } from './StatusBadge';

export function MachineCard({
  machine,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  machine: Machine;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="machine-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      <button
        className={`fav-btn ${isFavorite ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
      >
        {isFavorite ? '⭐' : '☆'}
      </button>
      <div className="label">{machine.label}</div>
      <div className="building">
        {machine.building.split(' ')[0]} · Floor {machine.floor}
      </div>
      <StatusBadge status={machine.status} />
    </div>
  );
}
