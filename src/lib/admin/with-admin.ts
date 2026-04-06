import { adminAuthErrorToResponse, requireAdmin } from './require-admin';

export function withAdmin<T extends (...args: any[]) => Promise<Response>>(
  handler: T
) {
  return async (...args: Parameters<T>): Promise<Response> => {
    try {
      await requireAdmin();
    } catch (err) {
      return adminAuthErrorToResponse(err);
    }
    return handler(...args);
  };
}
