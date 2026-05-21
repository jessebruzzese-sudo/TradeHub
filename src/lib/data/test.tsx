// vim: ts=2
'use client'
import { Link } from "next/link";
import { useEffect, useState } from "react";
import { testConnection } from "@/lib/data/service";
import { useDataService } from "@/lib/data/provider";
export const TestDB = (props) => {
	const [result, setResult] = useState<string>("loading");
	const { users } = useDataService();
	const check_ = () => {
		testConnection().then((result_)=>{
			setResult(`${result_}`);
		});
	};
	useEffect(()=>{
		check_();		
	}, [result]);
	return (
		<p>Database connection count is {result}</p>
	);
};
