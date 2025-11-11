import NotificationCenter from '../NotificationCenter';

export default function NotificationCenterExample() {
  const mockNotifications = [
    {
      id: '1',
      title: 'Novi zadatak kreiran',
      message: 'Popravka klima uređaja u sobi 305 čeka vašu akciju',
      type: 'task_created' as const,
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      id: '2',
      title: 'Zadatak vam je dodeljen',
      message: 'Redovno čišćenje bazena je dodeljeno vama',
      type: 'task_assigned' as const,
      isRead: false,
      createdAt: new Date(Date.now() - 15 * 60 * 1000)
    },
    {
      id: '3',
      title: 'Zadatak završen',
      message: 'Održavanje teretane je uspešno završeno',
      type: 'task_completed' as const,
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
  ];

  return (
    <div className="flex justify-end p-6">
      <NotificationCenter 
        notifications={mockNotifications}
        onMarkAsRead={(id) => console.log('Mark as read:', id)}
        onMarkAllAsRead={() => console.log('Mark all as read')}
      />
    </div>
  );
}
