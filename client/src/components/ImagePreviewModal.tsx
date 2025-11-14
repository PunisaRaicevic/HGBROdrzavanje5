import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  return (
    <Dialog open={!!imageUrl} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0">
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-50 min-h-11 min-w-11"
            onClick={onClose}
            data-testid="button-close-preview"
          >
            <X className="w-5 h-5" />
          </Button>
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain"
              onClick={onClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
