'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { getBrowserSupabase } from '@/lib/supabase-client';

interface ProfileAvatarProps {
  userId: string;
  currentAvatarUrl?: string;
  userName: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
  editable?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ProfileAvatar({
  userId,
  currentAvatarUrl,
  userName,
  onAvatarUpdate,
  editable = true,
}: ProfileAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getBrowserSupabase();

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

    setIsUploading(true);

    try {
      // ✅ One fixed path per user (overwrites old avatar)
      const filePath = `${userId}/avatar.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // ✅ Optional cache-bust so browser always refreshes immediately
      const freshUrl = `${data.publicUrl}?v=${Date.now()}`;

      onAvatarUpdate(freshUrl);
      toast.success('Profile photo updated successfully');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error?.message || 'Failed to upload profile photo. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (editable && !isUploading) fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(userName);

  return (
    <div className="relative">
      <div
        className={`group relative w-24 h-24 rounded-full overflow-hidden bg-blue-600 border-2 border-gray-200 flex items-center justify-center ${
          editable && !isUploading ? 'cursor-pointer' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {currentAvatarUrl ? (
          <Image src={currentAvatarUrl} alt={userName} fill className="object-cover" unoptimized />
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
