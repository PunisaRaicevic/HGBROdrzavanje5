import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from '@tanstack/react-query';
import { Download, Calendar, User, MapPin, Clock, CheckCircle, XCircle, Printer } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { apiRequest } from '@/lib/queryClient';

interface DailyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DailyReportDialog({
  open,
  onOpenChange
}: DailyReportDialogProps) {
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

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate elapsed time
  const getElapsedTime = (createdAt: string, updatedAt?: string): string => {
    const created = new Date(createdAt);
    const updated = updatedAt ? new Date(updatedAt) : new Date();
    const diffMs = updated.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    }
    return `${diffMins}m`;
  };

  // Get base API URL - full URL for mobile, relative for web
  const getApiBaseUrl = () => {
    if (Capacitor.isNativePlatform()) {
      return 'https://hgbrtehnickasluzba.replit.app';
    }
    return '';
  };

  // Get auth headers with JWT token
  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Export to CSV - using server-side generation
  const exportToCSV = async () => {
    try {
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `dnevni_izvestaj_${dateStr}.csv`;
      const apiUrl = getApiBaseUrl();
      
      // Fetch CSV from server with auth
      const response = await fetch(`${apiUrl}/api/reports/daily/csv?date=${dateStr}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch CSV');
      const csvContent = await response.text();
      
      if (Capacitor.isNativePlatform()) {
        // Mobile: save to Documents and share
        const base64 = btoa(unescape(encodeURIComponent(csvContent)));
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents
        });
        await Share.share({
          title: 'Dnevni Izvestaj CSV',
          url: result.uri,
          dialogTitle: 'Sacuvaj ili podeli CSV'
        });
      } else {
        // Web: standard download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      }
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Greska pri preuzimanju CSV fajla');
    }
  };

  // Generate and share/download PDF - using server-side generation
  const handlePrint = async () => {
    try {
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `dnevni_izvestaj_${dateStr}.pdf`;
      const apiUrl = getApiBaseUrl();
      
      // Fetch PDF from server with auth
      const response = await fetch(`${apiUrl}/api/reports/daily/pdf?date=${dateStr}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const pdfBlob = await response.blob();
      
      if (Capacitor.isNativePlatform()) {
        // Mobile: convert blob to base64, save to Documents, then share
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents
            });
            await Share.share({
              title: 'Dnevni Izvestaj',
              url: result.uri,
              dialogTitle: 'Sacuvaj ili podeli PDF'
            });
          } catch (err) {
            console.error('Save/Share error:', err);
            alert('Greska pri cuvanju PDF fajla');
          }
        };
        reader.readAsDataURL(pdfBlob);
      } else {
        // Web: standard download
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Greska pri preuzimanju PDF fajla');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh]" data-testid="dialog-daily-report">
        <DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handlePrint}
                data-testid="button-print-report"
                className="print:hidden"
              >
                <Printer className="w-4 h-4 mr-2" />
                Štampaj
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={exportToCSV}
                data-testid="button-export-csv"
                className="print:hidden"
              >
                <Download className="w-4 h-4 mr-2" />
                Preuzmi CSV
              </Button>
            </div>
            <DialogTitle>Dnevni Izveštaj - {today.toLocaleDateString('sr-RS')}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground print:text-black print:mb-4">
            <span>Ukupno reklamacija: <strong>{todaysTasks.length}</strong></span>
            <span>•</span>
            <span>Završeno: <strong className="text-green-600 print:text-black">
              {todaysTasks.filter(t => t.status === 'completed').length}
            </strong></span>
            <span>•</span>
            <span>U toku: <strong className="text-blue-600 print:text-black">
              {todaysTasks.filter(t => t.status === 'with_operator').length}
            </strong></span>
          </div>

          {/* Table */}
          <ScrollArea className="h-[500px] print:h-auto print:overflow-visible">
            {todaysTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nema reklamacija za danas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Prijavljeno</TableHead>
                    <TableHead className="w-[120px]">Prijavio</TableHead>
                    <TableHead className="w-[100px]">Lokacija</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead className="w-[80px]">Prioritet</TableHead>
                    <TableHead className="w-[120px]">Dodeljen</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Vreme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysTasks.map((task) => (
                    <TableRow key={task.id} data-testid={`report-row-${task.id}`}>
                      <TableCell className="text-xs">
                        <div className="flex items-start gap-1">
                          <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{formatDateTime(task.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-start gap-1">
                          <User className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{task.created_by_name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{task.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        <p className="line-clamp-2">{task.description || task.title}</p>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            task.priority === 'urgent' ? 'destructive' : 
                            task.priority === 'normal' ? 'default' : 
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {task.priority === 'urgent' ? 'Hitno' : 
                           task.priority === 'normal' ? 'Normalno' : 
                           'Nisko'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {task.assigned_to_name || <span className="text-muted-foreground">Nije dodeljeno</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {task.status === 'completed' ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-600">Završeno</span>
                            </>
                          ) : task.status === 'with_operator' ? (
                            <>
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span className="text-xs text-blue-600">U toku</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-orange-600" />
                              <span className="text-xs text-orange-600">Novo</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {getElapsedTime(task.created_at, task.status === 'completed' ? task.updated_at : undefined)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
