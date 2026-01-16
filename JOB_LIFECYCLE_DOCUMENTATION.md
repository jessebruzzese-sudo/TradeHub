# Job Lifecycle Documentation

## Overview

This document describes the complete job lifecycle, all possible state transitions, edge cases, and safeguards implemented in the system.

## Job Statuses

1. **open** - Job is posted and accepting applications
2. **pending_approval** - Contractor has selected a subcontractor, awaiting their response
3. **accepted** - Subcontractor has accepted, waiting for contractor to confirm hire
4. **confirmed** - Hire is confirmed, job is active
5. **completed** - Job has been successfully completed
6. **cancelled** - Job was cancelled by either party
7. **closed** - Job posting was closed without hiring anyone

## Valid State Transitions

```
open → pending_approval  (Contractor selects applicant)
open → cancelled         (Contractor cancels before selection)
open → closed            (Contractor closes without hiring)

pending_approval → accepted   (Subcontractor accepts)
pending_approval → open       (Subcontractor declines)
pending_approval → cancelled  (Either party cancels)

accepted → confirmed    (Contractor confirms hire)
accepted → cancelled    (Either party cancels)

confirmed → completed   (Job finishes successfully)
confirmed → cancelled   (Either party cancels)

closed → open          (Contractor reopens, only if not expired)

completed → [TERMINAL STATE]
cancelled → [TERMINAL STATE]
```

## Application Lifecycle

### Application Statuses

1. **applied** - Initial application submitted
2. **selected** - Contractor selected this application
3. **accepted** - Subcontractor accepted the offer
4. **declined** - Subcontractor declined or withdrew
5. **confirmed** - Hire confirmed, job active
6. **completed** - Job completed

### Application Actions

- **Apply**: Subcontractor can apply when job is `open` and not expired
- **Withdraw**: Subcontractor can withdraw application when status is `applied` and job is not cancelled/completed/closed
- **Accept/Decline**: Subcontractor can respond when job is `pending_approval` and they are selected

## Edge Cases Handled

### 1. Contractor Cancels Before Any Applications

**Scenario**: Contractor posts a job and cancels it before anyone applies.

**Behavior**:
- Job transitions to `cancelled` status
- No reliability reviews are triggered (no one was selected/confirmed)
- No late cancellation penalties apply

**UI**: Cancel button is available on open jobs

---

### 2. Subcontractor Withdraws Application

**Scenario**: Subcontractor applies but changes their mind before being selected.

**Behavior**:
- Application status changes to `declined`
- `withdrawnAt` timestamp is recorded
- Optional withdrawal reason is stored
- Job remains `open` for other applicants
- Withdrawn application is marked but still visible to contractor

**UI**: "Withdraw Application" button shown for applied applications only

---

### 3. Subcontractor Declines After Initially Accepting

**Scenario**: This is prevented by design. Once a subcontractor accepts (job status = `accepted`), they can only cancel (triggering late cancellation review if < 24hrs).

**Behavior**:
- No "Decline" option after acceptance
- Must use "Cancel Job" which records it as a cancellation
- May trigger reliability review if within 24 hours of start time

---

### 4. Contractor Never Confirms Hire

**Scenario**: Job status is `accepted` but contractor doesn't confirm before start date.

**Behavior**:
- Job remains in `accepted` status
- Lifecycle system detects expiration
- Warning messages appear: "Accepted by subcontractor (job expired)"
- "Confirm Hire" button becomes disabled after start date
- Status message shows: "Confirm hire or cancel - start date has passed"
- System automatically marks job as expired but doesn't auto-transition

**UI**:
- Warning banner on job detail page
- "Confirm Hire" button disabled if expired
- Job card shows red border and "Expired" badge

---

### 5. Expired Jobs (Past Start Date Without Confirmation)

**Scenario**: Job start date passes while in `open`, `pending_approval`, or `accepted` status.

**Behavior**:
- `isJobExpired()` returns true
- No new applications accepted
- No selections can be made
- Existing actions are disabled
- Job can still be cancelled or closed

**Detection**:
```typescript
function isJobExpired(job: Job): boolean {
  const startDate = new Date(job.dates[0]);
  if (job.startTime) {
    const [hours, minutes] = job.startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  }
  return now > startDate && status not in ['completed', 'cancelled'];
}
```

**UI**:
- Red border on job cards
- "Expired" badge
- Error-level status messages
- Disabled action buttons

---

### 6. Multi-Day Jobs Cancelled Partway Through

**Scenario**: Job has multiple dates (e.g., 3-day job) and is cancelled after day 1.

**Behavior**:
- Job transitions to `cancelled` status immediately
- Late cancellation check uses first date (start date)
- If cancellation is < 24hrs before start of ANY day, reliability review applies
- Both parties can leave reliability reviews if it was a late cancellation
- Cancellation reason is required and stored

**Late Cancellation Logic**:
```typescript
function isLateCancellation(job: Job): boolean {
  if (!job.wasAcceptedOrConfirmedBeforeCancellation) return false;

  const startDate = job.dates[0];
  const hoursBeforeStart = (startDate - job.cancelledAt) / (1000 * 60 * 60);
  return hoursBeforeStart < 24;
}
```

---

### 7. Invalid State Transitions Prevented

**Examples of prevented transitions**:

- ❌ `completed` → `accepted` (Cannot revert completed jobs)
- ❌ `cancelled` → `open` (Cannot reopen cancelled jobs)
- ❌ `open` → `confirmed` (Must go through pending_approval and accepted)
- ❌ `pending_approval` → `completed` (Must be confirmed first)

**Implementation**:
```typescript
function canTransitionToStatus(
  currentStatus: JobStatus,
  newStatus: JobStatus,
  context: { ... }
): StateTransitionResult
```

