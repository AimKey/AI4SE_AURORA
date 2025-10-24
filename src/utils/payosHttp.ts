import axios from "axios";
import { config } from "config";

// Axios instance configured for PayOS API
export const payosHttp = axios.create({
  baseURL: config.payosApiUrl,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": config.payosApiKey,
    "x-client-id": config.payosClientId,
  },
  // Optionally set a timeout
  timeout: 15000,
});

// If your keys can rotate at runtime, expose a small refresher
export function refreshPayOSHeaders() {
  payosHttp.defaults.headers["x-api-key"] = config.payosApiKey;
  payosHttp.defaults.headers["x-client-id"] = config.payosClientId;
}

// Create a separate Axios instance for requests that require per-request
// x-idempotency-key and x-signature headers.
export async function createPayOSSignedHttp(idempotencyKey: string, signature: string) {
  // const ipCheck = await axios.get("https://api.ipify.org?format=json");
  // console.log("Current outgoing IP from Node:", ipCheck.data);
  return axios.create({
    baseURL: config.payosApiUrl,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.payosPOApiKey,
      "x-client-id": config.payosPOClientId,
      "x-idempotency-key": idempotencyKey,
      "x-signature": signature,
    },
    timeout: 15000,
  });
}
export async function createPayOSOutHttp() {
  // const ipCheck = await axios.get("https://api.ipify.org?format=json");
  // console.log("Current outgoing IP from Node:", ipCheck.data);
  return axios.create({
    baseURL: config.payosApiUrl,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.payosPOApiKey,
      "x-client-id": config.payosPOClientId,
    },
    timeout: 15000,
  });
}
