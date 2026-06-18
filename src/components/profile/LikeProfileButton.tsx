'use client';

import { getAxios } from "@/lib/utils";
import { useEffect, useState, useTransition } from 'react';
import { ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  profileUserId: string;
  initialLiked: boolean;
	viewerUserId: string;
  initialLikesCount: number;
  disabled?: boolean;
  onUpdated?: (payload: {
    liked: boolean;
    likesCount: number;
  }) => void;
};

export default function LikeProfileButton({
  profileUserId,
	viewerUserId,
  initialLiked,
  initialLikesCount,
  disabled,
  onUpdated,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
	const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setLikesCount(initialLikesCount);
  }, [initialLiked, initialLikesCount, profileUserId]);

  const handleToggle = () => {
    if (disabled) return;
		setIsPending(true);
		getAxios(null).put(`/api/users/${profileUserId}/like`).
			then((response)=>{
				const data = response.data;
				setLiked(data.liked);
				setLikesCount(data.likesCount);
				setIsPending(false);
				onUpdated(data);
			}).catch((error)=>{
				console.error(error);
				toast.error('Could not update like');
				setIsPending(false);
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
