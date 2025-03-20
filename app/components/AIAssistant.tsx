"use client";

import { useState, useRef, useEffect } from 'react';
import { queryGemini } from '@/lib/geminiService';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, Loader2, X, MinusCircle, Maximize2, Minimize2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  incidents: any[];
}

export default function AIAssistant({ incidents }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add a welcome message when the component mounts
  useEffect(() => {
    const welcomeMessage: Message = {
      role: 'assistant',
      content: `Hello! I'm ROC Genie, your PTCL Incident Management assistant. I have access to data on ${incidents.length} recent incidents in the system.

I can help you with questions like:
• How many incidents are registered?
• What are the most common fault types?
• Which exchanges have the most incidents?
• How many incidents are currently in progress?

How can I assist you today?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [incidents]);

  // Scroll to the bottom of the messages when new ones are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Add the user message to the chat
    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get response from Gemini API
      const response = await queryGemini(userMessage.content, incidents);

      // Add the AI response to the chat
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Add an error message
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format the timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 rounded-full p-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg z-50"
      >
        <Bot size={24} />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 shadow-xl transition-all duration-300 z-50 ${isExpanded ? 'w-[80vw] h-[80vh]' : 'w-96 h-[450px]'}`}>
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between bg-gray-50 dark:bg-gray-800 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">ROC Genie</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {isExpanded ? (
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(true)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)}>
            <MinusCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 overflow-y-auto flex-1" style={{ height: 'calc(100% - 140px)' }}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`px-4 py-2 rounded-lg max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div 
                  className={`text-xs mt-1 ${
                    message.role === 'user' 
                      ? 'text-blue-100' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                <span className="text-gray-700 dark:text-gray-200">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2 border-t bg-gray-50 dark:bg-gray-800">
        <div className="flex w-full items-center gap-2">
          <Textarea
            placeholder="Ask a question about incidents..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-10 resize-none"
          />
          <Button 
            size="icon" 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputValue.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 