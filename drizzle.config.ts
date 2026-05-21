import { defineConfig, type Config } from "drizzle-kit";
import { ENV } from "./src/lib/env";

const host: string = ENV.database.host;
const port: string = ENV.database.port;
const database: string = ENV.database.database;
const user: string = ENV.database.username;
const password: string = ENV.database.password;

export default defineConfig({
  schema: ["./src/lib/data/defs/**/*.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: host,
    port: port,
    database: database,
    user: user,
    password: password,
    ssl: {
      rejectUnauthorized: false,
    },
  },
} satisfies Config);
