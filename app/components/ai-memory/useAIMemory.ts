import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from './types';
import { SupabaseMemoryManager } from './memoryService';

// Create an instance of the memory manager
const memoryManager = new SupabaseMemoryManager();

export interface UseAIMemoryResult {
  // Message management
  messages: Message[];
  addMessage: (content: string, role: 'user' | 'assistant') => Promise<void>;
  clearMessages: () => void;
  
  // Memory access
  recentTopics: string[];
  isInitialized: boolean;
  
  // Episode management
  startNewEpisode: (metadata?: Record<string, any>) => Promise<string>;
  endCurrentEpisode: (summary?: string) => Promise<void>;
  
  // Context management
  updateUserContext: (data: any) => Promise<void>;
  
  // Utility functions
  getSuggestedQuestions: () => Promise<string[]>;
}

export function useAIMemory(userId: string = ''): UseAIMemoryResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  
  // Generate a user ID if not provided
  const actualUserId = userId || getOrCreateUserId();
  
  // Initialize the memory system
  useEffect(() => {
    async function initialize() {
      try {
        await memoryManager.initialize();
        
        // Load short-term memory from storage if it exists
        const shortTermMemory = await memoryManager.getShortTermMemory(actualUserId);
        if (shortTermMemory) {
          setMessages(shortTermMemory.messages || []);
          setRecentTopics(shortTermMemory.recentTopics || []);
        }
        
        // Start a new episode
        const episodeId = await memoryManager.startEpisode(actualUserId);
        setCurrentEpisodeId(episodeId);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize AI memory:', error);
      }
    }
    
    initialize();
    
    // Clean up when component unmounts
    return () => {
      if (currentEpisodeId) {
        memoryManager.endEpisode(currentEpisodeId, "Session ended by unmounting").catch(console.error);
      }
    };
  }, [actualUserId]);
  
  // Add a message to the conversation
  const addMessage = async (content: string, role: 'user' | 'assistant') => {
    const newMessage: Message = {
      role,
      content,
      timestamp: new Date()
    };
    
    // Update local state
    setMessages(prev => [...prev, newMessage]);
    
    // Add to short-term memory
    try {
      await memoryManager.addToShortTermMemory(actualUserId, newMessage);
      
      // When an assistant response is added, update short-term memory topics
      if (role === 'assistant') {
        const shortTermMemory = await memoryManager.getShortTermMemory(actualUserId);
        if (shortTermMemory) {
          setRecentTopics(shortTermMemory.recentTopics || []);
        }
      }
    } catch (error) {
      console.error('Failed to add message to AI memory:', error);
    }
  };
  
  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };
  
  // Start a new conversation episode
  const startNewEpisode = async (metadata?: Record<string, any>) => {
    try {
      // End the current episode if it exists
      if (currentEpisodeId) {
        await memoryManager.endEpisode(currentEpisodeId);
      }
      
      // Start a new episode
      const episodeId = await memoryManager.startEpisode(actualUserId, metadata);
      setCurrentEpisodeId(episodeId);
      
      // Consolidate the short-term memory to long-term memory
      await memoryManager.consolidateToLongTermMemory(actualUserId);
      
      return episodeId;
    } catch (error) {
      console.error('Failed to start new AI memory episode:', error);
      return '';
    }
  };
  
  // End the current conversation episode
  const endCurrentEpisode = async (summary?: string) => {
    if (!currentEpisodeId) return;
    
    try {
      await memoryManager.endEpisode(currentEpisodeId, summary);
      setCurrentEpisodeId(null);
    } catch (error) {
      console.error('Failed to end AI memory episode:', error);
    }
  };
  
  // Update contextual information about the user
  const updateUserContext = async (data: any) => {
    try {
      await memoryManager.updateContextualMemory(actualUserId, data);
    } catch (error) {
      console.error('Failed to update user context in AI memory:', error);
    }
  };
  
  // Get suggested questions based on memory
  const getSuggestedQuestions = async (): Promise<string[]> => {
    try {
      // This would normally use LLM to generate suggestions based on memory
      // For demo, we'll return hardcoded suggestions based on recent topics
      if (recentTopics.length === 0) {
        return [
          "What are the most common fault types?",
          "Which exchanges have the most incidents?",
          "How many active incidents do we have?"
        ];
      }
      
      // Generate questions based on recent topics
      return recentTopics.slice(0, 3).map(topic => {
        const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
        const questionTypes = [
          `Tell me more about ${topic}?`,
          `What are the recent incidents related to ${topic}?`,
          `How many ${topic} incidents are active right now?`,
          `Are there any patterns in ${topic} incidents?`
        ];
        return questionTypes[Math.floor(Math.random() * questionTypes.length)];
      });
    } catch (error) {
      console.error('Failed to get suggested questions from AI memory:', error);
      return [];
    }
  };
  
  return {
    messages,
    addMessage,
    clearMessages,
    recentTopics,
    isInitialized,
    startNewEpisode,
    endCurrentEpisode,
    updateUserContext,
    getSuggestedQuestions
  };
}

// Helper function to get or create a user ID from localStorage
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') {
    return uuidv4(); // For SSR
  }
  
  let userId = localStorage.getItem('ai_memory_user_id');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('ai_memory_user_id', userId);
  }
  
  return userId;
} 