'use client';
// vim: ts=2
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormControlLabel, Button, Stack, Dialog, DialogContent, DialogTitle, DialogActions, Typography, Grid, useMediaQuery, TextField, FormControl, InputLabel, OutlinedInput, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Link from 'next/link';
import Image from 'next/image';
import { AppLayout } from '@/components/app-nav';
import { MapPin, Users, MessageSquare, ArrowRight } from 'lucide-react';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';
import { toast } from "sonner";
import { isAdmin } from '@/lib/is-admin';

const StoryFooter = (props) => {
	return (
		<Grid container>
			<Grid item size={12} sx={{borderTop:"1px solid #314159", pt:"22px"}}>
				<Typography sx={{fontSize:"11px", color:"#93a6bf", letterSpacing:"0.4px",textTransform:"uppercase"}}>
					{props.text}
				</Typography>
			</Grid>
		</Grid>
	);
};

const Benefit = (props) => {
	const secondary = props?.secondary ?? null;
	return (
		<Grid item size={12}>
			<Grid container spacing={1}>
				<Grid item size={12}>
					<Grid container sx={{justifyContent:"flex-start", alignItems:"baseline"}} spacing={2}>
						<Grid item>
							{props.icon}
						</Grid>
						<Grid item>
							<Grid container>
								<Grid item size={12}>
									<strong style={{color:"white", fontSize:"14px", fontWeight:"550"}}>
										{props.primary}
									</strong>
								</Grid>
								{secondary && (
									<Grid item size={12}>
										<small style={{fontSize:"12px", lineHeight:"1.5", color:"#b6c5d8"}}>
											{secondary}
										</small>
									</Grid>
								)}
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
		</Grid>
	);
};

const StoryHeader = (props) => {
	return (
		<Typography variant={"h1"}>
			<>
			{props.primary}
			<span style={{color:"#93baff"}}>{props.secondary}</span>
			</>
		</Typography>
	);
};

