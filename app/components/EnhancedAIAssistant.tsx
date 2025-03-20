"use client";

import { useState, useRef, useEffect } from 'react';
import { queryGemini, detectCreateIncidentIntent, extractIncidentDetails, createIncident, IncidentDetails } from '@/lib/geminiService';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, Loader2, X, MinusCircle, Maximize2, Minimize2, BrainCircuit, RotateCcw, Lightbulb, Sparkles } from 'lucide-react';
import { useAIMemory } from './ai-memory/useAIMemory';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedAIAssistantProps {
  incidents: any[];
  username?: string;
}

export default function EnhancedAIAssistant({ incidents, username }: EnhancedAIAssistantProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCreatingIncident, setIsCreatingIncident] = useState(false);
  const [incidentDetails, setIncidentDetails] = useState<any>(null);
  
  // Get the user ID from auth
  const userId = getUserIdFromAuth();
  
  // Use our AI memory hook
  const {
    messages,
    addMessage,
    clearMessages,
    recentTopics,
    isInitialized,
    startNewEpisode,
    getSuggestedQuestions
  } = useAIMemory(userId);

  // Define AI name
  const aiName = "ROC Genie";
  
  // Add avatar images
  const botAvatar = "https://img.icons8.com/color/96/null/wizard.png";
  const userAvatar = "https://img.icons8.com/color/96/null/person-male.png";

  // Initialize assistant with welcome message and suggested questions
  useEffect(() => {
    const addInitialMessage = async () => {
      if (messages.length === 0) {
        const initialMessage = `Hello${username ? ` ${username}` : ''}! I'm ${aiName}! I'm here to help you manage and analyze incidents. You can ask me about incidents, and I can help you create new ones too. How can I assist you today?`;
        const initialSuggestions = [
          "What's the total number of incidents?",
          "Show me active incidents",
          "Which exchange has the most incidents?",
          "I want to create a new incident",
        ];
        
        await addMessage(initialMessage, 'assistant');
        setSuggestedQuestions(initialSuggestions);
        setShowSuggestions(true);
      }
    };
    
    addInitialMessage();
  }, []);

  // Update suggested questions when topics change
  useEffect(() => {
    if (isInitialized) {
      updateSuggestedQuestions();
    }
  }, [recentTopics, isInitialized]);

  // Scroll to the bottom of the messages when new ones are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to update suggested questions based on context
  const updateSuggestedQuestions = () => {
    // Reset if we were in incident creation
    if (isCreatingIncident) {
      setIsCreatingIncident(false);
      setIncidentDetails(null);
    }
    
    // Generate new questions based on context
    const newQuestions = [
      "What is the status of active incidents?",
      "How many GPON incidents do we have?",
      "What are the top 3 exchanges with incidents?",
      "I need to create a new incident",
    ];
    
    setSuggestedQuestions(newQuestions);
  };

  // Function to handle sending a message
  const handleSendMessage = async (content: string = inputValue.trim()) => {
    if (!content || isLoading) return;

    // Add the user message to the chat
    await addMessage(content, 'user');
    setInputValue('');
    setIsLoading(true);

    try {
      // Check if user wants to create an incident
      const isCreateIncidentIntent = await detectCreateIncidentIntent(content);
      
      if (isCreateIncidentIntent) {
        // Extract incident details
        const extractionResult = await extractIncidentDetails(content);
        
        if (extractionResult.success) {
          setIncidentDetails(extractionResult.data);
          setIsCreatingIncident(true);
          
          // Format the details for better readability
          const details = extractionResult.data;
          
          // Check completeness of details
          const missingDetails = [];
          if (!details.exchangeName) missingDetails.push("exchange name");
          if (!details.faultType) missingDetails.push("fault type");

          let confirmationMessage = '';

          if (missingDetails.length > 0) {
            // Some details are missing, ask for them
            confirmationMessage = `I detected that you want to create a new incident. I have the following details:

${details.exchangeName ? `Exchange Name: ${details.exchangeName}` : ''}
${details.faultType ? `Fault Type: ${details.faultType}` : ''}
${details.description ? `Description: ${details.description}` : ''}
${details.priority ? `Priority: ${details.priority}` : ''}
${details.location ? `Location: ${details.location}` : ''}

Before I can create this incident, I need the following information: ${missingDetails.join(", ")}.
Please provide the missing details or click on one of the suggestions below.`;
          } else {
            // All required details are available
            confirmationMessage = `I detected that you want to create a new incident with the following details:

Exchange Name: ${details.exchangeName}
${details.faultType ? `Fault Type: ${details.faultType}` : 'Fault Type: Not specified'}
${details.description ? `Description: ${details.description}` : ''}
${details.priority ? `Priority: ${details.priority}` : ''}
${details.location ? `Location: ${details.location}` : ''}

Would you like me to create this incident? Please confirm by clicking the "Create Incident" button below, or you can provide more details.`;
          }
          
          await addMessage(confirmationMessage, 'assistant');
        } else {
          // Get a normal response but ask for more details about the incident
          const response = await queryGemini(content, incidents);
          await addMessage(`${response}\n\nI noticed you might want to create an incident. Could you provide more details like exchange name and fault type?`, 'assistant');
        }
      } else {
        // Normal response
        const response = await queryGemini(content, incidents);
        await addMessage(response, 'assistant');
      }
      
      // Update suggested questions after the assistant response
      updateSuggestedQuestions();
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Add an error message
      await addMessage(`I'm sorry, I (${aiName}) encountered an error while processing your request. Please try again later.`, 'assistant');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle incident creation
  const handleCreateIncident = async () => {
    if (!incidentDetails) return;
    
    // Check if we have the minimum required information
    if (!incidentDetails.exchangeName) {
      await addMessage("I need at least the exchange name to create an incident. Please provide the exchange name.", 'assistant');
      return;
    }
    
    setIsLoading(true);
    try {
      // Call the incident creation function
      const result = await createIncident(incidentDetails);
      
      if (result.success) {
        await addMessage(result.message, 'assistant');
        // Suggest follow-up actions
        await addMessage(`You can now track this incident using the reference number ${result.incidentNumber}. Is there anything else you'd like to know about this incident or any other assistance you need?`, 'assistant');
      } else {
        await addMessage(`Sorry, I couldn't create the incident. ${result.message}`, 'assistant');
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      await addMessage(`I encountered an error while trying to create the incident. Please try again or create it manually.`, 'assistant');
    } finally {
      setIsLoading(false);
      setIsCreatingIncident(false);
      setIncidentDetails(null);
    }
  };

  // Function to cancel incident creation
  const handleCancelIncidentCreation = async () => {
    setIsCreatingIncident(false);
    setIncidentDetails(null);
    await addMessage(`I've cancelled the incident creation. Is there anything else I can help with?`, 'assistant');
  };

  // Add suggested actions for incident creation
  useEffect(() => {
    if (isCreatingIncident && incidentDetails) {
      // Check what information we're missing to suggest appropriate actions
      const suggestedActions = ["Yes, create this incident", "No, cancel incident creation"];
      
      // Add suggestions based on missing information
      if (!incidentDetails.exchangeName) {
        suggestedActions.push("The exchange name is EPZA");
        suggestedActions.push("The exchange name is GULISTAN-E-JAUHAR");
        suggestedActions.push("The exchange name is KATHORE");
      } else if (!incidentDetails.faultType) {
        suggestedActions.push("The fault type is Fiber Cut");
        suggestedActions.push("The fault type is Power Issue");
        suggestedActions.push("The fault type is Equipment Failure");
      } else {
        // If we have the basic info, suggest modifications
        suggestedActions.push(`The exchange name is different`);
        suggestedActions.push(`The fault type is different`);
      }
      
      setSuggestedQuestions(suggestedActions);
      setShowSuggestions(true);
    }
  }, [isCreatingIncident, incidentDetails]);

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Start a new conversation
  const handleNewConversation = async () => {
    await startNewEpisode();
    clearMessages();
    const welcomeMessage = `Hello${username ? ` ${username}` : ''}! I'm ${aiName}, starting a new conversation. How can I help you?`;
    await addMessage(welcomeMessage, 'assistant');
  };

  // Format the timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to get user ID from auth
  function getUserIdFromAuth(): string {
    if (typeof window === 'undefined') return '';
    
    try {
      const auth = localStorage.getItem('auth');
      if (auth) {
        const authData = JSON.parse(auth);
        return authData.username || '';
      }
    } catch (e) {
      console.error('Failed to get user ID from auth:', e);
    }
    
    return '';
  }

  // Add incident creation confirmation UI
  const renderIncidentConfirmation = () => {
    if (!isCreatingIncident || !incidentDetails) return null;
    
    return (
      <div className="mt-3 flex justify-center gap-2">
        <Button 
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white" 
          onClick={handleCreateIncident}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Create Incident
        </Button>
        <Button 
          size="sm"
          variant="outline" 
          className="border-red-300 text-red-600 hover:bg-red-50" 
          onClick={handleCancelIncidentCreation}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    );
  };

  // Function to handle suggested question click
  const handleSuggestedQuestionClick = async (question: string) => {
    // Special handling for incident creation actions
    if (isCreatingIncident) {
      if (question === "Yes, create this incident") {
        await handleCreateIncident();
        return;
      } else if (question === "No, cancel incident creation") {
        await handleCancelIncidentCreation();
        return;
      } else if (question.startsWith("The exchange name is")) {
        if (question === "The exchange name is different") {
          await handleSendMessage("I want to change the exchange name");
        } else {
          // Extract the exchange name from the suggestion
          const exchangeName = question.replace("The exchange name is ", "").trim();
          setIncidentDetails((prev: IncidentDetails | null) => ({
            ...prev || {},
            exchangeName
          }));
          await addMessage(`I've updated the exchange name to ${exchangeName}.`, 'assistant');
          
          // If we now have all required info, prompt for creation
          if (incidentDetails?.faultType) {
            await addMessage("Would you like me to create the incident with the updated information? Click 'Yes, create this incident' to proceed.", 'assistant');
          } else {
            await addMessage("We still need the fault type to create this incident. What is the fault type?", 'assistant');
          }
        }
        return;
      } else if (question.startsWith("The fault type is")) {
        if (question === "The fault type is different") {
          await handleSendMessage("I want to change the fault type");
        } else {
          // Extract the fault type from the suggestion
          const faultType = question.replace("The fault type is ", "").trim();
          setIncidentDetails((prev: IncidentDetails | null) => ({
            ...prev || {},
            faultType
          }));
          await addMessage(`I've updated the fault type to ${faultType}.`, 'assistant');
          
          // If we now have all required info, prompt for creation
          if (incidentDetails?.exchangeName) {
            await addMessage("Would you like me to create the incident with the updated information? Click 'Yes, create this incident' to proceed.", 'assistant');
          } else {
            await addMessage("We still need the exchange name to create this incident. What is the exchange name?", 'assistant');
          }
        }
        return;
      }
    }
    
    // Handle regular suggested questions
    await handleSendMessage(question);
  };

  if (!isVisible) {
    return (
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 20 }}>
        <Button
          onClick={() => setIsVisible(true)}
          className="rounded-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg flex items-center gap-2"
        >
          <Bot size={24} />
          <span className="ml-1">Chat with {aiName}</span>
        </Button>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      zIndex: 20,
      maxHeight: 'calc(100vh - 40px)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Card 
        className="shadow-2xl rounded-2xl overflow-hidden"
        style={{
          width: isExpanded ? '600px' : '350px',
          height: isExpanded ? '600px' : '500px',
          backgroundImage: 'linear-gradient(to bottom, #f0f9ff, #e6f7ff)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          transition: 'width 0.2s, height 0.2s',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <CardHeader className="pb-1 pt-2 px-4 flex flex-row items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 border-b text-white" style={{ height: '50px', minHeight: '50px', flexShrink: 0 }}>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-6 h-6">
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-sm"></div>
              <Bot className="h-5 w-5 text-white relative z-10" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-1">
                {aiName}
                <Sparkles size={14} className="text-yellow-300 ml-1" />
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleNewConversation} title="New Conversation" className="text-white hover:bg-blue-500 h-7 w-7">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSuggestions(!showSuggestions)} title={showSuggestions ? "Hide suggestions" : "Show suggestions"} className="text-white hover:bg-blue-500 h-7 w-7">
              <Lightbulb className="h-3.5 w-3.5" />
            </Button>
            {isExpanded ? (
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} title="Minimize" className="text-white hover:bg-blue-500 h-7 w-7">
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(true)} title="Maximize" className="text-white hover:bg-blue-500 h-7 w-7">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)} title="Minimize to Tray" className="text-white hover:bg-blue-500 h-7 w-7">
              <MinusCircle className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)} title="Close" className="text-white hover:bg-blue-500 h-7 w-7">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent 
          className="p-3 overflow-y-auto flex-1 bg-opacity-25" 
          style={{ 
            height: 'calc(100% - 110px)',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%239C92AC" fill-opacity="0.05" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3Ccircle cx="13" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E")',
            flexGrow: 1,
          }}
        >
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md">
                    <img 
                      src={message.role === 'user' ? userAvatar : botAvatar} 
                      alt={message.role === 'user' ? 'User' : aiName} 
                      className="w-full h-full object-cover"
                      loading="lazy" // Add lazy loading for images
                    />
                  </div>
                  <div 
                    className={`px-4 py-3 rounded-2xl shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-blue-100 dark:border-gray-700'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
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
              </div>
            ))}
            
            {/* Show confirmation buttons when creating incident */}
            {isCreatingIncident && renderIncidentConfirmation()}
            
            {isLoading && (
              <div className="flex items-start">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md">
                    <img src={botAvatar} alt={aiName} className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-none border border-blue-100 dark:border-gray-700 shadow-sm flex items-center">
                    <div className="flex space-x-1 items-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">{aiName} is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        
        {/* Suggested questions - only show when showSuggestions is true */}
        {showSuggestions && suggestedQuestions.length > 0 && (
          <div className="px-3 py-2 bg-white dark:bg-gray-800 border-t border-b border-blue-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lightbulb size={12} className="text-amber-500" />
                <span>Suggested questions:</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0" 
                onClick={() => setShowSuggestions(false)}
                title="Hide suggestions"
              >
                <X size={12} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((question, idx) => (
                <div key={idx}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 hover:text-blue-800 text-left rounded-lg transform hover:scale-105 transition-transform py-1 px-2 h-auto"
                    onClick={() => handleSuggestedQuestionClick(question)}
                  >
                    {question}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <CardFooter className="p-3 border-t border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800" style={{ flexShrink: 0, height: '60px' }}>
          <div className="flex w-full items-center gap-2">
            <Textarea
              placeholder={`Ask ${aiName} a question...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-8 resize-none rounded-xl focus:border-blue-400 focus:ring-blue-400 text-sm"
            />
            <div className="transition-transform hover:scale-110 active:scale-95">
              <Button 
                size="icon" 
                onClick={() => handleSendMessage()} 
                disabled={isLoading || !inputValue.trim()}
                className="shrink-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 