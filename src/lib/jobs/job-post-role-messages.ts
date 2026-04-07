/** Matches Supabase RLS: own-row `jobs` INSERT/UPDATE/DELETE require `users.role = 'contractor'`. */
export const JOB_POST_CONTRACTOR_ROLE_CODE = 'JOB_POST_CONTRACTOR_ROLE_REQUIRED' as const;

export const JOB_POST_CONTRACTOR_ROLE_MESSAGE =
  'Only contractor accounts can post jobs. If you are here to find work, open Jobs and use the Find Work tab to browse and apply.';

export const JOB_EDIT_CONTRACTOR_ROLE_MESSAGE =
  'Only contractor accounts can edit job posts.';
