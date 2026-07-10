// vim: ts=2
import axios from "axios";
import { ENV } from "@/lib/env";
import * as d from "date-fns";
import * as z from "zod";

const getEmailClient = () => {
	return axios.create({
		baseURL: "https://api.sendgrid.com/v3",
		timeout: 10000,
		headers: {
			"Authorization": `Bearer ${ENV.sendgrid.key}`,
			"Content-Type": "application/json"
		}
	});
};
type WelcomePayload = {
	code: string;
	userId: string;
	email: string;
	name: string;
};
export const doUserCreated = async (user:any) => {
	const currentYear = d.format(new Date(), "yyyy");
	const payload = {
		from: { email: ENV.sendgrid.fromEmail },
		template_id: ENV.sendgrid.templates.userCreated,
		personalizations: [{
			to: ENV.sendgrid.adminEmails.split(",").map((e,i)=>{ return { email: e }; }),
			dynamic_template_data: { 
				name: user.name, 
				email: user.email, 
				businessName: user.business.businessName,
				primaryTrade: user.business.primaryTrade,
				location: user.business.location,
				postcode: user.business.postcode,
				currentYear
			}
		}]
	};	
	return getEmailClient().post("/mail/send", payload);
};
export const doJobCreated = async () => {
	return new Promise(async(resolve, reject)=>{
		resolve();
	});
};
export const doJobApplicationReceived = () => {
	return new Promise(async(resolve, reject)=>{
		resolve();
	});
};
export const doJobApplied = async () => {
	return new Promise(async(resolve, reject)=>{
		resolve();
	});
};
export const doMessageSent = async (data:any, email:string) => {
	const schema = z.object({
		senderName: z.string(),
		timestamp: z.string().datetime(),
		conversationUrl: z.string(),
		unsubscribeUrl: z.string(),
		notificationUrl: z.string()
	});
	try{
		schema.parse(data);
	}catch(err_){
		throw err_;
	}	
	const msgCreatedAt = d.parseISO(data.timestamp);
	// override data timestamp
	// therefore changing its format
	data.timestamp = d.format(msgCreatedAt, "dd/MM/yyyy");
	const currentYear = d.format(new Date(), "yyyy");
	// read this stuff from env file
	// although not entirely sure that's required
	const companyName = "TradeHub";
	const companyAddress = "25 Martin Close, South Morang, 3752";
	const homeUrl = "https://www.tradehub.com.au";
	const payload = {
		from: { email: ENV.sendgrid.fromEmail },
		template_id: ENV.sendgrid.templates.messageSent,
		personalizations: [{
			to: [{ email: email }],
			dynamic_template_data: { 
				currentYear, 
				companyName, 
				companyAddress,
				homeUrl,
				...data
			}
		}]
	};
	return getEmailClient().post("/mail/send", payload);
};
export const doPasswordChanged = async (email:string) => {
	const currentYear = d.format(new Date(), "yyyy");
	const payload = {
		from: { email: ENV.sendgrid.fromEmail },
		template_id: ENV.sendgrid.templates.passwordChanged,
		personalizations: [{
			to: [{ email: email }],
			dynamic_template_data: { currentYear }
		}]
	};	
	return getEmailClient().post("/mail/send", payload);
};
export const doForgotPassword = async (state:string, email:string) => {
	const link = `${ENV.sendgrid.appBaseUrl}/reset-password?state=${state}`;
	const currentYear = d.format(new Date(), "yyyy");
	const payload = {
		from: { email: ENV.sendgrid.fromEmail },
		template_id: ENV.sendgrid.templates.forgotPassword,
		personalizations: [{
			to: [{ email: email }],
			dynamic_template_data: { link, currentYear }
		}]
	};	
	return getEmailClient().post("/mail/send", payload);
};
export const doWelcome = async (welcome:WelcomePayload) => {
	const link = `${ENV.sendgrid.appBaseUrl}/activate?uid=${welcome.userId}&code=${welcome.code}`;
	const currentYear = d.format(new Date(), "yyyy");
	const payload = {
		from: { email: ENV.sendgrid.fromEmail },
		template_id: ENV.sendgrid.templates.welcome,
		personalizations: [{
			to: [{ email: welcome.email }],
			dynamic_template_data: { name: welcome.name, link: link, currentYear }
		}]
	};	
	return getEmailClient().post("/mail/send", payload);
};
