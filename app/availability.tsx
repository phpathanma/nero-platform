export function Availability({ capacity, sold }: { capacity: number; sold: number }) {
  if (capacity <= 0) return null;
  const percentage = Math.round((Math.max(0, capacity - sold) / capacity) * 100);

  return <div className="availability">
    <div className="availability-label"><span>Disponibilidad</span><strong>{percentage === 0 ? "Agotado" : `${percentage}%`}</strong></div>
    <div className="availability-track" role="meter" aria-label="Disponibilidad de entradas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
      <span style={{ width: `${percentage}%` }} />
    </div>
  </div>;
}
