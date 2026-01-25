import { requireAdmin } from './require-admin';

export function withAdmin<T extends (...args: any[]) => Promise<Response>>(
  handler: T
) {
  return async (...args: Parameters<T>): Promise<Response> => {
    await requireAdmin();
    return handler(...args);
  };
}
