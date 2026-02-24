'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { MVP_FREE_MODE } from '@/lib/feature-flags';
import { Bell, LogOut, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GlobalFooter } from '@/components/global-footer';
import { getStore } from '@/lib/store';
import Image from 'next/image';
import { MobileBottomNav, MobileDrawer } from '@/components/mobile-navigation';

const navConfig = {
  business: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Jobs', href: '/jobs' },
    { label: 'Tenders', href: '/tenders' },
    { label: 'Messages', href: '/messages' },
    { label: 'Notifications', href: '/notifications' },
    // Hide Pricing nav item during MVP free launch
    ...(MVP_FREE_MODE ? [] : [{ label: 'Pricing', href: '/pricing' }]),
    { label: 'Profile', href: '/profile' },
  ],
  admin: [
    { label: 'Home', href: '/admin' },
    { label: 'Verifications', href: '/admin/verifications' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Reviews', href: '/admin/reviews' },
  ],
};

export function TopBar() {
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-40 safe-area-inset-top">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isAdmin(currentUser) && <MobileDrawer />}
          <Link href="/" className="flex items-center min-w-0">
            <Image src="/TradeHub -Horizontal-Main.svg" alt="TradeHub" width={140} height={32} className="h-8 w-auto max-w-full" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin(currentUser) && (
            <Link href="/notifications" className="hidden md:flex relative p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] items-center justify-center">
              <Bell className="w-5 h-5 text-gray-700" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:flex rounded-lg min-w-[44px] min-h-[44px]">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="truncate max-w-[200px]">{currentUser.name || 'TradeHub user'}</DropdownMenuItem>
              {!isAdmin(currentUser) && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages?support=true">Contact Support</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function SideNav() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const store = getStore();

  if (!currentUser) {
    return null;
  }

  const onAdminRoute = pathname.startsWith('/admin');
  const navKey = onAdminRoute && isAdmin(currentUser) ? 'admin' : 'business';
  const navItems = [...navConfig[navKey]];
  if (navKey === 'business' && isAdmin(currentUser)) {
    navItems.push({ label: 'Admin', href: '/admin' });
  }
  const nav = navItems;
  const unreadCount = store.getUnreadConversationCount(currentUser.id);

  return (
    <div className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-white">
      <div className="p-6 border-b border-gray-200">
        <Link href="/">
          <Image src="/tradehub-mark.svg" alt="TradeHub" width={48} height={48} className="w-12 h-12" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        {nav.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-colors relative ${
                pathname.startsWith(item.href)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{item.label}</span>
              {item.label === 'Messages' && unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-yellow-800 bg-yellow-400 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function BottomNav() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const store = getStore();

  if (!currentUser) {
    return null;
  }

  if (isAdmin(currentUser)) {
    const nav = navConfig.admin;
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-stretch">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex-1 min-w-0">
              <div
                className={`px-2 py-3 text-center text-xs font-medium transition-colors min-h-[48px] flex items-center justify-center relative ${
                  pathname.startsWith(item.href)
                    ? 'text-blue-600 border-t-2 border-blue-600'
                    : 'text-gray-700'
                }`}
              >
                <span className="truncate">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return <MobileBottomNav />;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <>
        {children}
        <GlobalFooter />
      </>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden">
      <SideNav />
      <div className="flex-1 flex flex-col min-h-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)] md:pb-0" style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="min-h-full flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            <GlobalFooter />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
