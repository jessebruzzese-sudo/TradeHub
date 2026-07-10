// @ts-nocheck
// vim: ts=2
'use client';
import Link from 'next/link';
import UserContext from "@/lib/user-context";
import { toast } from "sonner";
import { 
	MenuItem, Container, 
	Grid, Button, Typography, 
	Box, Chip, TextField, 
	IconButton, Switch 
} from "@mui/material";
import { ArrowBack, People, PersonOutlined, CalendarTodayOutlined }  from "@mui/icons-material";
import { getAxios } from "@/lib/utils";
import { useEffect, useMemo, useState, useContext } from 'react';
import { redirect } from "next/navigation";
import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { PremiumUpsellBar } from '@/components/premium-upsell-bar';
import { useAuth } from '@/lib/auth';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { getTradeIcon } from '@/lib/trade-icons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { primaryButtonClass } from '@/components/ui/primary-button';
import { Search, Lightbulb, Users, ArrowLeft, MapPin, BadgeCheck, Crown, ArrowRight, Calendar } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { useActiveTradesCatalog } from '@/lib/trades/use-active-trades-catalog';
import { cn } from '@/lib/utils';
import { getPublicProfileHref } from '@/lib/url-utils';
import { format } from 'date-fns';

/** Display order for empty-state chips; labels must exist in `public.trades` / `/api/trades`. */
const POPULAR_TRADE_ORDER = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Concreting',
  'Painting & Decorating',
] as const;

const SORT_OPTIONS = [
  { value: 'distance-closest', label: 'Distance: Closest' },
  { value: 'distance-furthest', label: 'Distance: Furthest' },
  { value: 'price-highest', label: 'Price: Highest' },
  { value: 'price-lowest', label: 'Price: Lowest' },
  { value: 'rating-highest', label: 'Rating: Highest' },
  { value: 'rating-lowest', label: 'Rating: Lowest' },
] as const;

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'abn-verified', label: 'ABN verified only' },
] as const;

function SubcontractorCard({ sub }: { sub: any }) {
  const primaryTrade = sub?.business?.primaryTrade ?? null;
  const TradeIcon = primaryTrade ? getTradeIcon(primaryTrade) : null;
  const displayName = sub?.visibleName ?? sub?.name;
  const premium = sub?.profile?.premium ?? false;
  return (
    <Grid item size={12}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 transition-all duration-200",
        premium
          ? "bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30 border-amber-200/70 shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_10px_30px_rgba(245,158,11,0.10)] hover:-translate-y-[2px] hover:shadow-[0_0_0_1px_rgba(251,191,36,0.14),0_16px_40px_rgba(245,158,11,0.14)]"
          : "bg-white border-slate-200 shadow-sm hover:shadow-md"
      )}
    >
      {premium && (
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-amber-200/20 blur-2xl" aria-hidden />
      )}
      {premium && (
        <div className="pointer-events-none absolute left-0 top-0 h-full w-[5px] rounded-l-xl bg-gradient-to-b from-amber-400 via-orange-400 to-amber-500" />
      )}
      {premium && (
        <span
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden
        >
          <span
            className="premium-shimmer-band absolute top-0 left-[-30%] h-full w-[35%] bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ transform: 'translateX(-140%) skewX(-18deg)' }}
          />
        </span>
      )}
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <UserAvatar
            avatarUrl={`/api/profile/${sub?.profile?.id}/avatar`}
            userName={displayName}
            size="lg"
            className="h-12 w-12 shrink-0 ring-2 ring-slate-100"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cn(premium ? "font-bold text-slate-950" : "font-semibold text-slate-900")}>
                {displayName}
              </h3>
              {sub?.business?.abnVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  ABN verified
                </span>
              )}
              {premium && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-[3px] text-xs font-medium text-amber-700">
                  <Crown className="h-3.5 w-3.5 shrink-0" />
                  Premium
                </span>
              )}
            </div>
            {premium && (
              <p className="mt-0.5 text-[11px] text-amber-600/80 hidden sm:block">
                Priority profile
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              {TradeIcon ? <TradeIcon className="h-4 w-4 text-blue-600" /> : null}
              <span>{primaryTrade ?? 'Trade professional'}</span>
            </div>
            {sub?.business?.location && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="h-4 w-4 flex-shrink-0 text-sky-600" />
                {sub?.business?.location}
              </div>
            )}
          </div>
        </div>
        <Link href={getPublicProfileHref(sub?.id)} className="shrink-0">
          <Button
            size="sm"
            variant="outline"
            className={cn("gap-2", premium && "shadow-sm hover:shadow border-slate-200")}
          >
            View profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Grid>
  );
}

