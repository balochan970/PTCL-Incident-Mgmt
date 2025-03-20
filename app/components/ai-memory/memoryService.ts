import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { 
  Message, 
  ShortTermMemory, 
  LongTermMemory,
  LongTermMemoryItem, 
  EpisodicMemory, 
  Episode,
  ContextualMemory,
  MemoryManager
} from './types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseMemoryManager implements MemoryManager {
  // Table names
  private readonly STM_TABLE = 'ai_short_term_memory';
  private readonly LTM_TABLE = 'ai_long_term_memory';
  private readonly EPISODIC_TABLE = 'ai_episodic_memory';
  private readonly CONTEXTUAL_TABLE = 'ai_contextual_memory';

  // Initialize the memory system - creates necessary tables if they don't exist
  async initialize(): Promise<void> {
    // This would normally be done through migrations or Supabase dashboard
    // For demonstration, we'll assume tables are already created
    
    // The actual implementation would create tables with proper schemas:
    /*
    await supabase.rpc('create_memory_tables', {});
    */

    console.log('Memory system initialized');
  }

  // Short-Term Memory Implementation
  async addToShortTermMemory(userId: string, message: Message): Promise<void> {
    // First, try to get the existing short-term memory
    const { data: stmData } = await supabase
      .from(this.STM_TABLE)
      .select('*')
      .eq('userId', userId)
      .single();

    if (!stmData) {
      // Create new short-term memory if it doesn't exist
      const sessionId = uuidv4();
      const newSTM: ShortTermMemory = {
        userId,
        sessionId,
        messages: [message],
        recentTopics: this.extractTopics(message.content),
        lastUpdated: new Date()
      };

      await supabase
        .from(this.STM_TABLE)
        .insert({
          userId,
          sessionId,
          messages: newSTM.messages,
          recentTopics: newSTM.recentTopics,
          lastUpdated: newSTM.lastUpdated.toISOString()
        });
    } else {
      // Update existing short-term memory
      const updatedMessages = [...stmData.messages, message];
      const updatedTopics = [
        ...stmData.recentTopics,
        ...this.extractTopics(message.content)
      ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 10); // Keep unique, limit to 10

      await supabase
        .from(this.STM_TABLE)
        .update({
          messages: updatedMessages,
          recentTopics: updatedTopics,
          lastUpdated: new Date().toISOString()
        })
        .eq('userId', userId);
    }
  }

  async getShortTermMemory(userId: string): Promise<ShortTermMemory | null> {
    const { data } = await supabase
      .from(this.STM_TABLE)
      .select('*')
      .eq('userId', userId)
      .single();

    if (!data) return null;

    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated)
    } as ShortTermMemory;
  }

  // Long-Term Memory Implementation
  async consolidateToLongTermMemory(userId: string): Promise<void> {
    // Get the short-term memory
    const stm = await this.getShortTermMemory(userId);
    if (!stm) return;

    // Extract important facts/insights from the conversation
    const memories = this.extractMemoriesFromMessages(userId, stm.messages);
    
    // Get existing long-term memory
    const { data: ltmData } = await supabase
      .from(this.LTM_TABLE)
      .select('*')
      .eq('userId', userId)
      .single();

    if (!ltmData) {
      // Create new long-term memory
      await supabase
        .from(this.LTM_TABLE)
        .insert({
          userId,
          memories,
          lastUpdated: new Date().toISOString()
        });
    } else {
      // Update existing long-term memory, avoiding duplicates
      const existingIds = ltmData.memories.map((m: LongTermMemoryItem) => m.id);
      const newMemories = memories.filter(m => !existingIds.includes(m.id));
      
      await supabase
        .from(this.LTM_TABLE)
        .update({
          memories: [...ltmData.memories, ...newMemories],
          lastUpdated: new Date().toISOString()
        })
        .eq('userId', userId);
    }
  }

  // Episodic Memory Implementation
  async startEpisode(userId: string, metadata?: Record<string, any>): Promise<string> {
    const episodeId = uuidv4();
    const episode: Episode = {
      id: episodeId,
      userId,
      sessionId: uuidv4(),
      startTime: new Date(),
      summary: "Session started",
      messages: [],
      relatedIncidents: [],
      topics: [],
      metadata
    };

    await supabase
      .from(this.EPISODIC_TABLE)
      .insert({
        id: episode.id,
        userId: episode.userId,
        sessionId: episode.sessionId,
        startTime: episode.startTime.toISOString(),
        summary: episode.summary,
        messages: episode.messages,
        relatedIncidents: episode.relatedIncidents,
        topics: episode.topics,
        metadata: episode.metadata
      });

    return episodeId;
  }

  async endEpisode(episodeId: string, summary?: string): Promise<void> {
    await supabase
      .from(this.EPISODIC_TABLE)
      .update({
        endTime: new Date().toISOString(),
        summary: summary || "Session ended"
      })
      .eq('id', episodeId);
  }

  async getRecentEpisodes(userId: string, limit: number = 5): Promise<Episode[]> {
    const { data } = await supabase
      .from(this.EPISODIC_TABLE)
      .select('*')
      .eq('userId', userId)
      .order('startTime', { ascending: false })
      .limit(limit);

    if (!data) return [];

    return data.map(episode => ({
      ...episode,
      startTime: new Date(episode.startTime),
      endTime: episode.endTime ? new Date(episode.endTime) : undefined
    })) as Episode[];
  }

  // Contextual Memory Implementation
  async updateContextualMemory(userId: string, context: Partial<ContextualMemory>): Promise<void> {
    const { data } = await supabase
      .from(this.CONTEXTUAL_TABLE)
      .select('*')
      .eq('userId', userId)
      .single();

    if (!data) {
      // Create new contextual memory
      const defaults: ContextualMemory = {
        userId,
        role: 'user',
        preferences: {},
        workContext: {
          recentExchanges: [],
          commonFaultTypes: [],
          frequentSearches: []
        },
        lastUpdated: new Date()
      };

      await supabase
        .from(this.CONTEXTUAL_TABLE)
        .insert({
          ...defaults,
          ...context,
          lastUpdated: new Date().toISOString()
        });
    } else {
      // Update existing contextual memory
      await supabase
        .from(this.CONTEXTUAL_TABLE)
        .update({
          ...context,
          lastUpdated: new Date().toISOString()
        })
        .eq('userId', userId);
    }
  }

  async getContextualMemory(userId: string): Promise<ContextualMemory | null> {
    const { data } = await supabase
      .from(this.CONTEXTUAL_TABLE)
      .select('*')
      .eq('userId', userId)
      .single();

    if (!data) return null;

    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated)
    } as ContextualMemory;
  }

  // Cross-memory retrieval
  async searchMemories(userId: string, query: string): Promise<LongTermMemoryItem[]> {
    // In a real implementation, this would use Supabase's text search capabilities
    // For now, we'll retrieve all memories and filter them client-side
    const { data: ltmData } = await supabase
      .from(this.LTM_TABLE)
      .select('*')
      .eq('userId', userId)
      .single();

    if (!ltmData) return [];

    // Simple search implementation
    const searchTerms = query.toLowerCase().split(' ');
    return ltmData.memories.filter((memory: LongTermMemoryItem) => {
      const content = memory.content.toLowerCase();
      return searchTerms.some(term => content.includes(term));
    });
  }

  async getRelatedMemories(userId: string, topic: string): Promise<LongTermMemoryItem[]> {
    const { data: ltmData } = await supabase
      .from(this.LTM_TABLE)
      .select('*')
      .eq('userId', userId)
      .single();

    if (!ltmData) return [];

    // Find memories with matching tags
    return ltmData.memories.filter((memory: LongTermMemoryItem) => {
      return memory.tags.some(tag => tag.toLowerCase() === topic.toLowerCase());
    });
  }

  // Memory optimization
  async pruneOldMemories(userId: string, olderThan: Date): Promise<void> {
    const { data: ltmData } = await supabase
      .from(this.LTM_TABLE)
      .select('*')
      .eq('userId', userId)
      .single();

    if (!ltmData) return;

    const prunedMemories = ltmData.memories.filter((memory: LongTermMemoryItem) => {
      const memoryDate = new Date(memory.timestamp);
      return memoryDate >= olderThan || memory.importance > 7; // Keep important memories
    });

    await supabase
      .from(this.LTM_TABLE)
      .update({
        memories: prunedMemories,
        lastUpdated: new Date().toISOString()
      })
      .eq('userId', userId);
  }

  async reinforceMemory(memoryId: string): Promise<void> {
    // This would increase the usage count and potentially importance of a memory
    // We would need to find which user's memory it is first
    const { data } = await supabase
      .from(this.LTM_TABLE)
      .select('*');

    if (!data) return;

    for (const record of data) {
      const memoryIndex = record.memories.findIndex((m: LongTermMemoryItem) => m.id === memoryId);
      
      if (memoryIndex >= 0) {
        const memory = record.memories[memoryIndex];
        memory.usageCount += 1;
        memory.lastRecalled = new Date();
        
        // If a memory is used often, it might become more important
        if (memory.usageCount > 10 && memory.importance < 10) {
          memory.importance += 1;
        }

        await supabase
          .from(this.LTM_TABLE)
          .update({
            memories: record.memories,
            lastUpdated: new Date().toISOString()
          })
          .eq('userId', record.userId);
        
        break;
      }
    }
  }

  // Helper methods
  private extractTopics(content: string): string[] {
    // This would use NLP in a real implementation
    // For demonstration, we'll use a simple keyword extraction
    const commonWords = new Set([
      'the', 'and', 'a', 'in', 'of', 'to', 'is', 'that', 'for', 'it', 'with',
      'as', 'was', 'on', 'are', 'be', 'this', 'have', 'or', 'by', 'not'
    ]);
    
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => !commonWords.has(word) && word.length > 3);
    
    // Get unique words and take the top 5 as "topics"
    return Array.from(new Set(words)).slice(0, 5);
  }

  private extractMemoriesFromMessages(userId: string, messages: Message[]): LongTermMemoryItem[] {
    // In a real implementation, this would use NLP to extract key facts
    // For now, we'll create a simple memory from each assistant message
    return messages
      .filter(msg => msg.role === 'assistant')
      .map(msg => {
        const topics = this.extractTopics(msg.content);
        return {
          id: uuidv4(),
          content: msg.content.length > 100 
            ? msg.content.substring(0, 100) + '...' 
            : msg.content,
          timestamp: msg.timestamp,
          importance: 5, // Default medium importance
          tags: topics,
          type: 'insight',
          usageCount: 1,
          lastRecalled: new Date()
        };
      });
  }
} 