import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, ClipboardList, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import StatCard from '@/components/StatCard';

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium">Manager Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {user?.fullName} - {user?.role}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Staff" 
          value={25} 
          icon={Users}
          trend={{ value: 3, isPositive: true }}
        />
        <StatCard 
          title="Active Tasks" 
          value={42} 
          icon={ClipboardList}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard 
          title="Completion Rate" 
          value="87%" 
          icon={CheckCircle}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard 
          title="Avg Response Time" 
          value="2.3h" 
          icon={Clock}
          trend={{ value: 15, isPositive: false }}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="departments" data-testid="tab-departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Technical Department</span>
                      <span className="font-medium">15 tasks</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: '65%' }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Housekeeping</span>
                      <span className="font-medium">12 tasks</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: '52%' }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Restaurant</span>
                      <span className="font-medium">8 tasks</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: '35%' }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Reception</span>
                      <span className="font-medium">7 tasks</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: '30%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border-l-4 border-l-red-500 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">Urgent</p>
                      <p className="text-sm text-muted-foreground">Immediate attention needed</p>
                    </div>
                    <span className="text-2xl font-bold">5</span>
                  </div>
                  <div className="flex items-center justify-between p-4 border-l-4 border-l-yellow-500 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">Normal Priority</p>
                      <p className="text-sm text-muted-foreground">Standard timeline</p>
                    </div>
                    <span className="text-2xl font-bold">28</span>
                  </div>
                  <div className="flex items-center justify-between p-4 border-l-4 border-l-blue-500 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">Can Wait</p>
                      <p className="text-sm text-muted-foreground">Low priority</p>
                    </div>
                    <span className="text-2xl font-bold">9</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                  <div className="flex-1">
                    <p className="font-medium">Task Completed: AC Repair in Room 305</p>
                    <p className="text-muted-foreground text-xs mt-1">Jovan Đurić (Technical) • 15 min ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                  <div className="flex-1">
                    <p className="font-medium">New Task Assigned: Kitchen Faucet Replacement</p>
                    <p className="text-muted-foreground text-xs mt-1">Petar Đukanović (Supervisor) • 1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5" />
                  <div className="flex-1">
                    <p className="font-medium">Task Returned: Pool Maintenance</p>
                    <p className="text-muted-foreground text-xs mt-1">Marko Nikolić (Worker) • 2 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average Completion Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">2.5</span>
                  <span className="text-muted-foreground mb-1">hours</span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>12% faster than last week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">94</span>
                  <span className="text-muted-foreground mb-1">%</span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>3% increase</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">4.6</span>
                  <span className="text-muted-foreground mb-1">/ 5.0</span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>0.2 increase</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performers This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Jovan Đurić</p>
                    <p className="text-sm text-muted-foreground">Technical - 12 tasks completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">98% success rate</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Marko Nikolić</p>
                    <p className="text-sm text-muted-foreground">Maintenance - 10 tasks completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">95% success rate</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Milica Petrović</p>
                    <p className="text-sm text-muted-foreground">Reception - 8 tasks completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">92% success rate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Technical Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Staff</span>
                    <span className="font-medium">8 / 10</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Tasks</span>
                    <span className="font-medium">15</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg. Completion Time</span>
                    <span className="font-medium">2.8 hours</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">92%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Housekeeping</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Staff</span>
                    <span className="font-medium">6 / 8</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Tasks</span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg. Completion Time</span>
                    <span className="font-medium">1.5 hours</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">96%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Restaurant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Staff</span>
                    <span className="font-medium">4 / 5</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Tasks</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg. Completion Time</span>
                    <span className="font-medium">3.2 hours</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">89%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reception</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Staff</span>
                    <span className="font-medium">3 / 3</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Tasks</span>
                    <span className="font-medium">7</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg. Completion Time</span>
                    <span className="font-medium">2.0 hours</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">94%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
