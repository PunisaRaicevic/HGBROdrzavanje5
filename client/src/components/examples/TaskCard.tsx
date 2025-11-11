import TaskCard from '../TaskCard';

export default function TaskCardExample() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
      <TaskCard
        id="task-001"
        title="Popravka klima uređaja u sobi 305"
        description="Gost se žali na neradan klima uređaj. Potrebna je hitna intervencija."
        location="Kat 3"
        roomNumber="305"
        priority="urgent"
        status="new"
        deadline={new Date(Date.now() + 2 * 60 * 60 * 1000)}
        createdAt={new Date()}
        onClick={() => console.log('Task clicked')}
      />
      <TaskCard
        id="task-002"
        title="Redovno čišćenje bazena"
        description="Dnevno održavanje i kontrola hemikalija u bazenu."
        location="Bazen"
        priority="normal"
        status="assigned_to_radnik"
        assignedTo={{ name: 'Jovan Marković', initials: 'JM' }}
        deadline={new Date(Date.now() + 24 * 60 * 60 * 1000)}
        createdAt={new Date(Date.now() - 3 * 60 * 60 * 1000)}
        onClick={() => console.log('Task clicked')}
      />
    </div>
  );
}
