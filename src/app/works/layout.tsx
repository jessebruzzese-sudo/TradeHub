import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function WorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
