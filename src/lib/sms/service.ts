// vim: ts=2
import twilio from "twilio";
import { ENV } from "@/lib/env";

export const sendSMS = async (to:string, body:string) => {
		const sid = ENV.twilio.sid;
		const auth = ENV.twilio.authToken;
		const from = ENV.twilio.from;
		const client = twilio(sid, auth);
		return client.messages.create({
			body, from, to
		});
};
