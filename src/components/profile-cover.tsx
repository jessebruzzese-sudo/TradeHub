'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Cropper, { Area } from 'react-easy-crop';
import { toast } from 'sonner';
import { Camera, Trash2 } from 'lucide-react';

import { getBrowserSupabase } from '@/lib/supabase-client';
import { getCroppedImageBlob } from '@/lib/crop-image';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function extractCoversPathFromUrl(url?: string | null): string | null {
  if (!url) return null;

  const cleaned = String(url).split('?')[0];

  // If it's already a storage path (e.g. "userId/cover_123.png")
  if (!cleaned.startsWith('http')) return cleaned.replace(/^\/+/, '');

  try {
    const u = new URL(cleaned);
    const parts = u.pathname.split('/covers/');
    if (parts.length < 2) return null;
    return parts[1].replace(/^\/+/, '') || null;
  } catch {
    return null;
  }
}

type Point = { x: number; y: number };

export function ProfileCover({
  userId,
  coverUrl,
  onCoverUpdate,
}: {
  userId: string;
  coverUrl?: string;
  onCoverUpdate: (url: string | null) => Promise<void> | void;
}) {
  const supabase = getBrowserSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);

  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const CROP_W = 1500;
  const CROP_H = 500;

  const onCropComplete = (_: Area, pixels: Area) => setCroppedAreaPixels(pixels);

  const pickFile = () => {
    if (!isUploading) fileInputRef.current?.click();
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

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setImageSrc(src);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setOpen(true);
    };
    reader.readAsDataURL(file);

    // allow reselect same file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels as any, 512, {
        outputWidth: CROP_W,
        outputHeight: CROP_H,
        mimeType: 'image/png',
        quality: 0.92,
      });

      const bucket = 'covers';
      const oldPath = extractCoversPathFromUrl(coverUrl ?? null);
      const filePath = `${userId}/cover_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { cacheControl: '3600', upsert: false, contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const freshUrl = `${data.publicUrl}?v=${Date.now()}`;

      // best-effort: delete previous cover file
      if (oldPath && oldPath !== filePath && oldPath.startsWith(`${userId}/`)) {
        try {
          await supabase.storage.from(bucket).remove([oldPath]);
        } catch (e) {
          console.warn('[ProfileCover] failed to remove old cover (best effort)', e);
        }
      }

      await onCoverUpdate(freshUrl);
      toast.success('Cover image updated');
      setOpen(false);
      setImageSrc(null);
    } catch (err: any) {
      console.error('[ProfileCover] save failed', err);
      toast.error(err?.message || 'Failed to update cover image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsUploading(true);

      const oldPath = extractCoversPathFromUrl(coverUrl ?? null);
      if (oldPath && oldPath.startsWith(`${userId}/`)) {
        await supabase.storage.from('covers').remove([oldPath]);
      }

      await onCoverUpdate(null);
      toast.success('Cover image removed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove cover image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border bg-slate-200">
        {/* Cover */}
        <div className="relative h-[162px] sm:h-[198px] md:h-[234px] w-full">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300" />
          )}

          {/* subtle overlay so buttons stay readable */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition" />

          {/* Actions */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={pickFile}
              disabled={isUploading}
              className="backdrop-blur bg-white/80 hover:bg-white"
            >
              <Camera className="h-4 w-4 mr-2" />
              Change cover
            </Button>

            {coverUrl ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleRemove}
                disabled={isUploading}
                className="backdrop-blur bg-white/80 hover:bg-white"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      <Dialog open={open} onOpenChange={(v) => !isUploading && setOpen(v)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adjust cover image</DialogTitle>
          </DialogHeader>

          <div className="relative mt-2 h-[320px] w-full overflow-hidden rounded-xl bg-slate-100">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={3}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                minZoom={1}
                maxZoom={3}
              />
            ) : null}
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">Zoom</div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isUploading || !croppedAreaPixels}>
              {isUploading ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
