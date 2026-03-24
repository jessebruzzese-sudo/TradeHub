'use client';

import { useEffect, useState, useTransition } from 'react';
import { ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  profileUserId: string;
  initialLiked: boolean;
  initialLikesCount: number;
  disabled?: boolean;
  onUpdated?: (payload: {
    liked: boolean;
    likesCount: number;
    profileStrengthScore?: number;
    profileStrengthBand?: string;
  }) => void;
};

export default function LikeProfileButton({
  profileUserId,
  initialLiked,
  initialLikesCount,
  disabled,
  onUpdated,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLiked(initialLiked);
    setLikesCount(initialLikesCount);
  }, [initialLiked, initialLikesCount, profileUserId]);

  const handleToggle = () => {
    if (disabled || isPending) return;

    const previousLiked = liked;
    const previousCount = likesCount;

    const optimisticLiked = !liked;
    const optimisticCount = liked ? Math.max(0, likesCount - 1) : likesCount + 1;

    setLiked(optimisticLiked);
    setLikesCount(optimisticCount);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/profile/${profileUserId}/like`, {
          method: 'POST',
          credentials: 'include',
        });

        const json = await res.json();

        if (!res.ok) {
          setLiked(previousLiked);
          setLikesCount(previousCount);
          toast.error(json?.error || 'Could not update like');
          return;
        }

        setLiked(!!json.liked);
        setLikesCount(json.likesCount ?? optimisticCount);

        onUpdated?.({
          liked: !!json.liked,
          likesCount: json.likesCount ?? optimisticCount,
          profileStrengthScore: json.profileStrengthScore,
          profileStrengthBand: json.profileStrengthBand,
        });
      } catch {
        setLiked(previousLiked);
        setLikesCount(previousCount);
        toast.error('Could not update like');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled || isPending}
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition',
        liked
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        disabled || isPending ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
      <span>{liked ? 'Liked' : 'Like profile'}</span>
      <span className="text-slate-500">({likesCount})</span>
    </button>
  );
}
