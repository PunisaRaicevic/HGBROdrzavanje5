import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const capacitorCamera = {
  /**
   * Check if Camera is available (web vs native)
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      // On web, Camera API is available but limited
      // On mobile, full native camera access
      return true;
    } catch (error) {
      console.error('[CAMERA] Not available:', error);
      return false;
    }
  },

  /**
   * Take a photo using native camera
   */
  takePhoto: async (): Promise<string | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      return image.dataUrl || null;
    } catch (error) {
      console.error('[CAMERA] Failed to take photo:', error);
      return null;
    }
  },

  /**
   * Pick photo from gallery
   */
  pickPhoto: async (): Promise<string | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return image.dataUrl || null;
    } catch (error) {
      console.error('[CAMERA] Failed to pick photo:', error);
      return null;
    }
  },

  /**
   * Pick multiple photos from gallery
   */
  pickMultiplePhotos: async (): Promise<string[]> => {
    try {
      // Note: Capacitor Camera doesn't support multiple selection out of box
      // For now, we'll call pickPhoto once, but this can be extended
      const photo = await capacitorCamera.pickPhoto();
      return photo ? [photo] : [];
    } catch (error) {
      console.error('[CAMERA] Failed to pick multiple photos:', error);
      return [];
    }
  },

  /**
   * Show action sheet: Camera or Gallery
   */
  showPhotoSourceSheet: async (): Promise<string | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt // Shows native action sheet
      });

      return image.dataUrl || null;
    } catch (error) {
      console.error('[CAMERA] User cancelled or error:', error);
      return null;
    }
  }
};
