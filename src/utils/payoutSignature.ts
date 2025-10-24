import { config } from "config";
import crypto from "crypto";
import type { PayOSCreateLinkInput } from "types/transaction.dto";

/**
 * Deep sort object with optional array sorting
 * @param obj Object data
 * @param sortArrays Whether to sort arrays or maintain their order
 * @returns Sorted object data
 */
function deepSortObj(obj: any, sortArrays: boolean = false): any {
  return Object.keys(obj)
    .sort()
    .reduce((acc: any, key: string) => {
      const value = obj[key];

      if (Array.isArray(value)) {
        if (sortArrays) {
          // Sort array elements
          acc[key] = value
            .map((item) =>
              typeof item === 'object' && item !== null ? deepSortObj(item, sortArrays) : item,
            )
            .sort((a, b) => {
              // Sort primitive values
              if (typeof a !== 'object' && typeof b !== 'object') {
                return String(a).localeCompare(String(b));
              }
              // For objects, sort by JSON string representation
              return JSON.stringify(a).localeCompare(JSON.stringify(b));
            });
        } else {
          // Maintain array order, but sort objects within arrays
          acc[key] = value.map((item) =>
            typeof item === 'object' && item !== null ? deepSortObj(item, sortArrays) : item,
          );
        }
      } else if (typeof value === 'object' && value !== null) {
        acc[key] = deepSortObj(value, sortArrays);
      } else {
        acc[key] = value;
      }

      return acc;
    }, {});
}

/**
 * Create PayOS payout signature following their specification
 * @param payload Payout payload data
 * @param checksumKey PayOS checksum key
 * @returns HMAC SHA-256 signature in hex format
 */
export function createPayOSPayoutSignature(payload: any, checksumKey: string): string {
  // Deep sort the payload while maintaining array order
  const sortedData = deepSortObj(payload, false);

  // Create query string format: key1=value1&key2=value2...
  const queryString = Object.keys(sortedData)
    .map((key) => {
      let value = sortedData[key];

      // Handle arrays by JSON stringify them
      if (Array.isArray(value)) {
        value = JSON.stringify(value);
      }
      // Handle nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        value = JSON.stringify(value);
      }
      // Handle null/undefined values - convert to empty string
      if (value === null || value === undefined) {
        value = '';
      }

      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    })
    .join('&');

  console.log("📝 Payout signature data string:", queryString);

  // Create HMAC SHA-256 signature
  const hmac = crypto.createHmac("sha256", checksumKey);
  hmac.update(queryString);
  const signature = hmac.digest("hex");

  console.log("🔐 Generated payout signature:", signature);
  
  return signature;
}

/**
 * Verify PayOS payout signature
 * @param payload Original payload
 * @param checksumKey PayOS checksum key  
 * @param expectedSignature Expected signature to verify
 * @returns true if signatures match
 */
export function verifyPayOSPayoutSignature(payload: any, checksumKey: string, expectedSignature: string): boolean {
  const computedSignature = createPayOSPayoutSignature(payload, checksumKey);
  return computedSignature.toLowerCase() === expectedSignature.toLowerCase();
}
export function createPayOSPaymentSignature({ amount, cancelUrl, description, orderCode, returnUrl }: Required<Omit<PayOSCreateLinkInput, 'orderCode'>> & { orderCode: number }): string {
  // Alphabetical concatenation required by PayOS
  const dataString = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  const hmac = crypto.createHmac("sha256", config.payosChecksumKey);
  hmac.update(dataString);
  return hmac.digest("hex");
}