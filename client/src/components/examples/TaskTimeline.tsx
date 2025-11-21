import TaskTimeline from '../TaskTimeline';

export default function TaskTimelineExample() {
  const mockEvents = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      userName: 'Ana Nikolić',
      userRole: 'recepcioner',
      actionType: 'created',
      actionDescription: 'Kreiran zadatak'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      userName: 'Petar Jovanović',
      userRole: 'operater',
      actionDescription: 'Zadatak dodeljen Jovanu Markoviću',
      actionType: 'assigned'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      userName: 'Jovan Marković',
      userRole: 'radnik',
      actionDescription: 'Dodao komentar sa slikom',
      actionType: 'photo',
      hasPhoto: true
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      userName: 'Jovan Marković',
      userRole: 'radnik',
      actionDescription: 'Zadatak završen',
      actionType: 'completed'
    }
  ];

  return (
    <div className="p-6 max-w-2xl">
      <TaskTimeline events={mockEvents} />
    </div>
  );
}
