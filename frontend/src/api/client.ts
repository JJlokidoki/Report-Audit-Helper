import axios from "axios";

const reportClient = axios.create({
  baseURL: import.meta.env.VITE_REPORT_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

export default reportClient;
