import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";

const pool = new Pool({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  max: 20
});

export const db = drizzle(pool);
