'use client';
// vim: ts=2

import { useAuth } from "@/lib/auth-context";
import { getAxios } from "@/lib/utils";
import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { toast } from 'sonner';
import { getCroppedImageBlob } from '@/lib/crop-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface ProfileAvatarProps {
  userName: string;
	editable: boolean;
  /** Pixel size (width/height). Default 96. Use e.g. 116 for ~20% larger on profile header. */
  size?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const HEIC_TYPES = ['image/heic', 'image/heif'];

export function ProfileAvatar({
  userName,
	editable,
  size = 96,
}: ProfileAvatarProps) {
	
	const { jwt } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAutoCenteringRef = useRef(false);
	const isLoading = imageSrc === null;

	useEffect(()=>{
		if(!isLoading){
			return;
		}
		getAxios(jwt).
			get(`/api/me/profile/avatar`).
				then((response_)=>{
					const image = response_.data;
					const data = image.data;
					const mime = image.mime;
					const url = `data:${mime};base64,${data}`;
					setImageSrc(url);
				}).catch((err_)=>{
					console.error("Failed to load avatar");
				});
	}, [imageSrc]);

  const formatSbError = (err: unknown): string => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    const anyErr = err as any;
    const msg = typeof anyErr?.message === 'string' ? anyErr.message : '';
    const code = anyErr?.code != null ? String(anyErr.code) : '';
    if (msg && code && !msg.includes(code)) return `${msg} (${code})`;
    return msg || '';
  };

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

    const fileName = String(file.name ?? '');
    const lowerName = fileName.toLowerCase();
    const isHeicByName = lowerName.endsWith('.heic') || lowerName.endsWith('.heif');
    const isHeicByType = HEIC_TYPES.includes(file.type);

    if (isHeicByType || isHeicByName) {
      console.warn('[ProfileAvatar] unsupported HEIC/HEIF selected', {
        userId,
        name: fileName,
        type: file.type,
        size: file.size,
      });
      toast.error(
        "This photo format (HEIC) isn't supported yet. On iPhone, try Camera Settings → Formats → Most Compatible, or choose a different image."
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      console.warn('[ProfileAvatar] unsupported image type selected', {
        userId,
        name: fileName,
        type: file.type,
        size: file.size,
      });
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    let lastOp:
      | 'auth.getSession'
      | 'crop.getBlob'
      | 'storage.upload'
      | 'storage.getPublicUrl'
      | 'db.updateUser'
      | 'done'
      | null = null;
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels as any, 512, {
        outputWidth: CROP_BOX,
        outputHeight: CROP_BOX,
        mimeType: 'image/png',
        quality: 0.92,
      });
			const base64Image = Buffer.from(await blob.arrayBuffer()).toString("base64");
			const payload = { data: base64Image, mime: "image/png" };
			try{
				await getAxios(jwt).put("/api/me/profile/avatar", payload);
     		toast.success('Avatar updated');
				setCropOpen(false);
			}catch(err__){
				throw err__;
			}
    } catch (error: unknown) {
      console.error('[ProfileAvatar] crop upload failed', {
        userId,
        bucket,
        path: filePath,
        lastOp,
        error,
      });
      const message = formatSbError(error);
      const friendlyStage =
        lastOp === 'storage.upload'
          ? 'Upload failed'
          : lastOp === 'db.updateUser'
            ? 'Saved upload but could not update profile'
            : 'Profile photo update failed';
      toast.error(message ? `${friendlyStage}: ${message}` : friendlyStage);
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
        className={`group relative rounded-full overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center transition-transform duration-200 hover:scale-[1.02] ${
          editable && !isUploading ? 'cursor-pointer' : ''
        }`}
        style={{ width: size, height: size }}
        onClick={handleClick}
      >
        {imageSrc ? (
          <Image src={imageSrc} alt={userName} fill className="object-cover" unoptimized sizes={`${size}px`} />
        ) : (
          <div className="text-slate-900 text-3xl font-semibold">{initials}</div>
        )}

        {editable && (
          <div
            className="
              absolute inset-0
              flex items-center justify-center
              bg-black/40
              text-white text-sm font-semibold
              opacity-0
              transition-opacity duration-200
              group-hover:opacity-100
            "
          >
            {isUploading ? 'Uploading…' : 'Change photo'}
          </div>
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
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      )}
    </div>
  );
}
