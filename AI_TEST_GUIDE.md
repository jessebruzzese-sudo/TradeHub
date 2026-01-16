# TradeHub AI Endpoint Testing Guide

## Overview

TradeHub now includes AI-powered features to help users create better content faster:

1. **Draft Tender with AI** - Contractors can generate professional tender descriptions
2. **Suggest Reply** - Get 3 AI-suggested replies in message conversations
3. **Write Quote Message** - Subcontractors can generate professional quote messages

All AI features:
- Are fully integrated into the UI with sparkles (✨) buttons
- Work client-side by calling the `/api/ai` endpoint
- Show loading states during generation
- Display clear error messages if something goes wrong
- Allow users to edit AI-generated content before submitting
- Never expose API keys to the client

## Setup

1. Make sure you have an OpenAI API key
2. Add it to your `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
3. Start the development server: `npm run dev`

## Manual Test (Browser Console)

Open your browser console and run this command:

```javascript
fetch("/api/ai", {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({
    mode: "general",
    userId: "test",
    messages: [{ role: "user", content: "Say hi" }]
  })
}).then(r => r.text()).then(console.log);
```

### Expected Response

You should see a JSON response like:
```json
{"message":{"role":"assistant","content":"Hi! How can I help you today?"}}
```

### Error Scenarios

#### Missing API Key
If you see:
```json
{"error":"Server missing OPENAI_API_KEY env var. Add it to .env file or environment settings."}
```
→ Add your OpenAI API key to the `.env` file

#### Invalid Request
If you see:
```json
{"error":"Invalid or empty JSON body sent to /api/ai."}
```
→ Check that your request body is valid JSON

#### Rate Limited
If you see:
```json
{"error":"Please wait a moment."}
```
→ Wait 2.5 seconds between requests

```json
{"error":"Daily AI limit reached."}
```
→ You've hit the 60 requests/day limit

## Testing All AI Features

### 1. Draft Tender with AI (Contractor)
**Location:** `/tenders/create` - Step 1 (Project Details)

**How to test:**
1. Sign in as a contractor
2. Navigate to Create New Tender
3. Enter a project name (required for AI to work)
4. Optionally add trade requirements, location, etc.
5. Click "Draft with AI" button below the Project Description field
6. Wait for AI to generate a description
7. The description field will be populated with AI-generated content
8. Edit as needed before continuing

**Expected behavior:**
- Button shows "Drafting..." while loading
- AI generates a professional project description based on context
- Description is editable after being inserted
- Error message shows if AI fails

### 2. Suggest Reply (Messages)
**Location:** `/messages` - Chat composer

**How to test:**
1. Sign in (contractor or subcontractor)
2. Navigate to Messages
3. Select an active conversation with message history
4. Look for the sparkles (✨) icon button to the left of the message input
5. Click the sparkles button
6. Wait for AI to generate suggestions
7. Three suggested replies will appear as clickable chips above the input
8. Click any suggestion to insert it into the message field
9. Edit or send the message

**Expected behavior:**
- Button is disabled while loading
- AI analyzes the last 8 messages in the conversation
- Returns 3 distinct reply options (Friendly, Firm, Very brief)
- Clicking a suggestion populates the message input
- Suggestions disappear after selection
- Error message shows if AI fails

### 3. Write Quote Message with AI (Subcontractor)
**Location:** `/tenders/[id]` - Submit Quote section

**How to test:**
1. Sign in as a subcontractor
2. Navigate to a live tender that matches your trade
3. Go to the "Submit Quote" tab
4. Look for "Write with AI" button below the Additional Notes field
5. Click the button
6. Wait for AI to generate a quote message
7. The Additional Notes field will be populated with a professional quote message
8. Edit as needed before submitting

**Expected behavior:**
- Button shows "Writing..." while loading
- AI generates a professional quote message template
- Uses placeholders instead of inventing exact prices
- Message is editable after being inserted
- Error message shows if AI fails

## Troubleshooting

### "Unexpected end of JSON input"
This error is now fixed! The client now:
1. Reads the raw response as text first
2. Safely parses JSON
3. Shows the raw response in error messages if something goes wrong

### OpenAI API Errors
Common errors:
- `Invalid API key`: Check your API key is correct
- `Model not found`: The route uses `gpt-4o-mini` - make sure you have access
- `Rate limit exceeded`: You've exceeded your OpenAI account limits

### Build-time Errors
The OpenAI client is now initialized lazily (only when needed) to avoid errors during build time.
