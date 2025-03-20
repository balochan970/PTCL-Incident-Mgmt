# AI Memory System for PTCL Incident Management

The AI Memory System enhances the AI Assistant with multiple types of memory to provide more contextual, personalized, and intelligent responses over time.

## Memory Types

The system implements four types of memory:

### 1. Short-Term Memory (STM)
Short-term memory stores the current conversation state, allowing the AI to reference recent messages and maintain context within a single session.

- **Storage**: Conversation messages, recent topics discussed
- **Purpose**: Maintain context in the current conversation
- **Persistence**: Lasts for the current session, can be loaded when user returns

### 2. Long-Term Memory (LTM)
Long-term memory stores important facts, insights, and learnings extracted from conversations for future reference.

- **Storage**: Knowledge facts, insights, rules
- **Purpose**: Personalize responses based on past interactions
- **Persistence**: Persists between sessions indefinitely

### 3. Episodic Memory (EM)
Episodic memory stores complete conversation episodes linked to specific incidents or tasks.

- **Storage**: Complete conversation sessions
- **Purpose**: Reference past conversations about specific topics
- **Persistence**: Persists between sessions, can be pruned over time

### 4. Contextual Memory
Contextual memory stores information about the user's preferences, role, and work context.

- **Storage**: User preferences, common incidents they work with
- **Purpose**: Tailor responses to the user's specific work context
- **Persistence**: Updated over time as user preferences evolve

## Architecture

The memory system uses Supabase for storage and implements:

1. **Memory Manager**: Handles CRUD operations for all memory types
2. **React Hook**: Provides a simple interface for React components to interact with memory
3. **SQL Schema**: Defines the database structure for storing memories
4. **Enhanced Assistant**: Uses the memory system to provide better responses

## Implementation Details

### Database Schema

The system uses four main tables:

- `ai_short_term_memory`: Stores current conversation state
- `ai_long_term_memory`: Stores persistent knowledge
- `ai_episodic_memory`: Stores past conversations
- `ai_contextual_memory`: Stores user preferences

### Memory Manager

The `SupabaseMemoryManager` class implements the `MemoryManager` interface, providing methods to:

- Add messages to short-term memory
- Consolidate short-term memory to long-term memory
- Start and end conversation episodes
- Update contextual information
- Search across memories
- Manage memory lifecycle (pruning, reinforcement)

### React Hook Usage

The `useAIMemory` hook provides an easy interface for components:

```typescript
const {
  messages,              // Current conversation messages
  addMessage,            // Add a message to the conversation
  clearMessages,         // Clear all messages
  recentTopics,          // Topics extracted from conversation
  isInitialized,         // Whether memory system is ready
  startNewEpisode,       // Start a new conversation episode
  endCurrentEpisode,     // End the current episode
  updateUserContext,     // Update user preferences
  getSuggestedQuestions  // Get AI-suggested follow-up questions
} = useAIMemory(userId);
```

## Setup Instructions

1. **Create Database Tables**:
   - Run the SQL script in `sql/create_ai_memory_tables.sql` in your Supabase project

2. **Configure Environment Variables**:
   - Ensure your Supabase URL and API key are set in `.env.local`

3. **Import and Use the Enhanced Assistant**:
   - Replace the standard `AIAssistant` with `EnhancedAIAssistant` in your components

## Features Enabled by Memory

- **Question Suggestions**: The AI suggests relevant follow-up questions based on conversation context
- **Personalized Responses**: The AI remembers user preferences and tailors responses
- **Context Awareness**: The AI references past conversations about similar topics
- **Conversation Continuity**: Users can pick up conversations where they left off

## Future Enhancements

- **Memory Visualization**: Allow users to explore and manage their AI's memory
- **Memory Pruning**: Automatically remove less relevant memories over time
- **Memory Export/Import**: Allow users to backup or transfer their AI's memory
- **Collaborative Memory**: Share memories between teams working on similar incidents

## Limitations

- The current implementation is a proof of concept and may require optimization for production use
- Advanced NLP for topic extraction would improve memory organization
- The Supabase implementation assumes you're using Supabase for other aspects of the application 