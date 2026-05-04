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

          </div>

          {/* Analiza po majstorima */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Analiza po majstorima <span className="text-sm font-normal text-muted-foreground">(za izabrani period)</span></CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const assignedTasks = periodTasks.filter(t => t.status !== 'cancelled' && t.assigned_to_name);

                type WorkerStats = { completed: number; returned: number; pending: number; total: number };
                const byWorker: Record<string, WorkerStats> = {};

                assignedTasks.forEach(task => {
                  const names = (task.assigned_to_name || '').split(',').map((n: string) => n.trim()).filter(Boolean);
                  const isReturned = task.status === 'returned_to_sef' || task.status === 'returned_to_operator';
                  const isCompleted = task.status === 'completed';
                  const confirmedName = (task.receipt_confirmed_by_name || '').trim().toLowerCase();

                  names.forEach((name: string) => {
                    if (!byWorker[name]) byWorker[name] = { completed: 0, returned: 0, pending: 0, total: 0 };
                    if (isCompleted) {
                      if (confirmedName && name.toLowerCase() === confirmedName) {
                        byWorker[name].completed++;
                        byWorker[name].total++;
                      }
                    } else if (isReturned) {
                      byWorker[name].returned++;
                      byWorker[name].total++;
                    } else {
                      byWorker[name].pending++;
                      byWorker[name].total++;
                    }
                  });
                });

                const workers = Object.entries(byWorker)
                  .filter(([, s]) => s.total > 0)
                  .sort((a, b) => b[1].total - a[1].total);

                const maxTotal = Math.max(...workers.map(([, s]) => s.total), 1);
                const totalAll = workers.reduce((acc, [, s]) => ({
                  completed: acc.completed + s.completed,
                  returned: acc.returned + s.returned,
                  pending: acc.pending + s.pending,
                }), { completed: 0, returned: 0, pending: 0 });

                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded bg-green-500" />
                        <span>Zavrseno: <strong>{totalAll.completed}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded bg-orange-500" />
                        <span>Vraceno: <strong>{totalAll.returned}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded bg-red-500" />
                        <span>Nezavrseno: <strong>{totalAll.pending}</strong></span>
                      </div>
                    </div>

                    {workers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6 text-xs">
                        Nema dodijeljenih zadataka za izabrani period
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {workers.map(([name, s]) => {
                          const widthPct = (s.total / maxTotal) * 100;
                          const completedPct = s.total > 0 ? (s.completed / s.total) * 100 : 0;
                          const returnedPct = s.total > 0 ? (s.returned / s.total) * 100 : 0;
                          const pendingPct = s.total > 0 ? (s.pending / s.total) * 100 : 0;
                          return (
                            <div key={name} className="space-y-1" data-testid={`worker-stats-${name}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium truncate">{name}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {s.completed} / {s.returned} / {s.pending} <span className="text-foreground font-medium">({s.total})</span>
                                </span>
                              </div>
                              <div className="bg-muted rounded h-5 overflow-hidden" style={{ width: `${widthPct}%`, minWidth: '60px' }}>
                                <div className="flex h-full">
                                  {s.completed > 0 && (
                                    <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${completedPct}%` }} title={`Zavrseno: ${s.completed}`}>
                                      {completedPct >= 12 ? s.completed : ''}
                                    </div>
                                  )}
                                  {s.returned > 0 && (
                                    <div className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${returnedPct}%` }} title={`Vraceno: ${s.returned}`}>
                                      {returnedPct >= 12 ? s.returned : ''}
                                    </div>
                                  )}
                                  {s.pending > 0 && (
                                    <div className="bg-red-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${pendingPct}%` }} title={`Nezavrseno: ${s.pending}`}>
                                      {pendingPct >= 12 ? s.pending : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}