export default function SubcontractorsPage() {

  const { jwt } = useAuth();
	const UserSession = useContext(UserContext);
	const [currentUser, setCurrentUser] = useState(UserSession?.user ?? null);
  const [nameQuery, setNameQuery] = useState<string>("");
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('distance-closest');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [availLoading, setAvailLoading] = useState(true);
	const [includeAvailable, setIncludeAvailable] = useState<boolean>(false);
  const [nextAvailable, setNextAvailable] = useState<Date | null>(null);
  const [profiles, setProfiles] = useState<ProfileCard[]>(null);
  const [profilesError, setProfilesError] = useState<string | null>(null);

	const isLoading = profiles === null;
	const hasSession = jwt !== undefined && jwt !== null;

  const nextAvailableLabel = useMemo(() => {
    if (!nextAvailable) return null;
    return format(nextAvailable, 'EEE d MMM');
  }, [nextAvailable]);

  const isPremium = currentUser?.profile?.premium ?? false;
  const primaryTrade = currentUser?.business?.primaryTrade ?? null;

  // Free users: locked to primary trade only. Premium: can browse across trades.
  const effectiveTrade = isPremium ? selectedTrade : ( primaryTrade || 'all' );
  const tradeDisplayValue = isPremium ? selectedTrade : ( primaryTrade || 'All Trades' );
  const TradeIcon = getTradeIcon(primaryTrade || undefined);

	const tradeOptions = [
		{value:"all", label:"All Trades"}, 
		{value:primaryTrade, label:primaryTrade}
	];
	const sortOptions = [
		{value:"distance-closest", label:"Distance: Closest"},
		{value:"distance-furthest", label:"Distance: Furthest"},
		{value:"price-highest", label:"Price: Highest"},
		{value:"price-lowest", label:"Price: Lowest"},
		{value:"rating-highest", label:"Rating: Highest"},
		{value:"rating-lowest", label:"Rating: Lowest"}
	];
	const verificationOptions = [
		{value:"all", label:"All"},
		{value:"abn-verified-only", label:"ABN Verified Only"},
	];

  // `/api/discovery/trade/*` returns only users with active listed availability (subcontractor_availability, today+), not every public profile.
  useEffect(() => {
		if(!isLoading){
			return;
		}
		if(profiles !== null){
			return;
		}
    setProfilesError(null);
		// move filtering logic and sorting into server side
		// along with pagination
		const params = `sortBy=${sortBy}&filterBy=${filterBy}&nameQuery=${searchQuery}`;
		getAxios(null).get(`/api/discovery/trades/${encodeURIComponent(effectiveTrade)}?${params}`).
			then((response)=>{
				const data = response.data;
				setProfiles(data.matches);
			}).catch((error)=>{
				setProfiles([]);
				setProfilesError("Failed to load profiles");
			});
  }, [profiles]);

  if (!hasSession) {
		redirect("/login");
		return;
  }
		
	const profileCards = (profiles ?? []).map((e,i)=>{return <SubcontractorCard key={e.id} sub={e}/>});

  return (
    <TradeGate>
      <AppLayout>
				<Container fluid maxWidth>
				<Grid container sx={{mt:2}}>
					{/* LEFT MARGIN */}
					<Grid item size={2}/>
					{/* CENTER COLUMN */}
					<Grid item size={8}>
						<Grid container spacing={2}>
							{/* back button */}
							<Grid item size={12}>
								<Button variant={"outlined"} size={"lg"}><ArrowBack/>Back to Dashboard</Button>
							</Grid>
							{/* header, primary and secondary header */}
							<Grid item size={12}>
								<Grid container>
									{/* CENTER LHS */}
									<Grid item size={6}>
										<Grid container spacing={1}>
											{/* Icon and primary header */}
											<Grid item size={12}>
												<Grid container spacing={1}>
													<Grid item size={1} sx={{ textAlign:"center"}}>
														<Box sx={{backgroundColor:"white", borderRadius:"10px", border:"1px solid #EFEFEF", height:"100%"}}>
															<PersonOutlined sx={{color:"black", height:"100%"}}/>	
														</Box>
													</Grid>
													<Grid item size={11}>
														<Typography variant={"h5"} sx={{fontFamily:"Inter"}}>Find Subcontractors</Typography>
													</Grid>
												</Grid>
											</Grid>
											{/* secondary header text*/}	
											<Grid item xs={12}>
												<Typography variant={"body2"}>
													Subcontractors who have listed availability - browse by trade and connect.
												</Typography>
											</Grid>
										</Grid>
									</Grid>
									{/*CENTER RHS*/}
									<Grid item size={6}>
										<Grid container spacing={1} sx={{textAlign:"right"}}>
											<Grid item size={12}>
												<Chip color={"primary"} label={"Available Mon 15 Jun"}/>
											</Grid>
											<Grid item size={12}>
												<Button color={"primary"} 	
														size={"md"} variant={"contained"} 
														onClick={()=>{toast.info("coming soon");}}>
													Update Availability
												</Button>
											</Grid>
										</Grid>
									</Grid>
								</Grid>
							</Grid>
							{/* END HEADER SECTION */}
							{/* NEW ROW FOR FORM */}
							<Grid item size={12} sx={{backgroundColor:"white", border:"1px solid #EFEFEF", padding:"30px", borderRadius:"15px"}}>
								{/* container wrapping rows in center column */}
								<Grid container spacing={1}>	
								<Grid item size={12}>
								{/* FORM CONTAINER */}
								<Grid container spacing={1}>
									<Grid item size={3}>
										<TextField 
											value={nameQuery} 
											onChange={(event)=>{setNameQuery(event.target.value);}}
											size={"small"}
											onBlur={()=>{setProfiles(null);}}
											fullWidth	
											placeholder={"Search by name..."}
											variant={"outlined"}
										/>
									</Grid>
									<Grid item size={2}>
										<TextField 
												value={selectedTrade} 
												onChange={(event)=>{setSelectedTrade(event.target.value);}} 	
												select 
												size={"small"} 	
												fullWidth
												variant={"outlined"}
											>
											{tradeOptions.map((e,i)=>{
												return <MenuItem value={e.value} key={`trade_${i}`}>{e.label}</MenuItem>
											})}	
										</TextField>
									</Grid>
									<Grid item size={3}>
										<TextField 
												value={sortBy} 
												onChange={(event)=>{setSortBy(event.target.value);}} 	
												select 
												size={"small"} 	
												fullWidth
												variant={"outlined"}
											>
											{sortOptions.map((e,i)=>{
												return <MenuItem value={e.value} key={`trade_${i}`}>{e.label}</MenuItem>
											})}	
										</TextField>
									</Grid>
									<Grid item size={2}>
										<TextField 
												value={filterBy} 
												onChange={(event)=>{setFilterBy(event.target.value);}} 	
												select 
												size={"small"} 	
												fullWidth
												variant={"outlined"}
											>
											{verificationOptions.map((e,i)=>{
												return <MenuItem value={e.value} key={`trade_${i}`}>{e.label}</MenuItem>
											})}	
										</TextField>
									</Grid>
									<Grid item size={2}>
										<Button fullWidth variant={"contained"}>
											<CalendarTodayOutlined/><span style={{marginLeft:"5px"}}>Update</span>
										</Button>
									</Grid>
								</Grid>
								{/* END FORM CONTAINER */}
								</Grid>
								{/* END FORM WRAPPER ITEM */}
								<Grid item size={12}>
									<Typography variant={"body2"}>
									<Switch checked={includeAvailable} onChange={()=>{setIncludeAvailable(!includeAvailable);}}/>
									Only show profiles with upcoming availability
									</Typography>
								</Grid>
								{/* END SWITCH ROW */}
								{/* START RESULTS ROW */}
								<Grid item size={12}>
									<Grid container spacing={2}>
										{/* START RESULTS CARDS */}
										{( profiles?.length ?? 0 ) > 0 ? 
											<Grid item size={12}>
												<Typography variant={"body2"}>
													Showing subcontractors in your trade: <b>{tradeDisplayValue}</b>
												</Typography>
											</Grid>
										: 
											<Grid item size={12}>
												<Typography variant={"body2"}>
													No results could be found, please try changing your filters.
												</Typography>
											</Grid>
										}
										{profileCards}
										{/* END RESULTS CARDS */}
									</Grid>
								</Grid>
								{/* END RESULTS ROW */}
								</Grid>
							</Grid>
							{/* END ROW HOUSING FILTERS */}
						</Grid>
						{/* END CONTAINER FOR CENTER */}
					</Grid>
					{/* END CENTER COLUMN */}
					{/* RIGHT MARGIN */}
					<Grid item size={2}/>
				</Grid>
				</Container>
      </AppLayout>
    </TradeGate>
  );
}
