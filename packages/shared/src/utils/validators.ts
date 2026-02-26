/**
 * Regex pattern to validate IPv4 addresses.
 */
const IP_ADDRESS_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Validate if the given string is a valid IP address.
 */
export function isValidIpAddress(ip: string): boolean {
  return IP_ADDRESS_REGEX.test(ip);
}
