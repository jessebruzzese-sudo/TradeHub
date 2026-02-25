'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { getCroppedImageBlob } from '@/lib/crop-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface ProfileAvatarProps {
  userId: string;
  currentAvatarUrl?: string;
  userName: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
  editable?: boolean;
  /** Pixel size (width/height). Default 96. Use e.g. 116 for ~20% larger on profile header. */
  size?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ProfileAvatar({
  userId,
  currentAvatarUrl,
  userName,
  onAvatarUpdate,
  editable = true,
  size = 96,
}: ProfileAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAutoCenteringRef = useRef(false);
  const supabase = getBrowserSupabase();

  const onCropComplete = (_: Area, cropped: Area) => {
    setCroppedAreaPixels(cropped);
  };

  const handleZoomChange = (newZoom: number) => {
    isAutoCenteringRef.current = true;

    setZoom(newZoom);
    setCrop({ x: 0, y: 0 });

    requestAnimationFrame(() => {
      setCrop({ x: 0, y: 0 });
      isAutoCenteringRef.current = false;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Open cropper instead of uploading immediately
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;

      setImageSrc(src);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);

      const img = document.createElement('img');
      img.onload = () => {
        const fitZoom = computeCircleFitZoom(img.width, img.height, CROP_BOX);
        setZoom(Math.max(1, fitZoom));
        setCropOpen(true);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);

    // Clear input so selecting same file again still triggers change
    if (fileInputRef.current) fileInputRef.current.value = '';

    return;
  };

  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);

    const bucket = 'avatars';
    const filePath = `${userId}/avatar.png`;

    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, 512);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const freshUrl = `${data.publicUrl}?v=${Date.now()}`;

      onAvatarUpdate(freshUrl);
      toast.success('Profile photo updated successfully');

      setCropOpen(false);
      setImageSrc(null);
    } catch (error: unknown) {
      console.error('[ProfileAvatar] crop upload failed', {
        userId,
        bucket,
        path: filePath,
        error,
      });
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error(message || 'Failed to upload profile photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (editable && !isUploading) fileInputRef.current?.click();
  };

  const computeCircleFitZoom = (imgW: number, imgH: number, containerSize: number) => {
    const diag = Math.sqrt(imgW * imgW + imgH * imgH);
    const fit = containerSize / diag;
    const SAFETY = 0.98;
    return Math.min(1, fit * SAFETY);
  };

  const CROP_BOX = 340;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(userName);

  return (
    <div className="relative">
      <div
        className={`group relative rounded-full overflow-hidden bg-blue-600 border-2 border-gray-200 flex items-center justify-center ${
          editable && !isUploading ? 'cursor-pointer' : ''
        }`}
        style={{ width: size, height: size }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {currentAvatarUrl ? (
          <Image src={currentAvatarUrl} alt={userName} fill className="object-cover" unoptimized sizes={`${size}px`} />
        ) : (
          <div className="text-white text-3xl font-semibold">{initials}</div>
        )}

        {editable && (isHovered || isUploading) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <div className="text-white text-center text-sm font-medium px-2">
              {isUploading ? 'Uploading...' : 'Change photo'}
            </div>
          </div>
        )}

        {editable && (
          <button
            type="button"
            onClick={handleClick}
            disabled={isUploading}
            className="md:hidden absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            aria-label="Change profile photo"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <Dialog
        open={cropOpen}
        onOpenChange={(open) => {
          if (isUploading) return;
          setCropOpen(open);
          if (!open) setImageSrc(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Adjust profile photo</DialogTitle>
          </DialogHeader>

          <div className="relative mt-2 h-[340px] w-full overflow-hidden rounded-2xl bg-slate-100">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={(next) => {
                  if (isAutoCenteringRef.current) return;
                  setCrop(next);
                }}
                onZoomChange={handleZoomChange}
                onCropComplete={onCropComplete}
                minZoom={1}
                maxZoom={3}
              />
            ) : null}
          </div>

          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold text-slate-700">Zoom</div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(v) => handleZoomChange(v[0])}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => {
                if (isUploading) return;
                setCropOpen(false);
                setImageSrc(null);
              }}
              disabled={isUploading}
            >
              Cancel
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={handleSaveCrop}
              disabled={isUploading || !imageSrc || !croppedAreaPixels}
            >
              {isUploading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      )}
    </div>
  );
}
