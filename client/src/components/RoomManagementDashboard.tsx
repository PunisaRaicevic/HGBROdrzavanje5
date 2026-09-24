import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoomAccess } from '@/hooks/use-room-access';
import OutOfOrderRoomsTab from './OutOfOrderRoomsTab';

export default function RoomManagementDashboard({ children }: { children: ReactNode }) {
  const { data } = useRoomAccess();
  if (!data?.canManage) return <>{children}</>;
  return (
    <Tabs defaultValue="dashboard" className="space-y-4">
      <TabsList className="h-auto flex flex-wrap">
        <TabsTrigger value="dashboard">Pregled</TabsTrigger>
        <TabsTrigger value="out-of-order" data-testid="tab-out-of-order"
          className="bg-red-100 text-red-800 hover:bg-red-200 data-[state=active]:bg-red-600 data-[state=active]:text-white">
          Sobe van funkcije
        </TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard">{children}</TabsContent>
      <TabsContent value="out-of-order"><OutOfOrderRoomsTab canEditReason={false} /></TabsContent>
    </Tabs>
  );
}