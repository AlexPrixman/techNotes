import { config } from "dotenv"
config();

export const PORT = process.env.PORT || 3000;
export const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING;
export const NODE_ENV = process.env.NODE_ENV;