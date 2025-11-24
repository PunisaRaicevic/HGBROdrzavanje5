package com.budvanskarivijera.hotel;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";
    private static final String CHANNEL_ID = "reklamacije-alert";
    private static final String CHANNEL_NAME = "Reklamacije i Zadaci";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        Log.d(TAG, "FirebaseMessagingService created");
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());

        String title = null;
        String body = null;

        // Pokusaj da procitas iz notification payload-a
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
            Log.d(TAG, "Notification payload - Title: " + title + ", Body: " + body);
        }

        // Fallback na data payload ako notification nije prisutan
        if (title == null || body == null) {
            Map<String, String> data = remoteMessage.getData();
            if (data != null && !data.isEmpty()) {
                title = data.get("title");
                body = data.get("body");
                Log.d(TAG, "Data payload - Title: " + title + ", Body: " + body);
            }
        }

        // Ako i dalje nema podataka, koristi default
        if (title == null) title = "Novi zadatak";
        if (body == null) body = "Imate novi zadatak";

        // Prikazi notifikaciju SA ZVUKOM
        showNotification(title, body);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

            // Proveri da li kanal vec postoji
            NotificationChannel existingChannel = notificationManager.getNotificationChannel(CHANNEL_ID);
            if (existingChannel != null) {
                Log.d(TAG, "Notification channel already exists");
                return;
            }

            // Kreiraj novi kanal SA ZVUKOM
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH // HIGH = zvuk + vibration
            );

            channel.setDescription("Notifikacije za nove reklamacije i zadatke");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500}); // Custom vibration
            
            // DEFAULT SYSTEM SOUND (kao SMS)
            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            channel.setSound(soundUri, audioAttributes);

            channel.enableLights(true);
            channel.setShowBadge(true);

            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "Notification channel created with sound and vibration");
        }
    }

    private void showNotification(String title, String body) {
        NotificationManager notificationManager = 
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Intent za otvaranje aplikacije
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        // DEFAULT SYSTEM SOUND URI
        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // Kreiraj notifikaciju SA ZVUKOM I VIBRACIJOM
        // Koristi android.R.drawable.ic_dialog_info kao fallback ikonu (uvek dostupna)
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info) // System ikona (uvek postoji)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(soundUri) // ZVUK!
            .setVibrate(new long[]{0, 500, 200, 500}) // VIBRACIJA!
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent);

        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, notificationBuilder.build());
        
        Log.d(TAG, "Notification shown with ID: " + notificationId);
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token: " + token);
        // Token se automatski salje preko Capacitor Push Notifications plugin-a
    }
}
