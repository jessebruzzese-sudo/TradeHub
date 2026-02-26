import Image from 'next/image';

interface UserAvatarProps {
  avatarUrl?: string | null;
  userName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  avatarUrl,
  userName,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  } as const;

  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 48,
  } as const;

  const initials = getInitials(userName);

  // Treat null/undefined/empty-string as "no avatar" and show initials
  if (!avatarUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-white text-slate-900 border border-slate-200 font-semibold flex items-center justify-center flex-shrink-0 ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden bg-white border border-gray-200 flex-shrink-0 ${className}`}
    >
      <Image
        src={avatarUrl ?? undefined}
        alt={userName}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="w-full h-full object-cover"
        unoptimized
      />
    </div>
  );
}