const EyeBrow = (props) => {
	return (
		<Typography sx={{fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#aebed2", fontWeight:"600"}}>{props.text}</Typography>
	);
};

function getFriendlyLoginError(error: any): string {
  if (!error) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  const errorMessage = (error?.message || '').toLowerCase();
  const errorCode = error?.code || error?.status || '';
  // Invalid credentials
  if (
    errorMessage.includes('invalid login') ||
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('email not confirmed') ||
    errorMessage.includes('wrong password') ||
    errorCode === 'invalid_credentials' ||
    errorCode === 'invalid_grant'
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  // Network/connection errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorCode === 'network_error'
  ) {
    return 'Network error. Please check your connection and try again.';
  }
  // Rate limiting
  if (
    errorMessage.includes('too many requests') ||
    errorMessage.includes('rate limit') ||
    errorCode === 'too_many_requests'
  ) {
    return 'Too many login attempts. Please wait a moment and try again.';
  }
  // Default fallback
  return 'Invalid username and/or password';
}

export default function LoginPage() {

	const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
	const [activateOpen, setActivateOpen] = useState<boolean>(true);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get("returnUrl");
	const activate = searchParams.get("activate");

	const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
			setIsLoading(true);
    	const token = await login(email, password);
			const defaultUrl = await isAdmin(token) ? '/admin' : '/dashboard';
			const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);
			safeRouterReplace(router, safeReturnUrl);
    } catch (err: any) {
			const msg = err?.response?.data?.error ?? null;
			setIsLoading(false);
      setError(msg);
    }
  };

  if (isLoading) {
    return (
        <div className="relative min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        	<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }
	
	let activateDialog = null;
	if(activate === "1"){
		activateDialog = (
			<Dialog open={activateOpen} onClose={()=>{setActivateOpen(false);}}>
				<DialogTitle sx={{textAlign:"center"}}>
					<Typography sx={{fontFamily:"inter", fontWeight:"400", fontSize:"1.5rem"}}>
						Activation Required
					</Typography>
				</DialogTitle>
				<DialogContent sx={{textAlign:"center", fontFamily:"inter"}}>
					<Typography>
						An activation email has been sent to your inbox. <br/>Please activate your account before logging in.	
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={()=>{setActivateOpen(false);}}>OK</Button>
				</DialogActions>
			</Dialog>
		);
	}
	
	const emailField = (
		<TextField
			placeholder={"you@business.com.au"} 
			value={email} 
			onChange={(event)=>{setEmail(event.target.value);}} 
			variant={"outlined"}
			fullWidth
		/>
	);

	const passwordField = (
		<TextField
			placeholder={"Enter your password"} 
			value={password} 
			type={"password"}
			onChange={(event)=>{setPassword(event.target.value);}} 
			variant={"outlined"}
			fullWidth
		/>
	);

  return (
		<Grid container sx={{padding:"1rem",backgroundColor:"white"}}>
			<Grid item size={12} id={"header"}>
				<Grid container id={"header-container"} sx={{pt:"23px", pb:"23px", pl:"34px", pr:"34px", backgroundColor:"inherit", borderBottom:"1px solid #dce3ed"}}>
					<Grid item size={6} id={"header-lhs"}>
						<Grid container sx={{justifyContent:"flex-start", alignItems:"center"}}>
							<Grid item id={"logo"}>
								<Image src={"new-design-logo.svg"} width={260} height={50} alt={"TradeHub - Connecting trades, simply"}/>
							</Grid>
						</Grid>
					</Grid>
					<Grid item size={6} id={"header-rhs"}>
						<Grid container sx={{justifyContent:"flex-end", alignItems:"center", height:"100%"}}>
							<Grid item id={"tagline"}>
								<Typography variant={"body2"}>Built for Australia's trade community</Typography>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
			<Grid item size={12} id={"content"}>
				<Grid container id={"content-container"} sx={{minHeight:"600px"}}>
					<Grid item size={6} id={"content-lhs"} 
							sx={{pt:"60px", pl:"42px", pr:"42px", pb:"32px", 
							background:"linear-gradient(110deg,#000767 0%,#07348b 55%,#0068b5 100%)",
							borderRadius:"0px 0px 0px 16px"}}>
						<Grid container spacing={2.8} id={"content-lhs-container"}>
							<Grid item size={12}>
								<EyeBrow text={"good connections. better business."}/>
							</Grid>
							<Grid item size={12}>
								<Stack>
									<StoryHeader primary={"Find "} secondary={"work."}/>
									<StoryHeader primary={"Find "} secondary={"workers."}/>
									<StoryHeader primary={"Connect "} secondary={"directly."}/>
								</Stack>
							</Grid>
							<Grid item size={12}>
								<Typography variant={"intro"}>
									Connect with local trades, discover opportunities<br/>and keep your work moving.
								</Typography>
							</Grid>
							<Grid item size={12} id={"benefits"}>
								<Grid container spacing={2.5}>
									<Benefit primary={"Find work closer to home"} 
										secondary={"Discover opportunities in your area."} icon={<MapPin style={{width:"16px", height:"16px", color:"#93baff"}}/>} />
									<Benefit primary={"Vast employee and subcontractor sharing network"} 
										secondary={"Never have downtime or be overloaded."} icon={<Users style={{width:"16px", height:"16px", color:"#93baff"}}/>} />
									<Benefit primary={"Verified trades and workers"} icon={<MessageSquare style={{width:"16px", height:"16px", color:"#93baff"}}/>} />
								</Grid>
							</Grid>
							<Grid item size={12} id={"gap"} sx={{height:"44px"}}>
							</Grid>
							<Grid item size={12} id={"story-footer"}>
								<StoryFooter text={"local work. lasting connections."}/>
							</Grid>
						</Grid>
					</Grid>
					<Grid item size={6} id={"content-rhs"} sx={{pt:"60px", pl:"40px", pr:"40px", pb:"30px", backgroundColor:"#f7f8fa"}}>
						<Grid container sx={{justifyContent:"center"}}>
							<Grid item sx={{maxWidth:"360px", width:"100%", margin:"0 auto"}}>
								<Grid container sx={{textAlign:"center"}} spacing={3}>
									<Grid item size={12}>
										<Stack spacing={2}>
											<Typography variant={"h2"}>Welcome back.</Typography>
											<Typography variant={"body2"}>Sign in to your TradeHub account.</Typography>
										</Stack>
									</Grid>
									<Grid item size={12}>
										<Stack spacing={3}>
											<FormControlLabel control={emailField} 
												label={<Typography variant={"label"}>Email address</Typography>} 
												labelPlacement={"top"} disableTypography={true} />
											<FormControlLabel control={passwordField} 
												label={<Typography variant={"label"}>Password</Typography>} 
												labelPlacement={"top"} disableTypography={true} />
											<Link href={"/forgot-password"}>
												<Typography variant={"link"} sx={{display:"block", textAlign:"right", width:"100%"}}>Forgot password?</Typography>
											</Link>
											<Button variant={"contained"} color={"primary"} onClick={handleSubmit} size={"large"}>
												Sign in&nbsp;<ArrowRight style={{width:"16px", height:"16px"}}/>
											</Button>
											<Divider flexItem>or</Divider>
											<Button variant={"contained"} color={"secondary"} onClick={()=>{}} size={"large"}>
												<img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" width="18" height="18" alt="Google"/>
												&nbsp;<span>Continue with Google</span>
											</Button>
											<Divider flexItem />
											<Typography variant={"body2"}>New to TradeHub?&nbsp;<Link href={"/signup"}><Typography variant={"link"}>Create an account</Typography></Link></Typography>
										</Stack>
									</Grid>
								</Grid>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
			<Grid item size={12} id={"site-footer"}>
			</Grid>
		</Grid>	
  );
}
