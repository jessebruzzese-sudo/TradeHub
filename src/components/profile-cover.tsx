// vim: ts=2
'use client';

import { getAxios } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Cropper, { Area } from 'react-easy-crop';
import { toast } from 'sonner';
import { Camera, Trash2 } from 'lucide-react';
import { getCroppedImageBlob } from '@/lib/crop-image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

type Point = { x: number; y: number };

export const ProfileCover = (props) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
	const { jwt } = useAuth();
	const [isUploading, setIsUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const isLoading = imageSrc === null;

  const CROP_W = 1500;
  const CROP_H = 500;

	useEffect(()=>{
		if(!isLoading){
			return;	
		}		
		getAxios(jwt).
			get("/api/me/profile/cover").
				then((response_)=>{
					const { data, mime } = response_.data; // json, {data:<BASE64>,mime:<STRING>}
					const url = `data:${mime};base64,${data}`; 
					setImageSrc(url);
				}).catch((err_)=>{
					console.error(err_);
				});
	}, [imageSrc]);

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
			const base64Image = Buffer.from(await blob.arrayBuffer()).toString("base64");
			const payload = { data: base64Image, mime: "image/png" };
			try{
				await getAxios(jwt).put("/api/me/profile/cover", payload);
     		toast.success('Cover image updated');
			}catch(err__){
				throw err__;
			}
      setOpen(false);
      setImageSrc(`data:image/png;base64,${base64Image}`);
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
        	<Image src={imageSrc} 
							alt="cover-image" onClick={(event)=>{event.preventDefault();}} 
							fill className="object-cover" unoptimized />
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

            {imageSrc ? (
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
