import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import "@/lib/i18n";
import LoginPage from "@/components/LoginPage";
import AppHeader from "@/components/AppHeader";
import Dashboard from "@/pages/Dashboard";
import TasksPage from "@/pages/TasksPage";
import UsersPage from "@/pages/UsersPage";
import NotFound from "@/pages/not-found";
import { IonApp, setupIonicReact } from "@ionic/react";
import { Capacitor } from "@capacitor/core";
import { useFCM } from "@/hooks/useFCM";
import { messaging, getToken } from "./firebase";

setupIonicReact({
  mode: "md",
});

function Router() {
  const { user, login, loading } = useAuth();

  console.log(`[Router] Current user:`, user?.fullName || 'NOT LOGGED IN', 'ID:', user?.id ? `${user.id.substring(0, 8)}...` : 'UNDEFINED');
  useFCM(user?.id);

  useEffect(() => {
    if (!user?.id) return;

    if (Capacitor.isNativePlatform()) {
      console.log("[Web FCM] Preskakam Web FCM - koristi se Capacitor Push Notifications");
      return;
    }

    const setupWebFCM = async () => {
      console.log("[Web FCM] Priprema Firebase Messaging za browser...");

      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn("[Web FCM] Nema JWT tokena!");
        return;
      }

      console.log("[Web FCM] JWT token dostupan");

      try {
        if (!('Notification' in window)) {
          console.warn("[Web FCM] Browser ne podrzava notifikacije");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn("[Web FCM] Korisnik nije dao dozvolu za notifikacije");
          return;
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error("[Web FCM] VAPID key nije konfigurisan");
          return;
        }

        const fcmToken = await getToken(messaging, { vapidKey });

        if (fcmToken) {
          console.log("[Web FCM] Token dobijen:", fcmToken.substring(0, 20) + "...");

          const response = await apiRequest("POST", "/api/users/fcm-token", {
            token: fcmToken,
          });

          console.log("[Web FCM] Token sacuvan na serveru:", response.status);
        } else {
          console.warn("[Web FCM] Token nije dobijen");
        }
      } catch (error: any) {
        console.error("[Web FCM] Greska pri inicijalizaciji:", {
          message: error?.message || String(error),
          code: error?.code,
          fullError: error
        });
      }
    };

    const timer = setTimeout(() => {
      setupWebFCM();
    }, 500);

    return () => clearTimeout(timer);
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Ucitavanje...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
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
  );
}

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