package com.budvanskarivijera.hotel;

import android.app.Application;
import com.getcapacitor.CapacitorActivity;
import com.onesignal.OneSignal;

public class MainApplication extends Application {

  @Override
  public void onCreate() {
    super.onCreate();
    
    // Inicijalizuj OneSignal
    OneSignal.setLogLevel(OneSignal.LOG_LEVEL.VERBOSE, OneSignal.LOG_LEVEL.NONE);
    OneSignal.initWithContext(this);
    OneSignal.setAppId("2f2e1a1d-44e8-4e3e-9f08-7d8a2f3e5c8b");
  }
}
