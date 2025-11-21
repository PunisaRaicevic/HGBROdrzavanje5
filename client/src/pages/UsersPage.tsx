import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function UsersPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  //todo: remove mock functionality
  const mockUsers = [
    { id: '1', fullName: 'Ana Nikolić', email: 'ana.nikolic@hotel.com', role: 'recepcioner', department: 'recepcija', isActive: true },
    { id: '2', fullName: 'Petar Jovanović', email: 'petar.jovanovic@hotel.com', role: 'operater', department: 'recepcija', isActive: true },
    { id: '3', fullName: 'Jovan Marković', email: 'jovan.markovic@hotel.com', role: 'radnik', department: 'bazen', isActive: true },
    { id: '4', fullName: 'Milan Đorđević', email: 'milan.djordjevic@hotel.com', role: 'sef', department: 'tehnicka', isActive: true },
    { id: '5', fullName: 'Mirko Stefanović', email: 'mirko.stefanovic@hotel.com', role: 'serviser', department: 'tehnicka', isActive: true },
    { id: '6', fullName: 'Marija Petrović', email: 'marija.petrovic@hotel.com', role: 'radnik', department: 'domacinstvo', isActive: false },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      operater: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      sef: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      radnik: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      recepcioner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      serviser: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-medium">{t('users')}</h1>
        <Button data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-2" />
          {t('addNew')}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-users"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockUsers.map(user => (
          <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.fullName}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={`${getRoleBadgeColor(user.role)} border-0 no-default-hover-elevate no-default-active-elevate`}>
                        {t(user.role)}
                      </Badge>
                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                        {t(user.department)}
                      </Badge>
                      {!user.isActive && (
                        <Badge variant="outline" className="text-muted-foreground border-muted no-default-hover-elevate no-default-active-elevate">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-user-menu-${user.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem data-testid={`button-edit-user-${user.id}`}>{t('edit')}</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" data-testid={`button-deactivate-user-${user.id}`}>
                      Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
