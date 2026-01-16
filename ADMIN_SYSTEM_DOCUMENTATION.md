# Admin System Documentation

## Overview

The admin system provides comprehensive platform oversight with audit logging, user management, job monitoring, and safeguards to prevent admin participation in job/messaging flows.

## Core Principles

1. **View-Only by Default**: Admins can view all data but cannot participate in jobs
2. **Audit Everything**: All major admin actions are logged
3. **Confirmation for Destructive Actions**: Clear dialogs before suspensions or rejections
4. **Internal Notes**: Private admin notes on users for investigation tracking
5. **Complete Timeline**: Full job history from posting to completion/cancellation

---

## Admin Dashboard

**Route**: `/admin`

### Features
- Platform statistics overview
- Quick access to all admin sections
- Pending review counter
- Links to:
  - User Management
  - Job Monitoring (Read-Only)
  - Review Moderation
  - Audit Log
  - Verifications

### Statistics Displayed
- Total Users
- Pending Verifications
- Pending Reviews
- Active Jobs
- Total Jobs Posted

---

## Audit Log System

### Purpose
View-only, immutable log of all major admin actions for accountability and investigation.

### Audit Action Types

```typescript
type AuditActionType =
  | 'user_verification_approved'
  | 'user_verification_rejected'
  | 'user_suspended'
  | 'user_unsuspended'
  | 'review_approved'
  | 'review_rejected'
  | 'admin_note_added'
  | 'job_viewed';
```

### Audit Log Entry Structure

