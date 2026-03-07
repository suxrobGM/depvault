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

export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_REQUIREMENTS =
  "Password must be at least 8 characters with one uppercase letter and one number";

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
