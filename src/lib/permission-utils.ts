export interface TenderPostingPermission {
  canPost: boolean;
  reason: string;
  upgradeRequired?: boolean;
  message?: string;
}

export async function checkTenderPostingPermission(
  authToken: string
): Promise<TenderPostingPermission> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-tender-posting`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking tender posting permission:', error);
    return {
      canPost: false,
      reason: 'Error checking permissions',
    };
  }
}

export interface QuoteSubmissionPermission {
  canSubmit: boolean;
  reason: string;
  message?: string;
}

export async function checkQuoteSubmissionPermission(
  authToken: string,
  tenderId: string
): Promise<QuoteSubmissionPermission> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-quote-submission`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenderId }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking quote submission permission:', error);
    return {
      canSubmit: false,
      reason: 'Error checking permissions',
    };
  }
}

export function canUserPostTenders(
  role: string,
  activePlan: string | null,
  subscriptionStatus: string
): boolean {
  if (role === 'admin' || role === 'contractor') {
    return true;
  }

  if (role === 'subcontractor') {
    return (
      (activePlan === 'SUBCONTRACTOR_PRO_10' || activePlan === 'ALL_ACCESS_PRO_26') &&
      subscriptionStatus === 'ACTIVE'
    );
  }

  return false;
}
