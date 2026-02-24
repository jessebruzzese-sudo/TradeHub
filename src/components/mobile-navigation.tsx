'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { Chrome as Home, Briefcase, MessageSquare, Bell, Menu, X, User, FileText, Calendar, CirclePlus as PlusCircle, Lock, Settings, CircleHelp as HelpCircle, Shield, Eye, LogOut, CircleCheck as CheckCircle, CircleAlert as AlertCircle, CreditCard } from 'lucide-react';
import { getStore } from '@/lib/store';
import { MVP_FREE_MODE } from '@/lib/feature-flags';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const BOTTOM_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Notifications', href: '/notifications', icon: Bell },
];

export function MobileBottomNav() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const store = getStore();

  if (!currentUser || isAdmin(currentUser)) {
    return null;
  }

  const unreadCount = store.getUnreadConversationCount(currentUser.id);

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

  if (!currentUser || isAdmin(currentUser)) {
    return null;
  }

  const isVerified = currentUser.trustStatus === 'verified';
  const primaryTrade = currentUser.primaryTrade || 'No trade selected';

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
          <div className="flex flex-col h-full">
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg">
                  {(currentUser.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {currentUser.name || 'TradeHub user'}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {primaryTrade}
                  </p>
                  <div className="mt-2">
                    {isVerified ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        ABN Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 py-4">
              <div className="px-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Main Actions
                </p>
                <nav className="space-y-1">
                  <DrawerMenuItem
                    icon={Home}
                    label="Dashboard"
                    onClick={() => handleNavigation('/dashboard')}
                    active={pathname.startsWith('/dashboard')}
                  />
                  <DrawerMenuItem
                    icon={Briefcase}
                    label="Browse Jobs"
                    onClick={() => handleNavigation('/jobs')}
                    active={pathname.startsWith('/jobs')}
                  />
                  <DrawerMenuItem
                    icon={Calendar}
                    label="List Availability"
                    onClick={() => handleNavigation('/profile/availability')}
                    active={pathname.startsWith('/profile/availability')}
                  />
                  <DrawerMenuItem
                    icon={PlusCircle}
                    label="Post a Job"
                    onClick={() => handleNavigation('/jobs/create', true)}
                    active={pathname === '/jobs/create'}
                    locked={!isVerified}
                    helperText={!isVerified ? 'Verify ABN to unlock' : undefined}
                  />
                  <DrawerMenuItem
                    icon={FileText}
                    label="Tenders"
                    onClick={() => handleNavigation('/tenders', true)}
                    active={pathname.startsWith('/tenders')}
                    locked={!isVerified}
                    helperText={!isVerified ? 'Verify ABN to unlock' : undefined}
                  />
                </nav>
              </div>

              <Separator className="my-4" />

              <div className="px-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Account & Settings
                </p>
                <nav className="space-y-1">
                  <DrawerMenuItem
                    icon={User}
                    label="Profile"
                    onClick={() => handleNavigation('/profile')}
                    active={pathname.startsWith('/profile') && pathname !== '/profile/availability'}
                  />
                  <DrawerMenuItem
                    icon={Shield}
                    label="Verify Business (ABN)"
                    onClick={() => handleNavigation('/verify-business')}
                    active={pathname === '/verify-business'}
                    badge={isVerified ? 'Verified' : undefined}
                  />
                  {!MVP_FREE_MODE && (
                    <DrawerMenuItem
                      icon={CreditCard}
                      label="Pricing / Upgrade"
                      onClick={() => handleNavigation('/pricing')}
                      active={pathname === '/pricing'}
                    />
                  )}
                  <DrawerMenuItem
                    icon={Settings}
                    label="Settings"
                    onClick={() => handleNavigation('/profile/edit')}
                    active={pathname === '/profile/edit'}
                  />
                </nav>
              </div>

              <Separator className="my-4" />

              <div className="px-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Support & Legal
                </p>
                <nav className="space-y-1">
                  <DrawerMenuItem
                    icon={HelpCircle}
                    label="Help / Support"
                    onClick={() => handleNavigation('/messages?support=true')}
                  />
                  <DrawerMenuItem
                    icon={FileText}
                    label="Terms of Service"
                    onClick={() => handleNavigation('/terms')}
                  />
                  <DrawerMenuItem
                    icon={Eye}
                    label="Privacy Policy"
                    onClick={() => handleNavigation('/privacy')}
                  />
                </nav>
              </div>
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

interface DrawerMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  locked?: boolean;
  helperText?: string;
  badge?: string;
}

function DrawerMenuItem({
  icon: Icon,
  label,
  onClick,
  active = false,
  locked = false,
  helperText,
  badge,
}: DrawerMenuItemProps) {
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
          {badge && (
            <Badge variant="secondary" className="text-xs py-0 h-5">
              {badge}
            </Badge>
          )}
        </div>
        {helperText && (
          <p className="text-xs text-gray-500 mt-0.5">{helperText}</p>
        )}
      </div>
    </button>
  );
}
