import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient"; // <--- DODAT apiRequest
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

// IMPORT ONESIGNAL PLUGINA
import OneSignal from 'onesignal-cordova-plugin';

setupIonicReact({
  mode: "md",
});

function Router() {
  const { user, login, loading } = useAuth();

  // ============================================================
  // PODEŠAVANJE NOTIFIKACIJA + ČUVANJE U BAZU
  // ============================================================
  useEffect(() => {
    const setupOneSignal = async () => {
      console.log("🚀 [App.tsx] Pokrećem OneSignal inicijalizaciju...");

      try {
        // 1. Inicijalizacija
        OneSignal.initialize("754437c4-5e06-4b48-aa51-c5ccb77767a5");

        // 2. Traženje dozvole
        await OneSignal.Notifications.requestPermission(true);
        console.log("📱 [App.tsx] Dozvola zatražena.");

        // 3. Login korisnika (Povezivanje External ID)
        if (user && user.id) {
          OneSignal.login(user.id);
          console.log(`✅ [App.tsx] OneSignal LOGIN pozvan za: ${user.id}`);
        }

        // ---------------------------------------------------------
        // 4. ČUVANJE ID-ja U BAZU (OVO JE FALILO!)
        // ---------------------------------------------------------
        
        const saveIdToDb = async (id: string) => {
            try {
                console.log(`💾 [App.tsx] Šaljem Player ID u bazu: ${id}`);
                // Pozivamo tvoj backend endpoint da sačuvamo ID
                await apiRequest("POST", "/api/users/onesignal-player-id", { playerId: id });
                console.log("💾 [App.tsx] Player ID uspešno sačuvan u bazi!");
            } catch (err) {
                console.error("❌ [App.tsx] Greška pri čuvanju ID-ja:", err);
            }
        };

        // A) Proveri da li već imamo ID odmah
        const currentId = OneSignal.User.PushSubscription.id;
        if (currentId) {
            saveIdToDb(currentId);
        }

        // B) Slušaj promene (ako se ID generiše malo kasnije)
        OneSignal.User.PushSubscription.addEventListener("change", (event) => {
            console.log("🔄 [OneSignal EVENT] Promena statusa:", JSON.stringify(event));
            
            if (event.current.id) {
                saveIdToDb(event.current.id);
            }
        });

      } catch (error) {
        console.error("❌ [App.tsx] OneSignal CRITICAL ERROR:", JSON.stringify(error));
      }
    };

    // Pokreni samo ako je korisnik ulogovan
    if (user) {
      setupOneSignal();
    }
    
  }, [user]); 
  // ============================================================

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