```typescript
interface AuditLog {
  id: string;
  adminId: string;
  actionType: AuditActionType;
  targetUserId?: string;
  targetJobId?: string;
  targetReviewId?: string;
  details: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

### When Audit Logs are Created

1. **User Verification Approved/Rejected**
   - Admin verifies or rejects user account
   - Records target user and admin who made decision

2. **User Suspended/Unsuspended**
   - Admin suspends or restores user account
   - Records reason and admin who took action

3. **Review Approved/Rejected**
   - Admin moderates a reliability review
   - Records review ID and moderation decision

4. **Admin Note Added**
   - Admin adds internal note to user profile
   - Records note preview and admin author

5. **Job Viewed**
   - Admin accesses job detail page
   - Tracks admin oversight activities

### Accessing Audit Logs

**Complete Log**: `/admin/audit-log`
- View all admin actions across platform
- Sortedby most recent first
- Shows admin name, action type, target, timestamp

**User-Specific Log**: On user detail page
- Shows only actions related to that user
- Includes verifications, suspensions, notes

**Job-Specific Log**: On job detail page
- Shows admin views of that job
- Tracks oversight activities

### Audit Log UI

Component: `AuditLogView`

**Display Format**:
- Color-coded action type badges
- Action description
- Admin name
- Target user (if applicable)
- Timestamp with date and time
- Scrollable list with max height

**Color Coding**:
- Green: Approvals, restorations
- Red: Rejections, suspensions
- Blue: Notes added
- Gray: Views, informational

---

## User Management

### User List

**Route**: `/admin/users`

**Features**:
- View all users
- Sortable table
- Click row to view details
- Shows: Name, Email, Role, Trust Status

### User Detail Page

**Route**: `/admin/users/[id]`

**Information Displayed**:
- User Details
  - Name, Email
  - Role (contractor/subcontractor/admin)
  - Trust Status
  - Rating
  - Completed Jobs
  - Business Name, ABN (if applicable)

- Admin Notes Panel
- User-Specific Audit Log

**Actions Available**:

1. **Verify User**
   - Upgrade trust status to verified
   - Confirmation dialog required
   - Creates audit log entry

2. **Suspend User**
   - Destructive action
   - Red confirmation dialog
   - Records reason
   - Creates audit log entry
   - Prevents platform access

### Admin Notes

**Purpose**: Internal-only notes for admin investigation and tracking

**Features**:
- Add new note (text area)
- View all notes for user
- Shows note author and timestamp
- Yellow highlighted display
- Not visible to users

**Creating a Note**:
```typescript
const note: AdminNote = {
  id: `note-${Date.now()}`,
  adminId: currentAdmin.id,
  userId: targetUser.id,
  note: noteText,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

**Audit Log**: Adding a note creates an audit log entry

---

## Job Monitoring

### Jobs List

**Route**: `/admin/jobs`

**Features**:
- View all jobs (read-only)
- Shows: Title, Contractor, Status, Posted Date
- Click to view full details
- No edit or posting capabilities

### Job Detail (Admin View)

**Route**: `/admin/jobs/[id]`

**Read-Only Notice**: Prominent blue alert explaining admins cannot participate

**Information Displayed**:

1. **Job Details**
   - Title, Description
   - Trade Category
   - Location, Postcode
   - Pay Type and Rate
   - Required Dates
   - Status

2. **Job Statistics**
   - Application Count
   - Message Count
   - Selected Subcontractor (if any)
   - Cancellation Info (if cancelled)

3. **Job Timeline**
   - Complete event history
   - Job posted
   - Applications received
   - Messaging started
   - Subcontractor selected
   - Job accepted/confirmed
   - Job cancelled/completed

4. **Admin Actions Log**
   - Admin views of this job
   - Any admin oversight

### Job Timeline

Component: `JobTimelineView`

**Timeline Events**:

1. **Status Changes**
   - Job posted
   - Subcontractor selected
   - Job accepted
   - Job confirmed
   - Job completed
   - Job reopened/closed
   - Blue colored

2. **Applications**
   - Application received
   - Application accepted/declined
   - Gray colored

3. **Messages**
   - First message sent
   - Communication started
   - Purple colored

4. **Cancellations**
   - Job cancelled
   - Cancellation reason
   - Who cancelled
   - Red colored

5. **Completion**
   - Job marked complete
   - Green colored

**Display Format**:
- Vertical timeline with connecting line
- Icon for each event type
- Event name and description
- Actor name (who performed action)
- Timestamp
- Color-coded by type

---

## Cancellation History

### Viewing Cancellations

On Job Detail page, cancelled jobs show:
- Who cancelled (contractor or subcontractor)
- When cancelled
- Cancellation reason
- Whether job was accepted/confirmed before cancellation

### Cancellation Data

```typescript
{
  status: 'cancelled',
  cancelledAt: Date,
  cancelledBy: userId,
  cancellationReason: string,
  wasAcceptedOrConfirmedBeforeCancellation: boolean
}
```

### Late Cancellation Tracking

Jobs cancelled after acceptance/confirmation are flagged for:
- Reliability review eligibility
- Trust score impact
- Admin investigation

---

## Admin Confirmation Dialogs

Component: `AdminConfirmationDialog`

### Purpose
Prevent accidental destructive actions with clear confirmation.

### Dialog Types

1. **Default Variant**
   - Blue styling
   - For approvals, verifications
   - Standard confirmation

2. **Destructive Variant**
   - Red warning icon
   - Red confirm button
   - For suspensions, rejections
   - Clear warning message

### Dialog Structure
```typescript
{
  title: "Suspend User Account",
  description: "Are you sure you want to suspend John Doe? This will prevent them from accessing the platform.",
  actionLabel: "Suspend User",
  variant: "destructive",
  onConfirm: () => { /* action */ }
}
```

### Usage Pattern
```typescript
setConfirmDialog({
  open: true,
  title: 'Action Title',
  description: 'Clear explanation of consequences',
  actionLabel: 'Confirm Action',
  variant: 'destructive', // or 'default'
  action: () => {
    // Perform action
    // Create audit log
    // Close dialog
  },
});
```

---

## Admin Safeguards

### Purpose
Prevent admins from accidentally participating in job/messaging flows.

### Safeguard Functions

```typescript
function canAdminPostJob(user: User): AdminSafeguard {
  if (user.role === 'admin') {
    return {
      canAccess: false,
      reason: 'Admins cannot post jobs. This is a contractor feature.',
    };
  }
  return { canAccess: true };
}

function canAdminApplyToJob(user: User): AdminSafeguard {
  if (user.role === 'admin') {
    return {
      canAccess: false,
      reason: 'Admins cannot apply to jobs. This is a subcontractor feature.',
    };
  }
  return { canAccess: true };
}

function canAdminAccessMessaging(user: User): AdminSafeguard {
  if (user.role === 'admin') {
    return {
      canAccess: false,
      reason: 'Admins cannot participate in job messaging.',
    };
  }
  return { canAccess: true };
}
```

### Where Safeguards Apply

1. **Job Creation** (`/jobs/create`)
   - Blocks admins from posting jobs
   - Redirects to admin dashboard
   - Shows clear error message

2. **Job Applications** (`/jobs/[id]`)
   - Hides "Apply" button for admins
   - Shows informational alert
   - Explains feature restriction

3. **Messaging** (`/messages`)
   - Blocks admin access entirely
   - Redirects to admin dashboard
   - Shows clear error message

### Unauthorized Access Component

Component: `UnauthorizedAccess`

**Usage**:
```typescript
if (!safeguardCheck.canAccess) {
  return (
    <UnauthorizedAccess
      message={safeguardCheck.reason}
      redirectTo="/admin"
    />
  );
}
```

**Display**:
- Lock icon
- Clear explanation
- Redirect message
- Automatic redirect after 3 seconds

---

## Store Methods for Admin Features

### Audit Logs

```typescript
// Add audit log
store.addAuditLog(log: AuditLog): void

// Get all audit logs (sorted by newest)
store.getAuditLogs(): AuditLog[]

// Get logs for specific user
store.getAuditLogsByUser(userId: string): AuditLog[]

// Get logs for specific job
store.getAuditLogsByJob(jobId: string): AuditLog[]
```

### Admin Notes

```typescript
// Add admin note
store.addAdminNote(note: AdminNote): void

// Get notes for user
store.getAdminNotesByUser(userId: string): AdminNote[]

// Update existing note
store.updateAdminNote(noteId: string, updates: Partial<AdminNote>): void
```

---

## UI Components

### AuditLogView

**Purpose**: Display audit log entries with filtering and formatting

**Props**:
```typescript
interface AuditLogViewProps {
  logs: AuditLog[];
  users: User[];
  title?: string;
  emptyMessage?: string;
}
```

**Features**:
- Color-coded action badges
- Admin and target user names
- Timestamps
- Scrollable list
- Empty state handling

---

### AdminNotesPanel

**Purpose**: Display and create admin notes for users

**Props**:
```typescript
interface AdminNotesPanelProps {
  notes: AdminNote[];
  users: User[];
  onAddNote: (note: string) => void;
}
```

**Features**:
- Add new note form (togglable)
- Display all notes
- Show note author and timestamp
- Yellow highlighting
- Internal-only indicator

---

### JobTimelineView

**Purpose**: Display complete job history timeline

**Props**:
```typescript
interface JobTimelineViewProps {
  timeline: JobTimeline[];
}
```

**Features**:
- Vertical timeline layout
- Color-coded events
- Icons for event types
- Actor information
- Timestamps
- Connecting line between events

---

### AdminConfirmationDialog

**Purpose**: Confirmation dialog for admin actions

**Props**:
```typescript
interface AdminConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}
```

**Features**:
- Cancel button
- Confirm button (styled by variant)
- Warning icon for destructive
- Clear description

---

## Utility Functions

### createAuditLog

Creates a properly formatted audit log entry

```typescript
function createAuditLog(
  adminId: string,
  actionType: AuditActionType,
  details: string,
  metadata?: {
    targetUserId?: string;
    targetJobId?: string;
    targetReviewId?: string;
    additionalData?: Record<string, any>;
  }
): AuditLog
```

**Usage**:
```typescript
const log = createAuditLog(
  currentAdmin.id,
  'user_suspended',
  `Suspended user ${user.name} for violating terms`,
  { targetUserId: user.id, additionalData: { reason: 'spam' } }
);
store.addAuditLog(log);
```

---

### buildJobTimeline

Constructs complete job timeline from various data sources

```typescript
function buildJobTimeline(
  job: Job,
  applications: Application[],
  messages: Message[],
  users: User[]
): JobTimeline[]
```

**Returns**:
Array of timeline events sorted chronologically

**Usage**:
```typescript
const timeline = buildJobTimeline(
  job,
  applications,
  messages,
  store.users
);
```

---

### getAuditActionLabel

Converts action type to human-readable label

```typescript
function getAuditActionLabel(actionType: AuditActionType): string
```

**Examples**:
- `'user_suspended'` → `'User Suspended'`
- `'review_approved'` → `'Review Approved'`

---

### getAuditActionColor

Returns color classes for action type

```typescript
function getAuditActionColor(actionType: AuditActionType): string
```

**Returns**:
Tailwind CSS classes for background and text color

---

## Security Considerations

### Access Control
- All admin routes check `currentUser.role === 'admin'`
- Unauthorized users redirected immediately
- Clear error messages for non-admins

### Data Privacy
- Admin notes never visible to users
- Audit logs internal only
- User detail access requires admin role

### Action Validation
- Confirmation dialogs prevent accidents
- Destructive actions clearly marked
- Audit logs create accountability

### Safeguards
- Admins blocked from job posting
- Admins blocked from applying
- Admins blocked from messaging
- Clear explanations provided

---

## Admin Workflow Examples

### Investigating a User

1. Go to `/admin/users`
2. Click user row
3. View user details, stats
4. Review audit log for history
5. Read existing admin notes
6. Add new internal note if needed
7. Take action (verify/suspend) if required

### Monitoring a Job Dispute

1. Go to `/admin/jobs`
2. Click job to view details
3. Review complete timeline
4. Check cancellation details
5. View messages exchanged (count)
6. Review applications received
7. Note findings in user profiles
8. Create audit log of investigation

### Moderating Reviews

1. Go to `/admin/reviews`
2. View pending reviews
3. Read review content
4. Approve or reject with reason
5. Audit log created automatically
6. User notified of decision

---

## Best Practices

### For Admins Using the System

1. **Always Add Notes**: Document investigations and decisions
2. **Read Timeline**: Full context before taking action
3. **Double-Check Confirmations**: Especially destructive actions
4. **Review Audit Logs**: Regular oversight of admin activities
5. **Use Read-Only Views**: Don't participate, just monitor

### For Developers Extending the System

1. **Always Create Audit Logs**: Every major action needs logging
2. **Use Confirmation Dialogs**: All destructive actions
3. **Implement Safeguards**: Prevent admin participation
4. **Clear Error Messages**: Explain why actions are blocked
5. **Maintain Immutability**: Audit logs should never be edited
6. **Test Permissions**: Ensure admins can't bypass restrictions

---

## Future Enhancements

Potential additions:
- User suspension reasons and durations
- Bulk user operations
- Advanced audit log filtering
- Export audit logs for compliance
- Admin permission levels (super admin vs. moderator)
- Scheduled reports
- Automated flagging systems
- IP tracking and session logs
- Admin activity dashboard
- Role-based access control (RBAC)
