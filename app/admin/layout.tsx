import { Metadata } from 'next';
import AdminLayoutClient from './admin-layout-client';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
