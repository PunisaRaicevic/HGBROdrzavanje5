import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import "@/lib/i18n";
import LoginPage from "@/components/LoginPage";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import TasksPage from "@/pages/TasksPage";
import UsersPage from "@/pages/UsersPage";
import NotFound from "@/pages/not-found";
import { IonApp, setupIonicReact } from "@ionic/react";
import { useFCM } from "@/hooks/useFCM";
import { messaging, getToken } from "./firebase";

setupIonicReact({
  mode: "md",
});

function Router() {
  const { user, login, loading } = useAuth();

  // 🔥 Inicijalizuj push notifikacije na mobilnim uređajima
  useFCM(user?.id);

  // Web FCM setup
  useEffect(() => {
    const setupWebFCM = async () => {
      console.log("🔔 [FCM] Priprema Firebase Messaging...");

      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn("⚠️ [FCM] Nema JWT tokena!");
        return;
      }

      console.log("✅ [FCM] JWT token dostupan, Web FCM setup...");

      try {
        const fcmToken = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });

        if (fcmToken && user?.id) {
          console.log("✅ [FCM] Web token dobijen:", fcmToken);
          const response = await apiRequest("POST", "/api/users/fcm-token", {
            token: fcmToken,
          });
          console.log("✅ [FCM] Web token sačuvan:", response.status);
        }
      } catch (e) {
        console.log("❌ [FCM] Greška pri Web FCM:", e);
      }
    };

    if (!user) return;

    const timer = setTimeout(() => {
      setupWebFCM();
    }, 500);

    return () => clearTimeout(timer);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/tasks" component={TasksPage} />
              <Route path="/users" component={UsersPage} />
              <Route path="/companies">
                <div className="text-center text-muted-foreground mt-12">
                  <h2 className="text-2xl font-medium mb-2">
                    External Companies
                  </h2>
                  <p>Coming soon...</p>
                </div>
              </Route>
              <Route path="/settings">
                <div className="text-center text-muted-foreground mt-12">
                  <h2 className="text-2xl font-medium mb-2">Settings</h2>
                  <p>Coming soon...</p>
                </div>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// ==============================
//          MAIN APP WRAPPER
// ==============================
export default function App() {
  return (
    <IonApp>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </IonApp>
  );
}