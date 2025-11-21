import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { ImagePreviewModal } from './ImagePreviewModal';

export type PhotoPreview = {
  id: string;
  dataUrl: string;
};

interface PhotoUploadProps {
  photos: PhotoPreview[];
  onPhotosChange: (photos: PhotoPreview[]) => void;
  maxSizeMB?: number;
  label?: string;
}

export function PhotoUpload({ 
  photos, 
  onPhotosChange, 
  maxSizeMB = 5,
  label = "Upload fotografije (max 5MB po slici)"
}: PhotoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Nevažeći fajl",
          description: "Molimo izaberite sliku (JPG, PNG, itd.)",
          variant: "destructive",
        });
        continue;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: "Fajl previše velik",
          description: `Moguće je uploadovati sliku samo do ${maxSizeMB}MB`,
          variant: "destructive",
        });
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newPhoto: PhotoPreview = {
          id: `photo-${Date.now()}-${i}`,
          dataUrl,
        };
        onPhotosChange([...photos, newPhoto]);
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  };

  const handleTakePhoto = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        const newPhoto: PhotoPreview = {
          id: `photo-${Date.now()}`,
          dataUrl: image.dataUrl,
        };
        onPhotosChange([...photos, newPhoto]);
        
        toast({
          title: "Fotografija snimljena",
          description: "Fotografija je uspešno dodata",
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Greška sa kamerom",
        description: "Nije moguće pristupiti kameri",
        variant: "destructive",
      });
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    onPhotosChange(photos.filter(p => p.id !== photoId));
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      
      <div className="border-2 border-dashed rounded-md p-2 text-center">
        <Camera className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground mb-2">
          {label}
        </p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePhotoUpload}
            type="button"
            data-testid="button-upload-photo"
          >
            <Upload className="w-3 h-3 mr-1" />
            Upload
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTakePhoto}
            type="button"
            data-testid="button-take-photo"
          >
            <Camera className="w-3 h-3 mr-1" />
            Snimi
          </Button>
        </div>
      </div>
      
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="relative aspect-square bg-muted rounded-md overflow-hidden min-w-[96px] min-h-[96px] cursor-pointer hover-elevate"
              onClick={() => setPreviewImage(photo.dataUrl)}
              data-testid={`photo-preview-${photo.id}`}
            >
              <img 
                src={photo.dataUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-14 w-14 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePhoto(photo.id);
                }}
                type="button"
                data-testid={`button-remove-photo-${photo.id}`}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ImagePreviewModal 
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />
    </>
  );
}
