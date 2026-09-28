"use client";
// vim:ts=2
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { Grid, useTheme, Stack, Typography, Box, CircularProgress, Button } from "@mui/material";
import Image from "next/image";
import { getAxios } from "@/lib/utils";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";

const LOADING = 0;
const FAILED = 1;
const SUCCESS = 2;
const NEW_USER = 3;

export default function GoogleOAuthRedirectPage(props:any) {
	const [status, setStatus] = useState(LOADING);
	const loading = status === LOADING;
	const router = useRouter();
	const params = useSearchParams();
	const theme = useTheme();
  const code = params.get("code");
	const state = params.get("state");
	const scope = params.get("scope");
	const authuser = params.get("authuser");
	useEffect(()=>{
		if(!loading){
			return;
		}
		// params from google
		const payload = {
			code, state, scope, authuser
		};
		getAxios(null).post("/api/auth/google/login", payload).
			then((response_)=>{
				const data = response_.data;
				const userCreated = data?.userCreated ?? false;
				// if new user
				// redirect to profile edit
				// else redirect to dashboard
				if(!userCreated){
					setStatus(SUCCESS);
				}else{
					setStatus(NEW_USER);
				}
				setTimeout(()=>{
					router.push(data?.redirect ?? "/");
				}, 1000);
			}).catch((err_)=>{
				setStatus(FAILED);
			});
	},[loading]);
	const gradient = "radial-gradient( circle, color-mix(in srgb, rgb(26,28,31) 14%, transparent) 0.8px, transparent 0.8px )";
	let primaryMessage = "Signing you in...";
	let secondaryMessage = "Just a moment while we connect you to TradeHub.";
	let icon = (
		<Grid item sx={{width:"76px", height:"76px", backgroundColor:"rgb(237,246,255)", borderRadius:"24px"}}>
			<CircularProgress size={"16px"} sx={{position:"relative", left:"30px", top:"30px"}}/>
		</Grid>
	);
	if(!loading){	
		if(status === SUCCESS){
			primaryMessage = "You're signed in";
			secondaryMessage = "Taking you back to TradeHub. If you're not redirected, continue below.";
			icon = (
				<Grid item sx={{width:"76px", height:"76px", backgroundColor:"rgb(230,245,237)", borderRadius:"24px"}}>
					<Check style={{width:"16px", height:"16px", position:"relative", left:"30px", top:"30px", code:"rgb(34,148,91)"}}/>
				</Grid>
			);
		}else if(status === FAILED){
			primaryMessage = "We couldn't sign you in";
			secondaryMessage = "Your sign-in link may have expired. Please start again to continue.";
			icon = (
				<Grid item sx={{width:"76px", height:"76px", backgroundColor:"rgb(237,246,255)", borderRadius:"24px"}}>
					<CircleAlert style={{width:"16px", height:"16px", position:"relative", left:"30px", top:"30px", color:"rgb(0,135,243)"}}/>
				</Grid>
			);
		}else if(status === NEW_USER){
			primaryMessage = "You're connected";
			secondaryMessage = "Let's finish your profile so you can start making connections.";
			icon = (
				<Grid item sx={{width:"76px", height:"76px", backgroundColor:"rgb(237,246,255)", borderRadius:"24px"}}>
					<CircularProgress size={"16px"} sx={{position:"relative", left:"30px", top:"30px"}}/>
				</Grid>
			);
		}
	}
	let mainContent = (
		<Grid container sx={{justifyContent:"center", alignItems:"center", height:"100%"}}>
			<Grid item>
				<Stack spacing={2}>
					<Grid container sx={{justifyContent:"center"}}>
						{icon}
					</Grid>
					<Typography variant={"h4"} sx={{textAlign:"center"}}>
						{primaryMessage}
					</Typography>
					<Typography variant={"body2"} sx={{textAlign:"center"}}>
						{secondaryMessage}
					</Typography>
					{status === FAILED && (
						<Button size={"large"} variant={"contained"} onClick={()=>{router.push("/login");}}>
							Try again
						</Button>
					)}
					{status === SUCCESS && (
						<Button size={"large"} variant={"contained"} onClick={()=>{router.push("/");}}>
							Continue to TradeHub
						</Button>
					)}	
					{status === NEW_USER && (
						<Button size={"large"} variant={"contained"} onClick={()=>{router.push("/profile/edit");}}>
							Continue to TradeHub
						</Button>
					)}	
				</Stack>
			</Grid>
		</Grid>
	);
	return (
		<Grid container sx={{height: "100vh", background: gradient, backgroundPosition: "center", backgroundSize: "16px 16px", overflow:"hidden" }}>
			<Grid item size={12} sx={{height:"100%"}}>
				<Grid container sx={{height:"100%", background:"inherit"}}>
					<Grid item size={{lg:4.5, xs:1}} />
					<Grid item size={{lg:3, xs:10}} sx={{mt: 5, height:"90%", borderRadius:"30px", border:"1px solid #e8ecf1", background:"white"}}>
						<Grid container sx={{height:"100%"}}>	
							<Grid item size={12} id={"header"} sx={{padding:"48px 28px 24px", height:"25%"}}>
								<Grid container sx={{justifyContent:"center"}}>
									<Grid item>
										<Image src={"/new-design-logo.svg"} width={"270"} height={"51"} alt={"TradeHub - Connecting trades, simply"} />
									</Grid>
								</Grid>
							</Grid>
							<Grid item size={12} id={"content"} sx={{padding:"24px 30px 100px", height:"50%"}}>
								{mainContent}
							</Grid>
							<Grid item size={12} id={"footer"} sx={{height:"25%"}}>
								<Grid container sx={{alignItems:"flex-end", justifyContent:"center", height:"100%"}}>
									<Grid item sx={{mb:2}}>
										<Typography variant={"body2"} sx={{textAlign:"center"}}>
											Good connections. Better business.
										</Typography>
									</Grid>
								</Grid>
							</Grid>
						</Grid>
					</Grid>
					<Grid item size={{lg:4.5, xs:11}} />
				</Grid>
			</Grid>
		</Grid>
	);
};
