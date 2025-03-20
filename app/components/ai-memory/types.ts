// Define Message type locally instead of importing
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Base memory item structure
export interface MemoryItem {
  id: string;
  content: string;
  timestamp: Date;
  importance: number; // 1-10 rating of importance
  tags: string[]; // For categorization
  metadata?: Record<string, any>; // Additional metadata
}

// Short-term memory (current session)
export interface ShortTermMemory {
  userId: string;
  sessionId: string;
  messages: Message[];
  activeIncidents?: string[]; // IDs of incidents being discussed
  recentTopics: string[]; // Topics discussed in current session
  lastUpdated: Date;
}

// Long-term memory (persistent knowledge)
export interface LongTermMemoryItem extends MemoryItem {
  type: 'fact' | 'insight' | 'rule' | 'feedback';
  usageCount: number; // How often this memory has been recalled
  lastRecalled?: Date;
}

export interface LongTermMemory {
  userId: string;
  memories: LongTermMemoryItem[];
  lastUpdated: Date;
}

// Episodic memory (past interactions)
export interface Episode {
  id: string;
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  summary: string;
  messages: Message[];
  relatedIncidents: string[]; // IDs of incidents discussed
  topics: string[]; // Topics discussed
  metadata?: Record<string, any>;
}

export interface EpisodicMemory {
  userId: string;
  episodes: Episode[];
  lastUpdated: Date;
}

// Contextual memory (user preferences, work context)
export interface ContextualMemory {
  userId: string;
  role: string;
  preferences: {
    communicationStyle?: 'formal' | 'casual' | 'technical';
    responseLength?: 'concise' | 'detailed';
    favoriteTopic?: string[];
  };
  workContext: {
    currentIncident?: string;
    recentExchanges: string[];
    commonFaultTypes: string[];
    frequentSearches: string[];
  };
  lastUpdated: Date;
}

// Memory access and management interface
export interface MemoryManager {
  // Basic CRUD operations
  addToShortTermMemory(userId: string, message: Message): Promise<void>;
  getShortTermMemory(userId: string): Promise<ShortTermMemory | null>;
  consolidateToLongTermMemory(userId: string): Promise<void>;
  
  // Episodic memory operations
  startEpisode(userId: string, metadata?: Record<string, any>): Promise<string>;
  endEpisode(episodeId: string, summary?: string): Promise<void>;
  getRecentEpisodes(userId: string, limit?: number): Promise<Episode[]>;
  
  // Contextual memory operations
  updateContextualMemory(userId: string, context: Partial<ContextualMemory>): Promise<void>;
  getContextualMemory(userId: string): Promise<ContextualMemory | null>;
  
  // Cross-memory retrieval
  searchMemories(userId: string, query: string): Promise<MemoryItem[]>;
  getRelatedMemories(userId: string, topic: string): Promise<MemoryItem[]>;
  
  // Memory optimization
  pruneOldMemories(userId: string, olderThan: Date): Promise<void>;
  reinforceMemory(memoryId: string): Promise<void>;
} 