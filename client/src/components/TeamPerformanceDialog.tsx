import { useState } from 'react';
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
import { PeriodPicker } from "@/components/PeriodPicker";

interface TeamPerformanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Granularity = 'day' | 'week' | 'month';

function getInitialRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export default function TeamPerformanceDialog({
  open,
  onOpenChange
}: TeamPerformanceDialogProps) {
  const [range, setRange] = useState(getInitialRange());
  const [granularity, setGranularity] = useState<Granularity>('day');

  const { data: tasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: open,
  });

  const periodTasks = (tasksResponse?.tasks || []).filter(task => {
    if (task.is_recurring && !task.parent_task_id) return false;
    const ref = (task.scheduled_for && task.parent_task_id)
      ? new Date(task.scheduled_for)
      : new Date(task.created_at);
    return ref >= range.start && ref < range.end;
  });

  const totalTasks = periodTasks.length;
  const completedTasks = periodTasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = periodTasks.filter(t =>
    t.status === 'with_operator' ||
    t.status === 'assigned_to_radnik' ||
    t.status === 'with_external'
  ).length;
  const newTasks = periodTasks.filter(t =>
    t.status === 'new' ||
    t.status === 'with_sef'
  ).length;
  const returnedTasks = periodTasks.filter(t =>
    t.status === 'returned_to_operator' ||
    t.status === 'returned_to_sef'
  ).length;
  const cancelledTasks = periodTasks.filter(t => t.status === 'cancelled').length;

  const completedWithTime = periodTasks.filter(t => t.status === 'completed');
  let avgResolutionTime = 0;

  if (completedWithTime.length > 0) {
    const totalTime = completedWithTime.reduce((sum, task) => {
      const created = new Date(task.created_at);
      const updated = new Date(task.updated_at);
      const diffMs = updated.getTime() - created.getTime();
      return sum + diffMs;
    }, 0);
    avgResolutionTime = Math.floor(totalTime / completedWithTime.length / (1000 * 60));
  }

  const urgentTasks = periodTasks.filter(t => t.priority === 'urgent').length;
  const normalTasks = periodTasks.filter(t => t.priority === 'normal').length;
  const lowTasks = periodTasks.filter(t => t.priority === 'low').length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="dialog-team-performance">
        <DialogHeader>
          <DialogTitle>Statistika tima</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <PeriodPicker
            value={range}
            onChange={setRange}
            granularity={granularity}
            onGranularityChange={setGranularity}
            data-testid="period-picker-team-performance"
          />

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
                <p className="text-2xl font-bold text-orange-600" data-testid="stat-new">{newTasks}</p>
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
                  {completedTasks} završenih zadataka u periodu
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
                  <span className="text-sm">Novi (cekaju obradu)</span>
                  <span className="font-medium text-orange-600">{newTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">U Toku (u obradi)</span>
                  <span className="font-medium text-blue-600">{inProgressTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vraceno</span>
                  <span className="font-medium text-yellow-600">{returnedTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Završeno</span>
                  <span className="font-medium text-green-600">{completedTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Otkazano</span>
                  <span className="font-medium text-gray-500">{cancelledTasks}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
