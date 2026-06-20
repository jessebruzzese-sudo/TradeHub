// vim: ts=2
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Axios from "axios";
import { ENV } from "@/lib/env";
import * as jose from "jose";

export const getUserRating = (up:number, down:number) => {
	const totalVotes = up + down;
  const starAverage =
    totalVotes === 0
      ? 0
      : Number((1 + (up / totalVotes) * 4).toFixed(1));
  return Number(starAverage).toFixed(1);
};

export const getClaims = async (token:string) => {
	return new Promise(async(resolve, reject)=>{
		let claims = null;
		try{
			claims = await jose.decodeJwt(token);
		}catch(err){
			// ignore this for now
			// let callee decice what to do
		}
		resolve(claims);
	});
};

export const getAxios = (token:string|null) => {
	return Axios.create({
		baseURL: ENV.public.api.baseURL,
		timeout: 10000,
		headers: {
			"Authorization": token,
			"Content-Type": "application/json"
		}
	});
};
export const getMimeForFile = (path:string) => {
	const tokens = path?.split("/") ?? [];
	console.log(path);
	if(tokens.length === 0){
		throw new Error(`Failed to split path ${path} into tokens`);
	}
	const name = tokens[tokens.length-1];
	const ext = name.substr(name.indexOf(".")+1);
	const known = {
		"png": "image/png",
		"jpg": "image/jpg",
		"bmp": "image/bmp"
	};
	const mime = known[ext] ?? null;
	if(mime === null){
		throw new Error(`Failed to determine mime for extension ${ext}`);	
	}
	return mime;
};
export const getImageExtension = (mime:string) => {
	const known = {
		"image/png": "png",
		"image/jpg": "jpg",
		"image/jpeg": "jpg",
		"image/bmp": "bmp"
	};
	const ext = known[mime] ?? null;
	if(ext === null){
		throw new Error(`Unknown MIME type ${mime}`);
	}
	return ext;
};
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
