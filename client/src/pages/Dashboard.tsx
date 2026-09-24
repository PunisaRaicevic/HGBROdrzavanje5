import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import OperatorDashboard from './OperatorDashboard';
import SupervisorDashboard from './SupervisorDashboard';
import WorkerDashboard from './WorkerDashboard';
import TechnicianDashboard from './TechnicianDashboard';
import ManagerDashboard from './ManagerDashboard';
import ComplaintSubmissionDashboard from './ComplaintSubmissionDashboard';
import RoomManagementDashboard from '@/components/RoomManagementDashboard';

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
      return <RoomManagementDashboard><OperatorDashboard /></RoomManagementDashboard>;
    case 'sef':
      return <SupervisorDashboard />;
    case 'radnik':
      return <WorkerDashboard />;
    case 'serviser':
      return <TechnicianDashboard />;
    case 'menadzer':
      return <RoomManagementDashboard><ManagerDashboard /></RoomManagementDashboard>;
    default:
      // All other roles (recepcioner, kuhar, sobarica, etc.) use complaint submission dashboard
      return <RoomManagementDashboard><ComplaintSubmissionDashboard /></RoomManagementDashboard>;
  }
}
