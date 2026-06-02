// vim: ts=2
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Axios from "axios";
import { ENV } from "@/lib/env";

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
