import PriorityBadge from '../PriorityBadge';

export default function PriorityBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-6">
      <PriorityBadge priority="urgent" />
      <PriorityBadge priority="normal" />
      <PriorityBadge priority="can_wait" />
    </div>
  );
}
