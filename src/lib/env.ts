// vim: ts=2
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
export type TradeHubEnv = {
	database: TradeHubDatabase;
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
	database: {
		host: load("POSTGRES_HOST"),
		port: load("POSTGRES_PORT"),
		password: load("POSTGRES_PASSWORD"),
		username: load("POSTGRES_USERNAME"),
		database: load("POSTGRES_DATABASE")
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
