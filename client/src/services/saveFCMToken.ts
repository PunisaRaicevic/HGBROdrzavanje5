export async function saveTokenToSupabase(userId: string, token: string) {
  try {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.error('Cannot save FCM token - user not authenticated');
      return;
    }

    const response = await fetch('/api/users/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ token })
    });

    if (response.ok) {
      console.log('✅ FCM token saved successfully:', token);
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to save FCM token:', errorText);
    }
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
  }
}
