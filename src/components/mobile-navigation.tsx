'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { Menu, Lock, LogOut, CircleCheck as CheckCircle, CircleAlert as AlertCircle, CheckCircle2, Crown } from 'lucide-react';
import { getStore } from '@/lib/store';
import { useDevUnread } from '@/lib/dev-unread-context';
import { useNotificationsUnread } from '@/lib/notifications-unread-context';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/profile-avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { hasValidABN } from '@/lib/abn-utils';
import {
  BUSINESS_NAV_SECTIONS,
  BOTTOM_NAV_ITEMS,
  getAccountItems,
  SUPPORT_MAILTO,
  type NavItemConfig,
} from '@/lib/nav-config';

export function MobileBottomNav() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const store = getStore();
  const { override: devUnreadOverride } = useDevUnread();

  if (!currentUser || isAdmin(currentUser)) {
    return null;
  }

  const unreadCount =
    devUnreadOverride != null ? devUnreadOverride : store.getUnreadConversationCount(currentUser.id);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-stretch">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          const hasUnread = item.label === 'Messages' && unreadCount > 0;

          return (
            <Link key={item.href} href={item.href} className="flex-1 min-w-0">
              <div
                className={`px-2 py-2 text-center transition-colors min-h-[64px] flex flex-col items-center justify-center relative ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                <div className="relative">
                  <Icon className="w-6 h-6 mb-1" />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium truncate">{item.label}</span>
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const store = getStore();
  const { override: devUnreadOverride } = useDevUnread();
  const { hasUnread: notificationsHasUnread } = useNotificationsUnread();

  const unreadMessageCount =
    devUnreadOverride != null ? devUnreadOverride : (currentUser ? store.getUnreadConversationCount(currentUser.id) : 0);

  if (!currentUser || isAdmin(currentUser)) {
    return null;
  }

  const isVerified = hasValidABN(currentUser);

  const isPremium =
    String((currentUser as any)?.plan || '').toLowerCase() === 'premium' ||
    Boolean((currentUser as any)?.isPremium) ||
    Boolean((currentUser as any)?.is_premium) ||
    (typeof (currentUser as any)?.premium_until === 'string' &&
      new Date((currentUser as any).premium_until).getTime() > Date.now()) ||
    (typeof (currentUser as any)?.complimentary_premium_until === 'string' &&
      new Date((currentUser as any).complimentary_premium_until).getTime() > Date.now()) ||
    ['active', 'trialing'].includes(String((currentUser as any)?.subscription_status || '').toLowerCase());

  const primaryTrade =
    (currentUser as any)?.primary_trade ??
    (Array.isArray((currentUser as any)?.trades) && (currentUser as any)?.trades?.[0]) ??
    (currentUser as any)?.trade ??
    null;

  const handleNavigation = (href: string, requiresABN: boolean = false) => {
    if (requiresABN && !isVerified) {
      router.push('/verify-business');
      setOpen(false);
      return;
    }
    router.push(href);
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-lg min-w-[44px] min-h-[44px]"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0 overflow-y-auto">
          <SheetTitle className="sr-only">
            Mobile Navigation
          </SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation menu for TradeHub
          </SheetDescription>
          <div className="flex flex-col h-full">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    'relative inline-flex items-center justify-center rounded-full transition-transform duration-200',
                    'hover:scale-[1.02] active:scale-[0.99]'
                  )}
                >
                  <div
                    className={cn(
                      'relative rounded-full',
                      isPremium && 'ring-2 ring-amber-400/40 ring-offset-2 ring-offset-white/80'
                    )}
                  >
                    <ProfileAvatar
                      userId={currentUser.id}
                      currentAvatarUrl={currentUser?.avatar ?? undefined}
                      userName={currentUser?.name ?? ''}
                      onAvatarUpdate={() => {}}
                      size={56}
                      editable={false}
                    />

                    {isVerified && (
                      <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      </span>
                    )}

                    {isPremium && (
                      <span className="absolute -top-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                        <Crown className="h-4 w-4 text-amber-600" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {currentUser.name || 'TradeHub user'}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {primaryTrade ? String(primaryTrade) : '—'}
                  </p>
                  <div className="mt-2">
                    {(() => {
                      const verified = Boolean(isVerified);
                      const label = verified ? 'Verified' : 'Unverified';

                      const base =
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset';
                      const verifiedCls = 'bg-blue-50 text-blue-700 ring-blue-200';
                      const unverifiedCls = 'bg-amber-50 text-amber-800 ring-amber-200';

                      return (
                        <span className={`${base} ${verified ? verifiedCls : unverifiedCls}`}>
                          {verified ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 py-4">
              {BUSINESS_NAV_SECTIONS.map((section, idx) => {
                const items =
                  section.title === 'Account & Settings' ? getAccountItems() : section.items;
                return (
                  <div key={section.title}>
                    {idx > 0 && <Separator className="my-4" />}
                    <div className="px-4 mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {section.title}
                      </p>
                      <nav className="space-y-1">
                        {items.map((item) => (
                          <DrawerNavItem
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            isVerified={isVerified}
                            onNavigate={(href, requiresABN) => {
                              handleNavigation(href, requiresABN);
                            }}
                            onExternal={() => setOpen(false)}
                            verifyBadge={item.href === '/verify-business' && isVerified ? 'Verified' : undefined}
                            unreadMessageCount={item.href === '/messages' ? unreadMessageCount : undefined}
                            notificationsHasUnread={item.href === '/notifications' ? (notificationsHasUnread ?? false) : undefined}
                          />
                        ))}
                      </nav>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-200">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Log out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

interface DrawerNavItemProps {
  item: NavItemConfig;
  pathname: string;
  isVerified: boolean;
  onNavigate: (href: string, requiresABN?: boolean) => void;
  onExternal: () => void;
  verifyBadge?: string;
  unreadMessageCount?: number;
  notificationsHasUnread?: boolean;
}

function DrawerNavItem({
  item,
  pathname,
  isVerified,
  onNavigate,
  onExternal,
  verifyBadge,
  unreadMessageCount,
  notificationsHasUnread,
}: DrawerNavItemProps) {
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

  const handleClick = () => {
    if (item.isExternal) {
      window.location.href = item.href;
      onExternal();
      return;
    }
    onNavigate(item.href, item.requiresABN);
  };

  return (
    <DrawerMenuItem
      icon={Icon}
      label={item.label}
      onClick={handleClick}
      active={active}
      locked={locked}
      helperText={locked ? 'Verify ABN to unlock' : undefined}
      badge={verifyBadge}
      unreadMessageCount={unreadMessageCount}
      notificationsHasUnread={notificationsHasUnread}
    />
  );
}

interface DrawerMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  locked?: boolean;
  helperText?: string;
  badge?: string;
  unreadMessageCount?: number;
  notificationsHasUnread?: boolean;
}

function DrawerMenuItem({
  icon: Icon,
  label,
  onClick,
  active = false,
  locked = false,
  helperText,
  badge,
  unreadMessageCount = 0,
  notificationsHasUnread = false,
}: DrawerMenuItemProps) {
  const showMessageBadge = unreadMessageCount > 0;
  const badgeLabel = unreadMessageCount > 99 ? '99+' : String(unreadMessageCount);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
        active
          ? 'bg-blue-50 text-blue-600'
          : locked
          ? 'text-gray-400'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{label}</span>
          {locked && <Lock className="w-3.5 h-3.5 flex-shrink-0" />}
          {notificationsHasUnread && (
            <span
              className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"
              aria-hidden
            />
          )}
          {badge && (
            <span
              className="
                inline-flex items-center gap-1
                rounded-full px-2 py-0.5
                text-[11px] font-semibold
                bg-blue-50 text-blue-700
                ring-1 ring-inset ring-blue-200
              "
            >
              <CheckCircle2 className="w-3 h-3" />
              {badge}
            </span>
          )}
          {showMessageBadge && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full flex-shrink-0">
              {badgeLabel}
            </span>
          )}
        </div>
        {helperText && (
          <p className="text-xs text-gray-500 mt-0.5">{helperText}</p>
        )}
      </div>
    </button>
  );
}
