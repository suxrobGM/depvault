/**
 * Server action result type, used for all server actions to standardize the response format.
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
