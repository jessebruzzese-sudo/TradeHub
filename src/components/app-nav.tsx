'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { LogOut, MoreHorizontal, Bell, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GlobalFooter } from '@/components/global-footer';
import { getStore } from '@/lib/store';
import { hasValidABN } from '@/lib/abn-utils';
import { useDevUnread } from '@/lib/dev-unread-context';
import { useNotificationsUnread } from '@/lib/notifications-unread-context';
import Image from 'next/image';
import { MobileBottomNav, MobileDrawer } from '@/components/mobile-navigation';
import {
  BUSINESS_NAV_SECTIONS,
  ADMIN_NAV_ITEMS,
  getAccountItems,
  SUPPORT_MAILTO,
  type NavItemConfig,
} from '@/lib/nav-config';

export function TopBar() {
  const { currentUser, logout } = useAuth();
  const { hasUnread: notificationsHasUnread } = useNotificationsUnread();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-40 safe-area-inset-top">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isAdmin(currentUser) && <MobileDrawer />}
          <Link href="/" className="flex items-center min-w-0">
            <Image src="/TradeHub -Horizontal-Main.svg" alt="TradeHub" width={140} height={25} className="h-8 w-auto max-w-full" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin(currentUser) && (
            <Link href="/notifications" className="hidden md:flex relative p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] items-center justify-center">
              <Bell className="w-5 h-5 text-gray-700" />
              {notificationsHasUnread && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-label="Unread notifications" />
              )}
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:flex rounded-lg min-w-[44px] min-h-[44px]" aria-label="Account menu">
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
                    <a href={SUPPORT_MAILTO}>Help / Support</a>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Log out
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
  const router = useRouter();
  const store = getStore();
  const { override: devUnreadOverride } = useDevUnread();

  if (!currentUser) {
    return null;
  }

  const onAdminRoute = pathname.startsWith('/admin');
  const navKey = onAdminRoute && isAdmin(currentUser) ? 'admin' : 'business';
  const unreadCount =
    devUnreadOverride != null ? devUnreadOverride : store.getUnreadConversationCount(currentUser.id);
  const isVerified = hasValidABN(currentUser);

  const navLinkClass = (href: string, locked?: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative ${
      locked ? 'text-gray-400 cursor-pointer' : pathname.startsWith(href) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
    }`;

  const handleLockedClick = () => {
    router.push('/verify-business');
  };

  const renderNavItem = (item: NavItemConfig) => {
    const Icon = item.icon;
    const locked = item.requiresABN && !isVerified;
    const isProfile = item.href === '/profile';
    const isPricing = item.href === '/pricing';
    const isSettings = item.href === '/profile/edit';
    const isVerify = item.href === '/verify-business';
    const active =
      !locked &&
      (pathname.startsWith(item.href)
        ? isProfile
          ? pathname !== '/profile/availability'
          : isPricing
          ? pathname === '/pricing'
          : isSettings
          ? pathname === '/profile/edit'
          : isVerify
          ? pathname === '/verify-business'
          : true
        : false);

    const baseClass = `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative ${
      locked ? 'text-gray-400' : active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
    }`;

    if (item.isExternal) {
      return (
        <a key={item.href} href={item.href} className={baseClass}>
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.label}</span>
        </a>
      );
    }

    if (locked) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={handleLockedClick}
          className={`w-full text-left ${baseClass}`}
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.label}</span>
          <Lock className="h-3.5 w-3.5 ml-auto" />
        </button>
      );
    }

    return (
      <Link key={item.href} href={item.href} className={baseClass}>
        {Icon && <Icon className="h-4 w-4" />}
        <span>{item.label}</span>
        {item.label === 'Messages' && unreadCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-yellow-800 bg-yellow-400 rounded-full">
            {unreadCount}
          </span>
        )}
      </Link>
    );
  };

  if (navKey === 'admin') {
    return (
      <div className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="p-6 border-b border-gray-200">
          <Link href="/">
            <Image src="/tradehub-mark.svg" alt="TradeHub" width={48} height={48} className="w-12 h-12" />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  const accountItems = [...getAccountItems()];
  if (isAdmin(currentUser)) {
    accountItems.push({ label: 'Admin', href: '/admin', icon: Shield });
  }

  return (
    <div className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-white">
      <div className="p-6 border-b border-gray-200">
        <Link href="/">
          <Image src="/tradehub-mark.svg" alt="TradeHub" width={48} height={48} className="w-12 h-12" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {BUSINESS_NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.title === 'Account & Settings'
                ? accountItems.map((item) => renderNavItem(item))
                : section.items.map((item) => renderNavItem(item))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function BottomNav() {
  const { currentUser } = useAuth();
  const pathname = usePathname();

  if (!currentUser) {
    return null;
  }

  if (isAdmin(currentUser)) {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-stretch">
          {ADMIN_NAV_ITEMS.map((item) => (
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

type AppLayoutProps = {
  children: React.ReactNode;
  transparentBackground?: boolean;
};

export function AppLayout({
  children,
  transparentBackground = false,
}: AppLayoutProps) {
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
    <div className={`flex flex-col md:flex-row min-h-screen overflow-hidden ${transparentBackground ? 'bg-transparent' : 'bg-slate-50'}`}>
      <SideNav />
      <div className="flex-1 flex flex-col min-h-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)] md:pb-0" style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="min-h-full flex flex-col">
            <div className="flex min-h-0 flex-1 flex-col">
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
