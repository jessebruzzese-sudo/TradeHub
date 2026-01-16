# Messaging System Documentation

## Overview

The messaging system is hardened with comprehensive edge case handling, validation, and safeguards to ensure reliable job-based communication between contractors and subcontractors.

## Core Principles

1. **Job-Based Only**: All conversations are tied to specific jobs
2. **Read-Only for Terminal States**: Messaging disabled for cancelled/completed/closed jobs
3. **Validation**: All messages validated before sending
4. **System Messages**: Automatic notifications for job status changes
5. **No Duplicates**: System messages are deduplicated

## Messaging States

### Active Messaging (canSendMessages: true)
Jobs in these statuses allow active messaging:
- `open` - Job posted, discussing details
- `pending_approval` - Selected subcontractor reviewing
- `accepted` - Subcontractor accepted, contractor confirming
- `confirmed` - Job active, ongoing communication

### Read-Only Messaging (isReadOnly: true)
Jobs in these statuses become read-only:
- `cancelled` - Job cancelled, historical record only
- `completed` - Job finished, archived conversation
- `closed` - Job posting closed, no longer active

### Disabled Messaging
Messaging also disabled for:
- Users with `trustStatus: 'pending'` (account not yet approved)
- Invalid/missing job or user data
- Conversations that cannot be loaded

## Edge Cases Handled

### 1. Empty Message Threads

**Scenario**: Conversation exists but no messages have been sent yet.

**Behavior**:
- Shows friendly empty state UI
- Displays other user's name
- Encourages starting conversation
- System messages (if any) still visible

**UI Component**: `EmptyMessages`
```typescript
<EmptyMessages otherUserName={otherUser?.name} />
```

---

### 2. Failed Message Send

**Scenarios**:
- Network error during send
- Message validation failure (empty, too long, too many links)
- Invalid conversation state

**Behavior**:
- Message validation runs client-side before sending
- Error displayed below input field
- Send button disabled during transmission
- Clear, specific error messages:
  - "Message cannot be empty"
  - "Message is too long (max 5000 characters)"
  - "Too many links in message (max 5)"
  - "Network error. Please check your connection and try again."

**Validation Rules**:
```typescript
- Cannot be empty (after trim)
- Max 5000 characters
- Max 5 URLs per message
```

**Error Recovery**:
- User's text preserved on validation error
- Can edit and retry
- Errors clear on successful send
- Errors clear when switching conversations

---

### 3. Messaging Disabled for Cancelled Jobs

**Scenario**: Job is cancelled by either party.

**Behavior**:
- Input field replaced with locked alert
- Message: "This job has been cancelled. Messaging is now read-only."
- Previous messages remain visible
- System message added: "Job has been cancelled: [reason]"
- No send button visible

**UI**:
- Lock icon displayed
- Gray alert background
- Clear explanation text

---

### 4. Messaging Disabled for Completed Jobs

**Scenario**: Job marked as completed.

**Behavior**:
- Input field replaced with locked alert
- Message: "This job has been completed. Messaging is now read-only."
- Previous messages remain visible
- System message added: "Job has been marked as completed"

---

### 5. Messaging Disabled for Closed Jobs

**Scenario**: Job posting closed without hiring.

**Behavior**:
- Input field replaced with locked alert
- Message: "This job posting has been closed. Messaging is now read-only."
- Conversation archived

---

### 6. Messaging Disabled for Pending Users

**Scenario**: User account is pending approval (trustStatus: 'pending').

**Behavior**:
- Cannot send messages in any conversation
- Message: "Your account is pending approval. Messaging will be enabled once approved."
- Can still view conversations (read-only)

---

### 7. Clear System Messages for Status Changes

System messages are automatically added when job status changes:

#### Status: Accepted
**Message**: "Subcontractor accepted the job offer"
**Triggered**: When subcontractor accepts job from pending_approval

#### Status: Confirmed
**Message**: "Job confirmed! Both parties are ready to proceed."
**Triggered**: When contractor confirms hire after acceptance

#### Status: Completed
**Message**: "Job has been marked as completed"
**Triggered**: When contractor marks job as done

#### Status: Cancelled
**Message**: "Job has been cancelled: [cancellation reason]"
**Triggered**: When either party cancels the job
**Special**: Includes cancellation reason if provided

#### Status: Pending Approval
**Message**: "Subcontractor has been selected and notified"
**Triggered**: When contractor selects an applicant

#### Status: Reopened
**Message**: "Job reopened for applications"
**Triggered**: When closed job is reopened (if not expired)

#### Status: Closed
**Message**: "Job posting has been closed"
**Triggered**: When job closed without hiring

---

### 8. Prevent Duplicate System Messages

**Problem**: Multiple rapid status changes could create duplicate system messages.

**Solution**: Deduplication logic implemented

```typescript
function shouldAddSystemMessage(
  existingMessages: Message[],
  jobStatus: JobStatus
): boolean {
  // Find recent system messages about this status
  const recentSystemMessages = existingMessages.filter(
    (m) => m.isSystemMessage &&
           m.text.toLowerCase().includes(getStatusKeyword(jobStatus))
  );

  // No existing message? Add it
  if (recentSystemMessages.length === 0) {
    return true;
  }

  // Check if last system message was > 5 minutes ago
  const lastSystemMessage = recentSystemMessages[recentSystemMessages.length - 1];
  const timeSinceLastMessage = Date.now() - lastSystemMessage.createdAt.getTime();
  const fiveMinutes = 5 * 60 * 1000;

  // Only add if more than 5 minutes have passed
  return timeSinceLastMessage > fiveMinutes;
}
```

