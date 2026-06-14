'use client';

import { getAxios } from "@/lib/utils";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";

export default function ResetPasswordPage() {

  const router = useRouter();
	const params = useSearchParams();
  const [loading, setLoading] = useState(true);
	const [msg, setMsg] = useState("Please wait we're activating your account");
	useEffect(()=>{
		if(loading){
			return;
		}
		router.push("/login");
	}, [loading]);
	useEffect(()=>{
		if(!loading){
			return;
		}
		const uid = params.get("uid");
		const code = params.get("code");
		getAxios(null).get(`/api/auth/activate?uid=${uid}&code=${code}`).
			then((response_)=>{
				toast.success("Account activated");
				setMsg("Account activated, redirecting to login");
				setLoading(false);
			}).catch((err_)=>{
				toast.error("Failed to activate account");
				setMsg("Could not activate account");
			});
	}, [loading]);

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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-gray-200">
         <p className="text-sm text-gray-600 text-center">
						{msg}
					</p>
        </div>
      </div>
    </div>
  );
}
