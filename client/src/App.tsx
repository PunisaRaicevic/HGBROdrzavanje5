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
import { PushNotifications } from "@capacitor/push-notifications";

setupIonicReact({
  mode: "md",
});

function Router() {
  const { user, login, loading } = useAuth();

  useEffect(() => {
    const setupFCM = async () => {
      console.log("🚀 [FCM] Pokrećem inicijalizaciju push notifikacija...");

      // 1. Traženje dozvole
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") {
        console.warn("⚠️ [FCM] Push dozvola nije odobrena.");
        return;
      }

      // 2. Registracija uređaja
      await PushNotifications.register();

      // 3. Listeneri
      PushNotifications.addListener("registration", async token => {
        console.log("🔥 [FCM] Token uređaja:", token.value);

        // Sačuvamo token u bazu za korisnika
        if (user?.id) {
          await apiRequest("POST", "/api/users/fcm-token", {
            token: token.value,
          });
          console.log("💾 [FCM] Token sačuvan u bazi.");
        }
      });

      PushNotifications.addListener("registrationError", err => {
        console.error("❌ [FCM] registrationError:", err);
      });

      PushNotifications.addListener("pushNotificationReceived", notif => {
        console.log("📥 [FCM] Primljena notifikacija:", notif);
      });
    };

    if (user) setupFCM();

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