**Rules**:
- System messages for same status within 5 minutes are blocked
- Prevents spam from rapid status changes
- Different statuses can have messages immediately

---

## UI Components

### MessageInput
Intelligent input component that adapts to messaging state:

**Props**:
- `messagingState` - Current permissions and restrictions
- `messageText` - Current input value
- `onMessageChange` - Handler for text changes
- `onSendMessage` - Handler for send action
- `isSending` - Loading state
- `error` - Error message to display

**Features**:
- Character counter (5000 limit)
- Enter key to send (Shift+Enter for new line)
- Disabled state when sending
- Lock icon for read-only state
- Error alerts above input

---

### MessageBubble
Renders individual messages with proper styling:

**Types**:

1. **User Messages**:
   - Blue background for current user
   - Gray background for other user
   - Right-aligned for current user
   - Left-aligned for other user
   - Timestamp in small text
   - Text wrapping and line breaks preserved

2. **System Messages**:
   - Centered layout
   - Gray background with border
   - Info icon
   - Full timestamp (date + time)
   - Distinguished styling

---

### EmptyMessages
Friendly empty state when no user messages exist:

**Display**:
- Centered layout
- Message icon
- "No messages yet" heading
- Personalized text with other user's name
- Encouragement to start conversation

---

## Message Validation

### Client-Side Validation

All validation happens before attempting to send:

```typescript
interface MessageValidation {
  isValid: boolean;
  error?: string;
}

function validateMessage(text: string): MessageValidation
```

**Checks**:
1. **Not Empty**: After trimming whitespace
2. **Length**: Max 5000 characters
3. **URL Count**: Max 5 URLs per message
4. **Format**: Valid text string

**Error Messages**:
- Clear, user-friendly
- Specific to violation
- Immediately visible

---

## Auto-Scrolling

Messages automatically scroll to bottom:

**Triggers**:
- When new message arrives
- When conversation changes
- When page loads with messages

**Implementation**:
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages.length]);
```

**Behavior**:
- Smooth scrolling animation
- Non-intrusive
- Respects user scroll position when possible

---

## Conversation Management

### Conversation Updates

**Last Message Tracking**:
When a message is added, the conversation is automatically updated:

```typescript
addMessage(message) {
  this.messages.push(message);
  const conversation = this.conversations.find((c) => c.id === message.conversationId);
  if (conversation) {
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
  }
}
```

**Benefits**:
- Conversations sorted by recent activity
- Last message preview in sidebar
- Timestamp updates automatically

---

## Integration with Job Lifecycle

System messages are automatically added when:

1. **Job Status Changes** (in job detail page):
   - Cancellation (with reason)
   - Completion

2. **Job Actions in Messages** (in messages page):
   - Accept job
   - Confirm hire

**Flow**:
```typescript
// 1. Update job status
store.updateJob(job.id, { status: 'cancelled', ... });

// 2. Find related conversation
const conversation = store.conversations.find(
  (c) => c.jobId === job.id && ...
);

// 3. Check if system message should be added (no duplicates)
if (conversation && shouldAddSystemMessage(messages, 'cancelled')) {
  const systemMsg = createSystemMessage(
    conversation.id,
    'cancelled',
    cancellationReason
  );
  store.addMessage(systemMsg);
}
```

---

## Security Considerations

### Access Control
- Users can only access conversations they're part of
- Contractor and subcontractor verified on each message
- Job ownership validated before actions

### Data Validation
- All input sanitized
- No XSS vulnerabilities
- URL limits prevent abuse
- Length limits prevent overflow

### Read-Only Enforcement
- Terminal job states strictly enforced
- Cannot be bypassed client-side
- Server-side validation required for production

---

## Error Handling

### Network Errors
```typescript
try {
  const result = createMessage(...);
  store.addMessage(result.message);
} catch (error) {
  setSendError('Network error. Please check your connection and try again.');
}
```

### Validation Errors
- Caught before network request
- Immediate user feedback
- No failed requests

### State Errors
- Graceful degradation
- Fallback to read-only
- Clear error messages

---

## Testing Considerations

### Test Cases

1. **Empty Threads**
   - Create conversation without messages
   - Verify empty state UI
   - Send first message

2. **Failed Sends**
   - Test with empty message
   - Test with 5001 characters
   - Test with 6 URLs
   - Simulate network failure

3. **Terminal States**
   - Cancel job, verify read-only
   - Complete job, verify read-only
   - Close job, verify read-only

4. **Pending Users**
   - Set trustStatus to 'pending'
   - Verify all messaging disabled

5. **System Messages**
   - Change job status multiple times
   - Verify no duplicate messages
   - Check 5-minute cooldown

6. **Status Changes**
   - Accept job in messages
   - Confirm hire in messages
   - Cancel from job page
   - Complete from job page
   - Verify system messages appear

7. **Auto-Scroll**
   - Send multiple messages
   - Switch conversations
   - Verify smooth scrolling

8. **Error Recovery**
   - Trigger validation error
   - Edit message
   - Successfully send
   - Verify error cleared

---

## Future Enhancements

Potential additions:
- Message attachments (images, documents)
- Read receipts
- Typing indicators
- Message editing/deletion
- Message search
- Push notifications
- Email notifications for offline users
- Bulk message operations
- Message templates
- Conversation archiving
- Report inappropriate messages
