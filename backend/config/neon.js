
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const neonApi = axios.create({
  baseURL: "https://console.neon.tech/api/v2",
  headers: {
    Authorization: `Bearer ${process.env.NEON_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  },
  timeout: 15000
});

export default neonApi;
