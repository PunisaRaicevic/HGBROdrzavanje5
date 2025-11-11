import StatCard from '../StatCard';
import { ClipboardList, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      <StatCard title="Total Tasks" value={48} icon={ClipboardList} trend={{ value: 12, isPositive: true }} />
      <StatCard title="Active Tasks" value={32} icon={Clock} iconColor="text-blue-600" />
      <StatCard title="Completed Today" value={8} icon={CheckCircle} iconColor="text-green-600" trend={{ value: 5, isPositive: true }} />
      <StatCard title="Overdue" value={3} icon={AlertCircle} iconColor="text-red-600" trend={{ value: 2, isPositive: false }} />
    </div>
  );
}
