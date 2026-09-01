'use client';

import { getAxios } from "@/lib/utils";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Grid, Container, TextField, Button } from "@mui/material";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";

export default function ResetPasswordPage() {

  const router = useRouter();
	const params = useSearchParams();
	const [msg, setMsg] = useState("Please wait we're activating your account");
	const uid = params.get("uid");
	const code = params.get("code");
	const isEmail = uid !== undefined 
		&& code !== undefined 
		&& (uid?.length ?? 0) > 0 
		&& (code?.length ?? 0) > 0;
  const [loading, setLoading] = useState(isEmail);
	const [mobileCode, setMobileCode] = useState("");
	useEffect(()=>{
		if(!loading){
			return;
		}
		let baseUrl = "/api/auth/activate";
		if(isEmail){
			baseUrl = `${baseUrl}?uid=${uid}&code=${code}`;
		}else{
			baseUrl = `${baseUrl}?activationCode=${mobileCode}`;
		}
		getAxios(null).get(baseUrl).
			then((response_)=>{
				toast.success("Account activated");
				setMsg("Account activated, redirecting to login");
				router.push("/login");
			}).catch((err_)=>{
				toast.error("Failed to activate account");
				setMsg("Could not activate account");
				setLoading(false);
			});
	}, [loading]);

	let content = (
		<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
			<div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-gray-200">
				<p className="text-sm text-gray-600 text-center">
					{msg}
				</p>
			</div>
		</div>
	);
	if(!isEmail){
		content = (
			<Container maxWidth={"xs"} fluid sx={{mt:3}}>	
				<Grid container spacing={2}>
					<Grid item size={12}>
						<TextField value={mobileCode} onChange={(event)=>{setMobileCode(event.target.value);}} label={"Activation code"} fullWidth size={"large"} variant={"outlined"} helperText={"Please enter your six digit activation code."}/>
					</Grid>
					<Grid item size={12}>
						<Grid container sx={{justifyContent:"center"}}>
							<Grid item>
								<Button size={"large"} variant={"contained"} onClick={()=>{setLoading(true);}}>Submit</Button>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Container>
		);
	}

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center mb-6">
          <Image
            src="/TradeHub -Horizontal-Main.svg"
            alt="TradeHub"
            width={180}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <h2 className="text-center text-3xl font-bold text-gray-900">
					Activate Account
				</h2>
        <p className="mt-5 text-center text-sm text-gray-600">
					One step away from finding work	
        </p>
      </div>
			{content}
    </div>
  );
}
