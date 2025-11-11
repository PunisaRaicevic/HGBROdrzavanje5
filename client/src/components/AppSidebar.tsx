import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { LayoutDashboard, ClipboardList, Users, Building2, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function AppSidebar() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const allMenuItems = [
    {
      title: t('dashboard'),
      url: '/',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'operator', 'sef', 'radnik', 'serviser', 'menadzer'], // Everyone
    },
    {
      title: t('tasks'),
      url: '/tasks',
      icon: ClipboardList,
      allowedRoles: ['admin'], // Admin only
    },
    {
      title: t('users'),
      url: '/users',
      icon: Users,
      allowedRoles: ['admin'], // Admin only
    },
    {
      title: t('companies'),
      url: '/companies',
      icon: Building2,
      allowedRoles: ['admin'], // Admin only
    },
    {
      title: t('settings'),
      url: '/settings',
      icon: Settings,
      allowedRoles: ['admin'], // Admin only
    },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => 
    item.allowedRoles.includes(user?.role || '')
  );

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.slice(1) || 'dashboard'}`}
                  >
                    <a href={item.url} onClick={(e) => {
                      e.preventDefault();
                      setLocation(item.url);
                    }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
