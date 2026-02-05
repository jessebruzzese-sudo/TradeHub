'use client';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, Users, CheckCircle, FileText, Settings, AlertTriangle, Home, MessageSquare, Menu } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UnauthorizedAccess } from '@/components/unauthorized-access';

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const pathname = usePathname();
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo="/dashboard" message="You do not have permission to access the admin panel." />;
  }

  const primaryNavItems = [
    { href: '/admin', icon: Home, label: 'Home' },
    { href: '/admin/account-reviews', icon: AlertTriangle, label: 'Reviews' },
    { href: '/admin/verifications', icon: CheckCircle, label: 'Verifications' },
    { href: '/admin/users', icon: Users, label: 'Users' },
  ];

  const overflowNavItems = [
    { href: '/admin/tenders', icon: FileText, label: 'Tenders' },
    { href: '/admin/jobs', icon: MessageSquare, label: 'Jobs' },
    { href: '/admin/audit-log', icon: FileText, label: 'Audit Log' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const allNavItems = [...primaryNavItems, ...overflowNavItems];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="hidden md:block w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 text-red-600">
              <Shield className="h-6 w-6" />
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {allNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-red-50 text-red-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {primaryNavItems.slice(0, 3).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}

          <Sheet open={overflowMenuOpen} onOpenChange={setOverflowMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-gray-600">
                <Menu className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Admin Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-4">
                <ul className="space-y-2">
                  {[primaryNavItems[3], ...overflowNavItems].map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOverflowMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-red-50 text-red-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
