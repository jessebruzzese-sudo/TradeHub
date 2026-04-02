import { redirect } from 'next/navigation';

export default function UsersRedirect({ params }: { params: { id: string } }) {
  const id = params?.id?.trim();
  if (!id) {
    redirect('/subcontractors');
  }
  redirect(`/profiles/${id}`);
}
