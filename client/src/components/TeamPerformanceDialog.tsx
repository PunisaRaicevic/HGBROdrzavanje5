import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface TeamPerformanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TeamPerformanceDialog({
  open,
  onOpenChange
}: TeamPerformanceDialogProps) {
  const { data: tasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: open,
  });

  // Get today's tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysTasks = (tasksResponse?.tasks || []).filter(task => {
    const createdDate = new Date(task.created_at);
    createdDate.setHours(0, 0, 0, 0);
    return createdDate.getTime() === today.getTime();
  });

  // Calculate statistics
  const totalTasks = todaysTasks.length;
  const completedTasks = todaysTasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = todaysTasks.filter(t => t.status === 'with_operator').length;
  const assignedTasks = todaysTasks.filter(t => t.status === 'assigned_to_radnik').length;
  const newTasks = todaysTasks.filter(t => t.status === 'with_sef').length;

  // Calculate average resolution time for completed tasks
  const completedWithTime = todaysTasks.filter(t => t.status === 'completed');
  let avgResolutionTime = 0;
  
  if (completedWithTime.length > 0) {
    const totalTime = completedWithTime.reduce((sum, task) => {
      const created = new Date(task.created_at);
      const updated = new Date(task.updated_at);
      const diffMs = updated.getTime() - created.getTime();
      return sum + diffMs;
    }, 0);
    avgResolutionTime = Math.floor(totalTime / completedWithTime.length / (1000 * 60)); // Minutes
  }

  // Priority breakdown
  const urgentTasks = todaysTasks.filter(t => t.priority === 'urgent').length;
  const normalTasks = todaysTasks.filter(t => t.priority === 'normal').length;
  const lowTasks = todaysTasks.filter(t => t.priority === 'low').length;

  // Completion rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="dialog-team-performance">
        <DialogHeader>
          <DialogTitle>Team Performance - Danas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Ukupno</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="stat-total">{totalTasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Završeno</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600" data-testid="stat-completed">{completedTasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">U Toku</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600" data-testid="stat-in-progress">{inProgressTasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Novo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600" data-testid="stat-new">{newTasks + assignedTasks}</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Stopa Završetka
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold" data-testid="completion-rate">{completionRate}%</p>
                  <Badge variant={completionRate >= 80 ? "default" : completionRate >= 50 ? "secondary" : "destructive"}>
                    {completionRate >= 80 ? "Odlično" : completionRate >= 50 ? "Dobro" : "Potrebno Poboljšanje"}
                  </Badge>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Prosečno Vreme Rešavanja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold" data-testid="avg-resolution">
                    {avgResolutionTime > 0 ? (
                      avgResolutionTime >= 60 
                        ? `${Math.floor(avgResolutionTime / 60)}h ${avgResolutionTime % 60}m`
                        : `${avgResolutionTime}m`
                    ) : 'N/A'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {completedTasks} završenih zadataka danas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Priority Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raspoređeno po Prioritetu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Hitno</span>
                  </div>
                  <Badge variant="destructive">{urgentTasks}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Normalno</span>
                  </div>
                  <Badge variant="default">{normalTasks}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">Nisko</span>
                  </div>
                  <Badge variant="secondary">{lowTasks}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Zadataka</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Novi od Operatera</span>
                  <span className="font-medium">{newTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dodeljeno Majstorima</span>
                  <span className="font-medium">{assignedTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">U Toku</span>
                  <span className="font-medium">{inProgressTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Završeno</span>
                  <span className="font-medium text-green-600">{completedTasks}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
