# AI Assistant for PTCL Incident Management System

This document provides information on how to set up and use the AI Assistant feature that has been integrated into the PTCL Incident Management System.

## Overview

The AI Assistant uses Google's Gemini 1.5 Flash API to provide intelligent, context-aware responses to questions about network incidents. It analyzes the data from recent incidents to help users understand patterns, troubleshoot issues, and get insights about the network status.

## Features

- Chat interface for asking questions about incidents
- Context-aware responses based on recent incident data
- Ability to minimize, maximize, or hide the assistant
- Automatic loading of relevant incident data for context
- **NEW: Advanced Memory System** that enables the AI to remember past conversations and user preferences

## Memory System

The AI Assistant now includes an advanced memory architecture with four types of memory:

### Short-Term Memory (STM)
- Stores current conversation history
- Enables the AI to reference recent messages within a session
- Remembers what topics were recently discussed

### Long-Term Memory (LTM)
- Stores important facts and insights extracted from conversations
- Persists between sessions
- Allows the AI to remember information from past interactions

### Episodic Memory (EM)
- Records complete conversation sessions organized by topic
- Enables the AI to reference past conversations about specific incidents
- Helps the AI understand recurring issues

### Contextual Memory
- Stores information about user preferences and work context
- Tailors responses to individual users
- Improves personalization over time

## Setup Instructions

### 1. Install Required Dependencies

The feature requires the following dependencies:

```bash
npm install @supabase/supabase-js uuid
```

### 2. Configure the API Keys

You need both a Gemini API key and Supabase credentials:

1. **Gemini API Key**:
   - Get a key from https://aistudio.google.com/
   - Add it to your `.env.local` file as `NEXT_PUBLIC_GEMINI_API_KEY`

2. **Supabase Setup (for memory system)**:
   - Ensure your Supabase URL and API key are in `.env.local`
   - Create the memory tables by running the SQL script in `sql/create_ai_memory_tables.sql` in your Supabase project

### 3. Restart the Development Server

Restart your Next.js development server to apply the changes:

```bash
npm run dev
```

## Using the AI Assistant

The AI Assistant, named "ROC Genie", is accessible from the homepage and can be toggled on/off with the "Show ROC Genie" / "Hide ROC Genie" button.

### New Features

- **Suggested Questions**: The assistant now suggests relevant follow-up questions based on your conversation
- **Conversation History**: The assistant remembers past conversations when you return
- **New Conversation Button**: Start a fresh conversation while preserving past memory
- **Memory Indicator**: Shows when the memory system is active

### Example Questions You Can Ask

1. "What are the most common fault types in the last month?"
2. "Show me recent incidents at Exchange XYZ"
3. "How many incidents are currently in progress?"
4. "What's the average resolution time for network outages?"
5. "Which exchanges have the most incidents?"
6. "Tell me about recent GPON faults"
7. "Can you remember what we discussed yesterday about Exchange-A?" (with memory system)

### Tips for Best Results

- Be specific in your questions
- Mention timeframes if relevant (e.g., "in the last week")
- Specify locations or exchanges if you want focused information
- For complex analysis, break down your questions into smaller parts
- The memory system works best when you use the same user account consistently

## Technical Details

The AI Assistant is implemented with the following components:

- `lib/geminiService.ts` - Service for interacting with the Gemini API
- `app/components/EnhancedAIAssistant.tsx` - Enhanced React component for the chat interface
- `app/components/ai-memory/` - Components for the memory system implementation
- Integration in the main page (`app/page.tsx`)

The memory system is built on:
- Supabase for persistent storage
- React hooks for state management
- TypeScript interfaces for type safety

## Troubleshooting

If you encounter issues with the AI Assistant:

1. **Assistant not appearing:** Check if you're logged in and if incidents data is being loaded correctly
2. **No response from AI:** Verify your API key is correct in `.env.local`
3. **Errors in console:** Check if you've installed all dependencies correctly
4. **Memory not working:** Verify your Supabase connection and that the tables are created

## Limitations

- The assistant only has access to incident data that has been loaded (usually the 30 most recent incidents)
- It can only answer questions about data it has access to
- The quality of responses depends on the quality and completeness of your incident data
- The memory system requires Supabase and is currently implemented as a proof of concept

## Future Enhancements

Potential future improvements to the AI Assistant:

- Integration with real-time incident updates
- Ability to take actions like creating tickets or updating incident status
- Custom training on your specific network terminology and procedures
- Advanced analytics capabilities and visualization generation
- Memory visualization interface for operators to view what the AI remembers
- Memory export/import for transferring AI knowledge between teams 