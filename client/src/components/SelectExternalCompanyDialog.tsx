import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, UserCheck, Loader2, PlusCircle } from 'lucide-react';

type ExternalCompany = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
};

interface SelectExternalCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCompany: (companyId: string | null, companyName: string) => void;
  taskTitle: string;
}

const OTHER_VALUE = '__other__';

export default function SelectExternalCompanyDialog({
  open,
  onOpenChange,
  onSelectCompany,
  taskTitle
}: SelectExternalCompanyDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState('');

  const { data: companiesData, isLoading } = useQuery<{ companies: ExternalCompany[] }>({
    queryKey: ['/api/external-companies'],
    enabled: open,
  });

  const companies = companiesData?.companies || [];

  const resetState = () => {
    setSelectedId(null);
    setOtherName('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetState();
    onOpenChange(newOpen);
  };

  const handleCancel = () => {
    resetState();
    onOpenChange(false);
  };

  const isOther = selectedId === OTHER_VALUE;
  const canConfirm = isOther
    ? otherName.trim().length > 0
    : !!selectedId;

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (isOther) {
      onSelectCompany(null, otherName.trim());
    } else {
      const company = companies.find(c => c.id === selectedId);
      if (!company) return;
      onSelectCompany(company.id, company.full_name);
    }
    resetState();
    onOpenChange(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'serviser':
        return 'Serviser';
      case 'treca_lica':
        return 'Treca lica';
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="dialog-select-external-company">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Dodijeli eksternoj firmi
          </DialogTitle>
          <DialogDescription>
            Zadatak: <span className="font-medium text-foreground">{taskTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {companies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nema eksternih firmi na spisku</h3>
                    <p className="text-sm text-muted-foreground">
                      Mozete unijeti drugu firmu rucno ispod.
                    </p>
                  </div>
                ) : (
                  companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setSelectedId(company.id)}
                      className={`w-full p-4 rounded-md border-2 transition-all hover-elevate ${
                        selectedId === company.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card'
                      }`}
                      data-testid={`button-select-external-company-${company.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>
                            {company.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-medium" data-testid={`text-external-company-name-${company.id}`}>
                              {company.full_name}
                            </h4>
                            {selectedId === company.id && (
                              <Badge variant="default" className="text-xs">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Izabrana
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {getRoleLabel(company.role)}
                            {company.department && ` - ${company.department}`}
                          </p>

                          {company.phone && (
                            <Badge variant="secondary" className="text-xs">
                              {company.phone}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}

                <button
                  onClick={() => setSelectedId(OTHER_VALUE)}
                  className={`w-full p-4 rounded-md border-2 transition-all hover-elevate ${
                    isOther ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                  data-testid="button-select-external-company-other"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback>
                        <PlusCircle className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <h4 className="font-medium">Druga firma</h4>
                      <p className="text-sm text-muted-foreground">
                        Unesite naziv firme koja nije na spisku
                      </p>
                    </div>
                  </div>
                </button>

                {isOther && (
                  <div className="pt-1">
                    <Input
                      autoFocus
                      value={otherName}
                      onChange={(e) => setOtherName(e.target.value)}
                      placeholder="Naziv firme"
                      data-testid="input-external-company-other"
                    />
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            data-testid="button-cancel-external-company-selection"
          >
            Otkazi
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            data-testid="button-confirm-external-company-selection"
          >
            Dodijeli
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
