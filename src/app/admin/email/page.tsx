'use client';
// vim:ts=2

import { LoadingSpinner } from "@/components/loading-spinner";
import { getAxios } from "@/lib/utils";
import { toast } from "sonner";
import UserContext from "@/lib/user-context";
import UserProvider from "@/components/hoc/UserProvider";
import { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { Switch } from "@mui/material";
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
	Divider, 
	Container, 
	Grid, 
	CircularProgress, 
	Typography, 
	useTheme, 
	Paper, 
	Button,
	TextField,
	InputAdornment,
	FormControlLabel,
	Tooltip,
	Select,	
	FormControl,
	InputLabel,
	MenuItem
} from "@mui/material";
import { Search, Filter, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { safeRouterReplace } from '@/lib/safe-nav';
import { useAuth } from "@/lib/auth-context";

export default function AdminUsersPage() {

  const router = useRouter();
	const theme = useTheme();
	const { logout } = useAuth();
	const UserSession = useContext(UserContext);
	const [currentUser, setCurrentUser] = useState<any|null>(UserSession?.user ?? null);
  const [users, setUsers] = useState<any|null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [trades, setTrades] = useState<string[]>([]);
  const [pages, setPages] = useState<number>(0);
	const [page, setPage] = useState<number>(0);
	const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
	const [allUsers, setAllUsers] = useState<boolean>(false);
	const [template, setTemplate] = useState<string>("none");
	const [templates, setTemplates] = useState<string[]>(null);

  const hasRedirected = useRef(false);
	const isLoading = users === null || currentUser === null || templates === null;
	const isAdmin = currentUser?.role?.toLowerCase() === "admin";

	const sortOptions = [
    {value: "newest", label: "Newest first"},
    {value: "oldest", label: "Oldest first"},
    {value: "active", label: "Active"},
    {value: "inactive", label: "Inactive"},
    {value: "never", label: "Never logged in"},
	];

	useEffect(()=>{
		if(currentUser === null){
			return;
		}
		if(!isAdmin){
			return;
		}
		if(templates !== null){	
			return;
		}
		getAxios(null).get("/api/admin/email-templates").
			then((response_)=>{
				const data = response_.data;
				setTemplates(data.templates);
			}).catch((error_)=>{
				const msg = error_.response.data.msg ?? null;
				if(msg){
					toast.error(msg);
				}
			});
	}, [currentUser, templates]);

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
		const params = new URLSearchParams({
			sortBy,
			trade: tradeFilter,
			page,
			pageSize,
			searchTerm	
		});
		getAxios(null).get(`/api/admin/users?${params.toString()}`).
			then((response)=>{
				const data = response.data;
				setTrades(data.trades);
				setPages(data.pages);
				setTotal(data.total);
				setUsers(data.users.map((e,i)=>{ return  {...e, selected: false}}));
			}).catch((error)=>{
				const msg = error?.response?.data?.msg ?? null;
				if(msg){
					toast.error(msg);
				}
			});
		
  }, [sortBy, tradeFilter, currentUser, page, pageSize, searchTerm, users]);
		
	const onSelectAll = () => {
		setAllUsers(!allUsers);
		const users_ = users.map((e,i)=>{ e.selected = !allUsers; return e;});
		setUsers(users_);
	};
		
	const toggleSelected = (userId: string) => {
		const user_ = users.find((x)=>x.id === userId);
		if(!user_){
			toast.error("Could not find user!");
			return;
		}
		const copy = [...users];
		user_.selected = !user_.selected;
		setUsers(copy);
	};

	const handleSend = () => {
		const userIds = users.filter((x)=>x.selected).map((e,i)=>{ return e.id; });
		const payload = {
			allUsers,
			userIds
		};
		getAxios(null).post(`/api/admin/email-templates/${template}/send`, payload).
			then((response_)=>{
				const data = response_.data;
				const ok = data.ok;
				if(ok){
					const msg = data.msg;
					toast.success(msg);
				}
			}).catch((error_)=>{
				const msg = error_.response?.data?.msg ?? null;
				if(msg){
					toast.error(msg);
				}
			});
	};

	const handleTest = () => {
		getAxios(null).get(`/api/admin/email-templates/${template}/test`).
			then((response_)=>{
				const data = response_.data;
				const ok = data.ok;
				if(ok){
					toast.success("Email sent");
				}
			}).catch((error_)=>{
				const msg = error_.response?.data?.msg ?? null;
				if(msg){
					toast.error(msg);
				}
			});
	};

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
			<LoadingSpinner onUserLoaded={(user)=>{setCurrentUser(user);}}/>
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
	
	const pageButtons = [];
	for(let i = 0; i < pages; i++){
		const pageButton = (
			<Grid item key={`view_page_${i}`}>
				<Button disabled={page===i} color={"secondary"} variant={"contained"} sx={{minWidth:"40px"}} 
					size={"small"} onClick={()=>{setPage(i);setUsers(null);}}>
						{i+1}
				</Button>
			</Grid>
		);
		pageButtons.push(pageButton);
	}

  return (
		<Grid container>
		<Grid item size={12}>
    <div className="p-8">
			<UserProvider onUserLoaded={(user)=>{setCurrentUser(user);}}>
      	<PageHeader title="Email" description="Send mass emails to all users or selected users." />
      	{errorMsg && (
        	<Card className="p-4 mb-6 border border-red-200 bg-red-50">
          	<div className="flex items-start gap-3">
            	<AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            	<div className="text-sm text-red-700 whitespace-pre-wrap">{errorMsg}</div>
          	</div>
       	 </Card>
      	)}
      	<Card className="p-6 mb-6">
					<Grid container spacing={2} sx={{alignItems:"center"}}>
						<Grid item size={3}>
              <TextField
								size={"small"}
                placeholder="Search by name or email..."
                value={searchTerm}
								onChange={(e)=>{setSearchTerm(e.target.value);}}
                onBlur={(e)=>{setUsers(null);}}
								fullWidth
								slotProps={{input:{startAdornment:<InputAdornment position={"start"}><Search/></InputAdornment>}}}
              />
						</Grid>
						<Grid item size={2}>
							<FormControl fullWidth>
								<InputLabel>Sort by</InputLabel>
								<Select
                	value={sortBy}
                  onChange={(event)=>{setSortBy(event.target.value);setUsers(null);}}
                  select
                  size={"small"}
                  fullWidth
                  label={"Sort by"}
                  variant={"outlined"}
                  MenuProps={{disableScrollLock: true}}
								>
									{sortOptions.map((e,i)=>{
										return <MenuItem value={e.value} key={`sort_by_${i}`}>{e.label}</MenuItem>
									})}
								</Select>
							</FormControl>
						</Grid>
						<Grid item size={2}>
							<FormControl fullWidth>
								<InputLabel>Trade</InputLabel>
								<Select
                	value={tradeFilter}
                  onChange={(event)=>{setTradeFilter(event.target.value);setUsers(null);}}
                  select
                  size={"small"}
                  fullWidth
                  label={"Trade"}
                  variant={"outlined"}
                  MenuProps={{disableScrollLock: true}}
								>
                	<MenuItem value="all">All trades</MenuItem>
									{trades.map((e,i)=>{
										return <MenuItem value={e} key={`trade_${i}`}>{e}</MenuItem>
									})}
								</Select>
							</FormControl>
						</Grid>
						<Grid item size={2}>
							<FormControl fullWidth>
								<InputLabel>Template</InputLabel>
								<Select
                	value={template}
                  onChange={(event)=>{setTemplate(event.target.value);}}
                  select
                  size={"small"}
                  fullWidth
                  label={"Template"}
                  variant={"outlined"}
                  MenuProps={{disableScrollLock: true}}
								>
                	<MenuItem value="none">Select template...</MenuItem>
                	{templates.map((template_) => (
                  	<MenuItem key={template_} value={template_}>
                    	{template_}
                  	</MenuItem>
                	))}
								</Select>
							</FormControl>
						</Grid>
						<Grid item size={1}>
							<FormControlLabel control={<Tooltip title={"Select *all* users"}><Switch onChange={onSelectAll} checked={allUsers}/></Tooltip>} label={"All"} />
						</Grid>	
						<Grid item size={1}>
							<Tooltip title={"Send yourself a test email"}>
								<Button fullWidth size={"small"} color={"secondary"} variant={"contained"} onClick={handleTest}>Test</Button>
							</Tooltip>
						</Grid>	
						<Grid item size={1}>
							<Tooltip title={"Send email to user(s)"}>
								<Button fullWidth size={"small"} color={"primary"} variant={"contained"} onClick={handleSend}>Send</Button>
							</Tooltip>
						</Grid>	
					</Grid>
      	</Card>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Select</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="whitespace-nowrap text-center">
											<Switch onChange={()=>{toggleSelected(user.id);}} checked={user.selected} />
										</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`/api/profile/${user?.profile?.id}/avatar`} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium text-gray-900">{user.name || '—'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
											{user.email || '—'}
										</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
											{user.profile.premium ? "Premium" : "Free"}
										</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
											{user.business.primaryTrade}
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
		{/*END ROW*/}
		</Grid> 
		<Grid item size={12} sx={{pl:theme.spacing(4), pr:theme.spacing(4)}}>
			<Paper elevation={2} sx={{padding:theme.spacing(2)}}>
			<Grid container sx={{justifyContent:"flex-start", alignItems:"center"}} spacing={2}>
				<Grid item>
					<Typography variant={"body1"}>
						Viewing page {page+1} of {pages}
					</Typography>
				</Grid>	
				{pageButtons}
			</Grid>
			</Paper>
		</Grid>
		{/*END CONTAINER*/}
		</Grid>
  );
}
