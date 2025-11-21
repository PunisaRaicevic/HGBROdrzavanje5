import CreateTaskDialog from '../CreateTaskDialog';

export default function CreateTaskDialogExample() {
  return (
    <div className="flex justify-center p-6">
      <CreateTaskDialog onSubmit={(task) => console.log('Task submitted:', task)} />
    </div>
  );
}
