// vim: ts=2
export type TradeHubStore = {
	images: string;
	jobs: string;
};
export type TradeHubJWT = {
	secret: string;
};
export type TradeHubDatabase = {
	host: string;
	port: string;
	username: string;
	database: string;
	password: string;
	cert: string;
	ssl: boolean;
};
export type SendgridTemplates = {
	welcome: string;
};
export type TradeHubSendgrid = {
	key: string;
	fromEmail: string;
	appBaseUrl: string;
	templates: SendgridTemplates;
};
export type TradeHubEnv = {
	store: TradeHubStore;
	database: TradeHubDatabase;
	sendgrid: TradeHubSendgrid;
	jwt: TradeHubJWT;
};
const load = (key:string) => {
	const value: string = process.env[key] ?? null;
	if(value === null){
		const keys = Object.keys(process.env).join(", ");
		console.log(keys);
		return null;
	}
	return value;
};
export const ENV: TradeHubEnv = {
	store: {
		images: load("IMAGE_FILE_STORE"),
		jobs: load("JOB_FILE_STORE")
	},
	avatar: {
		defaultImage: load("AVATAR_DEFAULT_IMAGE")
	},
	database: {
		host: load("POSTGRES_HOST"),
		port: load("POSTGRES_PORT"),
		password: load("POSTGRES_PASSWORD"),
		username: load("POSTGRES_USERNAME"),
		database: load("POSTGRES_DATABASE"),
		cert: load("POSTGRES_SSL_CERT"),
		ssl: load("POSTGRES_USE_SSL") === "true"
	},
	sendgrid: {
		key: load("SENDGRID_KEY"),	
		fromEmail: load("SENDGRID_FROM_EMAIL"),
		appBaseUrl: load("SENDGRID_APP_BASE_URL"),
		adminEmails: load("SENDGRID_ADMIN_EMAILS"),
		alerts: {
			userCreated: load("SEND_USER_CREATED") === "true",
			messageSent: load("SEND_MESSAGE_SENT") === "true",
			earlyUser: load("SEND_EARLY_USER") === "true"
		},
		templates: {
			welcome: load("WELCOME_TEMPLATE_ID"),
			userCreated: load("USER_CREATED_TEMPLATE_ID"),
			forgotPassword: load("FORGOT_PASSWORD_TEMPLATE_ID"),
			passwordChanged: load("PASSWORD_CHANGED_TEMPLATE_ID"),
			messageSent: load("MESSAGE_SENT_TEMPLATE_ID"),
			earlyUser: load("EARLY_USER_TEMPLATE_ID"),
			jobCreated: load("JOB_CREATED_TEMPLATE_ID"),
			availUpdated: load("AVAIL_UPDATED_TEMPLATE_ID")
		}
	},
	twilio: {
		sid: load("TWILIO_ACCOUNT_SID"),
		authToken: load("TWILIO_AUTH_TOKEN"),
		from: load("TWILIO_PHONE_NUMBER")
	},
	jwt: {
		secret: load("JWT_SECRET")
	},
	public: {
		api: {
			baseURL: load("NEXT_PUBLIC_API_BASE_URL")
		}
	}
};
