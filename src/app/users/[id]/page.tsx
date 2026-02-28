import { redirect } from 'next/navigation';

export default function UsersRedirect({ params }: { params: { id: string } }) {
  redirect(`/profile/${params.id}`);
}
