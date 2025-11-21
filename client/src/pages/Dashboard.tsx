import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import OperatorDashboard from './OperatorDashboard';
import SupervisorDashboard from './SupervisorDashboard';
import WorkerDashboard from './WorkerDashboard';
import TechnicianDashboard from './TechnicianDashboard';
import ManagerDashboard from './ManagerDashboard';
import ComplaintSubmissionDashboard from './ComplaintSubmissionDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Render role-specific dashboard
  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'operater':
      return <OperatorDashboard />;
    case 'sef':
      return <SupervisorDashboard />;
    case 'radnik':
      return <WorkerDashboard />;
    case 'serviser':
      return <TechnicianDashboard />;
    case 'menadzer':
      return <ManagerDashboard />;
    default:
      // All other roles (recepcioner, kuhar, sobarica, etc.) use complaint submission dashboard
      return <ComplaintSubmissionDashboard />;
  }
}
