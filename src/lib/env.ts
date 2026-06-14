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
	database: {
		host: load("POSTGRES_HOST"),
		port: load("POSTGRES_PORT"),
		password: load("POSTGRES_PASSWORD"),
		username: load("POSTGRES_USERNAME"),
		database: load("POSTGRES_DATABASE")
	},
	sendgrid: {
		key: load("SENDGRID_KEY"),	
		fromEmail: load("SENDGRID_FROM_EMAIL"),
		appBaseUrl: load("SENDGRID_APP_BASE_URL"),
		templates: {
			welcome: load("WELCOME_TEMPLATE_ID")	
		}
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
