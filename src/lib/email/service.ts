// vim: ts=2
import axios from "axios";
import { ENV } from "@/lib/env";
import * as d from "date-fns";

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
	// TODO think about this
	// maybe race this promise
	// dont wait on it?
	return getEmailClient().post("/mail/send", payload);
};
