import StatusBadge from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-6">
      <StatusBadge status="new" />
      <StatusBadge status="with_operator" />
      <StatusBadge status="assigned_to_radnik" />
      <StatusBadge status="with_sef" />
      <StatusBadge status="with_external" />
      <StatusBadge status="completed" />
      <StatusBadge status="cancelled" />
    </div>
  );
}