**Validation**:
- Checks valid transitions matrix
- Validates required context (e.g., must have selectedSubcontractor)
- Returns `{ allowed: boolean, reason?: string }`

**UI**:
- Alert dialogs show reason for invalid transitions
- Buttons are disabled when transitions are invalid
- No way to manually set invalid statuses

---

## Status Messages and Warnings

Each job status provides contextual messaging:

### Open
- ✓ Normal: "Accepting applications"
- ⚠ Past start: "Start date has passed - no longer accepting applications"
- ❌ Expired: "Job has expired and can no longer accept applications"

### Pending Approval
- ✓ Normal: "Awaiting subcontractor response"
- ⚠ Near start: "Awaiting subcontractor response - start date approaching"
- ❌ Expired: "Awaiting subcontractor response (job expired)"

### Accepted
- ✓ Normal: "Subcontractor accepted - confirm hire to proceed"
- ⚠ Near start: "Accepted - confirm hire soon, start date approaching"
- ❌ Expired: "Accepted (job expired) - confirm hire or cancel"

### Confirmed
- ✓ Before start: "Hire confirmed - job starts soon"
- ✓ In progress: "Job in progress"
- ✓ Past end: "Job period complete - mark as completed"

### Cancelled
- Info: "Job cancelled"
- ⚠ If late: "Cancelled after acceptance - reliability reviews may apply"

### Completed
- ✓ "Job completed successfully"

### Closed
- Info: "Job closed without hiring"
- Action: Can reopen if not expired

---

## Action Availability Matrix

| Action | Open | Pending | Accepted | Confirmed | Completed | Cancelled | Closed |
|--------|------|---------|----------|-----------|-----------|-----------|--------|
| Apply | ✓* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Withdraw App | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Select Applicant | ✓** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Accept Offer | ❌ | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Decline Offer | ❌ | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Confirm Hire | ❌ | ❌ | ✓* | ❌ | ❌ | ❌ | ❌ |
| Cancel Job | ✓ | ✓ | ✓ | ✓*** | ❌ | ❌ | ❌ |
| Close Job | ✓**** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Complete Job | ❌ | ❌ | ❌ | ✓***** | ❌ | ❌ | ❌ |
| Reopen Job | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✓* |

\* Not if expired/past start date
\** Only if has applications
\*** Only before end date
\**** Only if no applications
\***** Only after end date

---

## Key Functions

### `getJobLifecycleState(job, hasApplications)`
Returns complete state information:
- `canCancel`, `canClose`, `canConfirmHire`, `canComplete`, `canReopen`
- `isExpired`, `isPastStartDate`
- `allowsApplications`, `allowsSelection`
- `statusMessage`, `warningMessage`

### `canTransitionToStatus(current, new, context)`
Validates if a state transition is allowed.

### `canWithdrawApplication(appStatus, jobStatus)`
Checks if application can be withdrawn.

### `isJobExpired(job)`
Determines if job has expired.

### `isPastLastDate(job)`
Checks if all job dates have passed.

### `isLateCancellation(job)`
Determines if cancellation qualifies as "late" (< 24hrs before start).

### `canLeaveReliabilityReview(job, userId)`
Checks if user can leave a reliability review for a cancelled job.

---

## UI Components

### JobStatusMessage
Displays contextual status and warning messages with appropriate styling:
- Info (blue)
- Warning (yellow/orange)
- Error (red)
- Success (green)

### StatusPill
Shows job status with color-coded badges:
- Open (yellow)
- Pending Approval (orange)
- Accepted (green)
- Confirmed (dark green)
- Completed (blue)
- Cancelled (red)
- Closed (gray)

### JobCard
Displays job cards with:
- Red border for expired jobs
- Warning badges for expired/past start date
- Status pills
- Disabled hover states for expired jobs

---

## Reliability Reviews

### When Triggered
- Job must be in `cancelled` status
- Job must have been `accepted` or `confirmed` before cancellation
- Cancellation must be within 24 hours of start time

### Who Can Leave Reviews
- Contractor (about selected/confirmed subcontractor)
- Subcontractor (about contractor)

### What Cannot Be Reviewed
- Jobs cancelled before selection
- Jobs cancelled > 24hrs before start
- Jobs closed without hiring
- Jobs completed normally

---

## Database Fields

### Job
- `status`: JobStatus
- `selectedSubcontractor`: string (ID of selected subcontractor)
- `confirmedSubcontractor`: string (ID of confirmed subcontractor)
- `cancelledAt`: Date (timestamp of cancellation)
- `cancelledBy`: string (user ID who cancelled)
- `cancellationReason`: string (required explanation)
- `wasAcceptedOrConfirmedBeforeCancellation`: boolean

### Application
- `status`: ApplicationStatus
- `respondedAt`: Date (when accept/decline occurred)
- `withdrawnAt`: Date (when application was withdrawn)
- `withdrawnReason`: string (optional explanation)

---

## Testing Considerations

To test edge cases:

1. **Expired Jobs**: Set job start date in past, verify disabled actions
2. **Late Cancellations**: Set start date < 24hrs away, cancel, verify review prompts
3. **Withdrawals**: Apply then withdraw, verify contractor sees withdrawal
4. **Multi-day**: Create 3-day job, cancel mid-way, verify review eligibility
5. **Invalid Transitions**: Try to confirm hire on expired job, verify prevention
6. **Close without applications**: Post job with no applicants, verify can close
7. **Close with applications**: Post job with applicants, verify cannot close

---

## Future Enhancements

Potential additions:
- Auto-complete jobs after end date + grace period
- Auto-expire jobs that remain in pending_approval > N days
- Partial completion for multi-day jobs
- Rescheduling functionality
- Dispute resolution status
