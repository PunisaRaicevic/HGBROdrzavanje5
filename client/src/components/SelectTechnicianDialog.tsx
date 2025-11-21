import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserCheck, Wrench, Loader2 } from 'lucide-react';

type Technician = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
};

interface SelectTechnicianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTechnician: (technicianIds: string[], technicianNames: string[]) => void;
  taskTitle: string;
}

export default function SelectTechnicianDialog({
  open,
  onOpenChange,
  onSelectTechnician,
  taskTitle
}: SelectTechnicianDialogProps) {
  const [selectedTechnicians, setSelectedTechnicians] = useState<Set<string>>(new Set());

  // Fetch technicians from API
  const { data: techniciansData, isLoading } = useQuery<{ technicians: Technician[] }>({
    queryKey: ['/api/technicians'],
    enabled: open,
  });

  const technicians = techniciansData?.technicians || [];

  // Reset selection when dialog is closed to prevent stale selections
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedTechnicians(new Set());
    }
    onOpenChange(newOpen);
  };

  const toggleTechnician = (techId: string) => {
    const newSelection = new Set(selectedTechnicians);
    if (newSelection.has(techId)) {
      newSelection.delete(techId);
    } else {
      newSelection.add(techId);
    }
    setSelectedTechnicians(newSelection);
  };

  const handleConfirm = () => {
    if (selectedTechnicians.size > 0) {
      const selectedIds = Array.from(selectedTechnicians);
      const selectedNames = selectedIds
        .map(id => technicians.find(t => t.id === id)?.full_name)
        .filter((name): name is string => !!name);
      
      onSelectTechnician(selectedIds, selectedNames);
      setSelectedTechnicians(new Set());
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedTechnicians(new Set());
    onOpenChange(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'serviser':
        return 'Serviser';
      case 'radnik':
        return 'Radnik';
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="dialog-select-technician">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Izaberi Majstore
          </DialogTitle>
          <DialogDescription>
            Zadatak: <span className="font-medium text-foreground">{taskTitle}</span>
            {selectedTechnicians.size > 0 && (
              <span className="block mt-1 text-primary font-medium">
                Izabrano: {selectedTechnicians.size} {selectedTechnicians.size === 1 ? 'majstor' : 'majstora'}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : technicians.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Wrench className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nema dostupnih majstora</h3>
                <p className="text-sm text-muted-foreground">
                  Trenutno nema aktivnih majstora u sistemu.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {technicians.map((tech) => (
                  <button
                    key={tech.id}
                    onClick={() => toggleTechnician(tech.id)}
                    className={`w-full p-4 rounded-md border-2 transition-all hover-elevate ${
                      selectedTechnicians.has(tech.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card'
                    }`}
                    data-testid={`button-select-technician-${tech.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {tech.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-medium" data-testid={`text-technician-name-${tech.id}`}>
                            {tech.full_name}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-muted-foreground">
                              Aktivan
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {getRoleLabel(tech.role)}
                          {tech.department && ` - ${tech.department}`}
                        </p>

                        <div className="flex items-center gap-2">
                          {tech.phone && (
                            <Badge variant="secondary" className="text-xs">
                              {tech.phone}
                            </Badge>
                          )}
                          {selectedTechnicians.has(tech.id) && (
                            <Badge variant="default" className="text-xs">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Izabran
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            data-testid="button-cancel-technician-selection"
          >
            Otkaži
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedTechnicians.size === 0}
            data-testid="button-confirm-technician-selection"
          >
            Pošalji Majstorima ({selectedTechnicians.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
