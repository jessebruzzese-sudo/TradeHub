'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AppLayout } from '@/components/app-nav';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';


import {
  Users,
  ShieldCheck,
  FileText,
  TrendingUp,
  MessageSquare,
  DollarSign,
  TestTube,
  AlertCircle,
  LogOut,
} from 'lucide-react';

type AdminStats = {
  totalUsers: number;
  pendingVerifications: number;
  activeJobs: number;
  totalJobs: number;
  generatedAt: string;
};

export default function AdminPage() {
  const { currentUser, logout } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdminUser = isAdmin(currentUser);

  useEffect(() => {
    if (!isAdminUser) return;

    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
        const data = (await res.json()) as AdminStats;
        if (alive) setStats(data);
      } catch (err) {
        console.error('Failed to load admin stats', err);
        if (alive) setStats(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAdminUser]);

  if (!currentUser || !isAdminUser) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  const stat = (value?: number) => (typeof value === 'number' ? value : '—');

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users, verifications, and platform settings</p>
          </div>

          <Button variant="outline" onClick={logout} className="hidden gap-2 md:flex">
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>

        {/* Metrics */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Metric icon={Users} label="Total Users" value={stat(stats?.totalUsers)} />
          <Metric
            icon={ShieldCheck}
            label="Pending Verifications"
            value={stat(stats?.pendingVerifications)}
          />
          <Metric icon={FileText} label="Active Jobs" value={stat(stats?.activeJobs)} />
          <Metric icon={TrendingUp} label="Total Jobs" value={stat(stats?.totalJobs)} />
          <Metric
            icon={MessageSquare}
            label="Pending Reviews"
            value={loading ? '—' : '—'}
            muted
          />
          <Metric
            icon={AlertCircle}
            label="Account Reviews"
            value={loading ? '—' : '—'}
            muted
          />
        </div>

        {/* Admin Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AdminCard href="/admin/users" icon={Users} title="Users" />
          <AdminCard href="/admin/verifications" icon={ShieldCheck} title="Verifications" />
          <AdminCard href="/admin/jobs" icon={FileText} title="Jobs" />
          <AdminCard href="/admin/tenders" icon={FileText} title="Tenders" />
          <AdminCard href="/admin/reviews" icon={MessageSquare} title="Reviews" />
          <AdminCard href="/admin/audit-log" icon={ShieldCheck} title="Audit Log" />
          <AdminCard href="/admin/qa-setup" icon={TestTube} title="QA Setup" />
          <AdminCard disabled icon={DollarSign} title="Billing" subtitle="Coming soon" />
        </div>
      </div>
    </AppLayout>
  );
}

/* ---------- helpers ---------- */

type IconType = React.ComponentType<{ className?: string }>;

function Metric({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: IconType;
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${muted ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-600" />
        <div className="min-w-0">
          <div className="text-xl font-bold text-gray-900">{value}</div>
          <div className="truncate text-sm text-gray-600">{label}</div>
        </div>
      </div>
    </div>
  );
}

function AdminCard({
  href,
  icon: Icon,
  title,
  subtitle,
  disabled = false,
}: {
  href?: string;
  icon: IconType;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`rounded-xl border bg-white p-6 transition ${
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md'
      }`}
    >
      <div className="mb-3 flex items-center gap-4">
        <Icon className="h-6 w-6 text-gray-700" />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        </div>
      </div>

      {!disabled ? (
        <Button variant="outline" className="mt-2">
          Open
        </Button>
      ) : null}
    </div>
  );

  if (disabled || !href) return content;
  return <Link href={href}>{content}</Link>;
}
