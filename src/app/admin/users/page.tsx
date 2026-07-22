'use client';

import { getAxios } from "@/lib/utils";
import { toast } from "sonner";
import UserContext from "@/lib/user-context";
import UserProvider from "@/components/hoc/UserProvider";
import { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Container, Grid, CircularProgress } from "@mui/material";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { safeRouterReplace } from '@/lib/safe-nav';
import { useAuth } from "@/lib/auth-context";

export default function AdminUsersPage() {

  const router = useRouter();
	const { logout } = useAuth();
	const UserSession = useContext(UserContext);
	const [currentUser, setCurrentUser] = useState<any|null>(UserSession?.user ?? null);
  const [users, setUsers] = useState<any|null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountTypeFilter>('all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [trades, setTrades] = useState<string[]>([]);

  const hasRedirected = useRef(false);
	const isLoading = users === null || currentUser === null;
	const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  useEffect(() => {
		if(currentUser === null){
			return;
		}
		if(!isAdmin){
			return;
		}
		if(users !== null){	
			return;
		}
		// TODO grab users
		// include parameters
		toast.info("Loading users ...");
      const params = new URLSearchParams({
        sortBy,
        trade: tradeFilter,
        accountType: accountTypeFilter,
      });
		getAxios(null).get(`/api/admin/users?${params.toString()}`).
			then((response)=>{
				const data = response.data;
				setTrades(data.trades);
				setUsers(data.users);
			}).catch((error)=>{
				const msg = error?.response?.data?.msg ?? null;
				if(msg){
					toast.error(msg);
				}
			});
		
  }, [sortBy, tradeFilter, accountTypeFilter, currentUser]);

  const getOnlineStatus = (lastSeenAt?: string) => {
    if (!lastSeenAt) return 'Never';
    const lastSeen = new Date(lastSeenAt);
    const diffMinutes = (Date.now() - lastSeen.getTime()) / (1000 * 60);
    if (diffMinutes <= 2) return 'Online now';
    return formatDistanceToNow(lastSeen, { addSuffix: true });
  };

  const getInitials = (name: string) =>
    (name || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
	
	if(isLoading){
		return (
			<Grid container sx={{alignItems:"center", height:"100%"}}>
				<Grid item size={12}>
					<Grid container sx={{justifyContent:"center"}}>	
						<Grid item>
							<UserProvider onUserLoaded={(user)=>{setCurrentUser(user);}}>
								<CircularProgress aria-label="Loading..."/>
							</UserProvider>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
		);	
	}
		
	if(!isAdmin){
		logout().then((response)=>{
				window.location.href = "/";
			}).catch((error)=>{
				window.location.href = "/";
			});
		return null;
	}

  return (
    <div className="p-8">
			<UserProvider onUserLoaded={(user)=>{setCurrentUser(user);}}>
      <PageHeader title="Users" description="Manage user accounts and permissions" />

      {errorMsg && (
        <Card className="p-4 mb-6 border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-700 whitespace-pre-wrap">{errorMsg}</div>
          </div>
        </Card>
      )}

      <Card className="p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="online">Online now</SelectItem>
                <SelectItem value="today">Active today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="inactive">Inactive 30+ days</SelectItem>
                <SelectItem value="never">Never logged in</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                {trades.map((trade) => (
                  <SelectItem key={trade} value={trade}>
                    {trade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={accountTypeFilter} onValueChange={(value) => setAccountTypeFilter(value as AccountTypeFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                <SelectItem value="real">Real only</SelectItem>
                <SelectItem value="qa">QA/Test only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Online</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar ?? undefined} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium text-gray-900">{user.name || '—'}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email || '—'}</td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="capitalize">
                        {user.role || '—'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.accountType === 'qa' ? 'secondary' : 'default'} className="uppercase">
                        {user.accountType === 'qa' ? 'QA/Test' : 'Real'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.primaryTrade || '-'}</td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={user.trustStatus === 'verified' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {user.trustStatus}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getOnlineStatus(user.lastSeenAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && !errorMsg && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm.trim() ? 'No users match your search' : 'No users found'}
            </div>
          )}

          {users.length === 0 && errorMsg && (
            <div className="text-center py-12 text-red-500">
              Failed to load users — see error above
            </div>
          )}

        </Card>
		</UserProvider>
    </div>
  );
}
