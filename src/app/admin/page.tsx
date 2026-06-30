// vim: ts=2
'use client';

import Link from 'next/link';
import { getAxios } from "@/lib/utils";
import UserContext from "@/lib/user-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useContext } from 'react';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

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
  const { jwt, logout } = useAuth();
	const router = useRouter();
	const UserSession = useContext(UserContext);
	const [currentUser, setCurrentUser] = useState<any|null>(UserSession?.user ?? null);
	const [stats, setStats] = useState<any|null>(null);
	const hasSession = jwt !== undefined && jwt !== null;
  const isAdminUser = currentUser?.role?.toLowerCase() === "admin";
	const isLoading = currentUser === null || stats === null;

  useEffect(() => {
		if(currentUser !== null){
			return;
		}
		getAxios(null).get("/api/me").
			then((response_)=>{
				const data = response_.data;
				UserSession.user = data;
				setCurrentUser(data);
			}).catch((err_)=>{
				const msg = err_?.response?.data?.error ?? null;
				console.error(err_);
				if(msg){
					toast.error("Could not load user");
				}
			});
  }, [currentUser]);
	
	useEffect(()=>{
		if(currentUser === null){
			return;
		}
		if(stats !== null){
			return;
		}
		getAxios(null).get("/api/admin/stats").
			then((response_)=>{
				const data =  response_.data;
				setStats(data);
			}).catch((err_)=>{
				toast.error("Could not load stats");
			});
	}, [currentUser, stats]);
	
	if(isLoading){
    return (
      <>
        <div className="relative min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>          
      </>     
    );          
	}

  if (!hasSession || !isAdminUser) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  const stat = (value?: number) => (typeof value === 'number' ? value : '—');

  return (
    <>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users, verifications, and platform settings</p>
          </div>

          <Button variant="outline" onClick={()=>{logout();}} className="hidden gap-2 md:flex">
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
          <Metric icon={FileText} label="Confirmed Jobs" value={stat(stats?.confirmedJobs)} />
          <Metric icon={FileText} label="Accepted Jobs" value={stat(stats?.acceptedJobs)} />
          <Metric icon={FileText} label="Open Jobs" value={stat(stats?.openJobs)} />
          <Metric icon={FileText} label="Closed Jobs" value={stat(stats?.closedJobs)} />
          <Metric icon={TrendingUp} label="Total Jobs" value={stat(stats?.totalJobs)} />
          <Metric
            icon={MessageSquare}
            label="Pending Reviews"
            value={isLoading ? '—' : '—'}
            muted
          />
          <Metric
            icon={AlertCircle}
            label="Account Reviews"
            value={isLoading ? '—' : '—'}
            muted
          />
        </div>

        {/* Admin Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AdminCard href="/admin/users" icon={Users} title="Users" />
          <AdminCard href="/admin/verifications" icon={ShieldCheck} title="Verifications" />
          <AdminCard href="/admin/jobs" icon={FileText} title="Jobs" />
          <AdminCard href="/admin/reviews" icon={MessageSquare} title="Reviews" />
          <AdminCard href="/admin/audit-log" icon={ShieldCheck} title="Audit Log" />
          <AdminCard href="/admin/qa-setup" icon={TestTube} title="QA Setup" />
          <AdminCard disabled icon={DollarSign} title="Billing" subtitle="Coming soon" />
        </div>
      </div>
    </>
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
