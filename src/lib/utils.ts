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
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
