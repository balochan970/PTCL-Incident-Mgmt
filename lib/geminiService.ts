import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API with your API key
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Safety settings to avoid harmful content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Generation configuration
const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// AI Name setting
const AI_NAME = "ROC Genie";

/**
 * Creates a system prompt with incident data context for the AI
 * @param incidents Array of incident data to provide as context
 * @param useSummary Whether to include a summary of incidents
 * @returns A formatted system prompt string
 */
function createSystemPrompt(incidents: any[], useSummary = true) {
  // Extract summary if available
  let summaryText = '';
  let incidentsToProcess = [...incidents];
  
  if (useSummary && incidents.length > 0 && incidents[0]?.summary) {
    const summary = incidents[0].summary;
    
    summaryText = `
Summary of Incidents:
- Total Incidents: ${summary.totalIncidents}
- Standard Incidents: ${summary.standardIncidents}
- GPON Incidents: ${summary.gponIncidents}
- Active Incidents: ${summary.activeIncidents}
- Resolved Incidents: ${summary.resolvedIncidents}

Top Exchanges with Most Incidents:
${summary.topExchanges.map((ex: any, i: number) => `${i+1}. ${ex.name}: ${ex.count} incidents`).join('\n')}
`;
    
    // Remove the summary from incidents to process
    incidentsToProcess = incidents.slice(1);
  }
  
  // Process incidents for the prompt
  let incidentsList = '';
  const maxIncidents = 30; // Limit to prevent token overflow
  
  incidentsToProcess.slice(0, maxIncidents).forEach((incident, index) => {
    incidentsList += `
Incident #${index + 1}:
- Exchange: ${incident.exchangeName || 'N/A'}
- Type: ${incident.type || 'N/A'}
- Description: ${incident.description || 'N/A'}
- Registered: ${incident.registrationTimestamp ? new Date(incident.registrationTimestamp).toLocaleString() : 'N/A'}
${incident.status ? `- Status: ${incident.status}\n` : ''}`;
  });
  
  if (incidentsToProcess.length > maxIncidents) {
    incidentsList += `\n(Note: Only showing ${maxIncidents} of ${incidentsToProcess.length} incidents due to context limitations.)`;
  }

  return `You are ROC Genie, an AI assistant for PTCL's (Pakistan Telecommunication Company Limited) Incident Management System. You help users analyze incident data, answer questions about incidents, and assist with incident-related tasks including creating new incidents.

You have access to information about ${useSummary && incidents[0]?.summary ? incidents[0].summary.totalIncidents : incidentsToProcess.length} incidents in the system.

${summaryText}

${incidentsList ? `Here are the details of some incidents in the system:\n${incidentsList}` : 'No incidents available in the system.'}

IMPORTANT CAPABILITIES:
1. Answer user questions about incidents using the data provided
2. When asked about incident numbers or statistics, use the summary data if available
3. You can create new incidents when users request it. Pay attention to details like exchange name, fault type, and description
4. When a user asks to create an incident, collect necessary information and confirm before proceeding

LANGUAGE HANDLING:
- Users may communicate in English, Urdu, or a mix of both (often called "Urdu-lish" or "Hinglish")
- Common transliterated Urdu phrases include:
  * "ticket register kar do" (please register a ticket)
  * "complaint darj karen" (please file a complaint)
  * "fault report karen" (please report a fault)
  * "fiber kata hai" (fiber is cut)
  * "line down hai" (line is down)
- Pay attention to location names that may be in local language

INCIDENT CREATION GUIDANCE:
- Always ask for the exchange name if not provided
- For fault type, categorize issues like "fiber cut", "power issue", "equipment failure" appropriately
- If details are vague, ask follow-up questions to get specific information about the incident
- If users mention MSAGs (Main Service Access Gateways) or other equipment, include those details
- If a request is unclear, ask for clarification before creating an incident

TECHNICAL VOCABULARY:
- MSAG: Main Service Access Gateway
- OLT: Optical Line Terminal
- GPON: Gigabit Passive Optical Network
- Exchange: A local telecommunications facility where equipment is installed
- Fiber Cut: When fiber optic cable is physically damaged or severed
- Power Issue: Problems with electrical power to equipment
- Common exchanges include: EPZA, GULISTAN-E-JAUHAR, KATHORE, KAP, KORANGI

HANDLING SPECIFIC REQUESTS:
- When users report issues like "fiber kata hai" (fiber is cut), respond empathetically and collect necessary details
- When users mention equipment like "MSAG 12 aur MSAG 15 ke darmiyan" (between MSAG 12 and MSAG 15), acknowledge this detail and include it in the incident description
- If users provide a location reference like "X and Y ke darmiyan" (between X and Y), interpret this as a location description

Always be helpful, concise, and accurate. If you don't know an answer, say so rather than making up information. When creating incidents, collect all necessary information before proceeding.`;
}

// Function to query the Gemini API with a user message
export async function queryGemini(message: string, incidents: any[]): Promise<string> {
  try {
    if (!API_KEY) {
      return "I'm sorry, but I (ROC Genie) cannot process your request because the Gemini API key is not configured. Please contact the administrator.";
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings,
      generationConfig,
    });

    const systemPrompt = createSystemPrompt(incidents, true);
    
    // Use the chat feature but handle system prompt as a message
    const chat = model.startChat({
      history: [],
    });
    
    // First prepare the model with the system prompt
    await chat.sendMessage(`System: ${systemPrompt}`);
    
    // Then send the actual user message
    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error querying Gemini API:", error);
    return "I'm sorry, but I (ROC Genie) encountered an error while processing your request. Please try again later.";
  }
}

// Function to detect if a message contains an intent to create an incident
export async function detectCreateIncidentIntent(message: string): Promise<boolean> {
  // Convert to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();
  
  // English patterns
  const englishPatterns = [
    /create (a|an|new) incident/i,
    /register (a|an|new) incident/i,
    /open (a|an|new) incident/i,
    /log (a|an|new) incident/i,
    /report (a|an|new) incident/i,
    /add (a|an|new) incident/i,
    /new incident/i,
    /create (a|an) ticket/i,
    /register (a|an) ticket/i,
    /report (a|an) (issue|problem|fault)/i,
    /need to (create|log|report) (a|an)/i,
    /I want to create/i,
    /I need to create/i,
    /please create/i,
    /please register/i
  ];

  // Urdu/Hindi transliterated patterns
  const urduHindiPatterns = [
    /ticket (register|darz|darj) (kar|kr)/i,   // "ticket register kar do"
    /complaint (register|darz|darj) (kar|kr)/i, // "complaint register kar do"
    /ticket (bana|create)/i,                    // "ticket bana do"
    /complaint (likho|likhe|likhye)/i,          // "complaint likho"
    /incident (register|darz|darj) (kar|kr)/i,  // "incident register karo"
    /fault (register|report)/i,                 // "fault register karo"
    /mjhe ticket/i,                             // "mjhe ticket chahiye"
    /mujhe ticket/i,                            // "mujhe ticket chahiye"
    /ticket (chahiye|register)/i                // "ticket chahiye"
  ];
  
  // Common indicators of issues that might imply an incident report
  const issueIndicators = [
    // Check if message mentions equipment problems with action words
    (lowerMessage.includes('fiber') || lowerMessage.includes('cable')) && 
    (lowerMessage.includes('cut') || lowerMessage.includes('kata') || lowerMessage.includes('kata hai')),
    
    // Check for power issues
    (lowerMessage.includes('power') || lowerMessage.includes('bijli')) && 
    (lowerMessage.includes('down') || lowerMessage.includes('out') || lowerMessage.includes('nahi hai')),
    
    // Check for equipment failures
    (lowerMessage.includes('msag') || lowerMessage.includes('olt') || lowerMessage.includes('device')) && 
    (lowerMessage.includes('down') || lowerMessage.includes('not working') || lowerMessage.includes('band hai'))
  ];
  
  // Check all English patterns
  for (const pattern of englishPatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // Check all Urdu/Hindi transliterated patterns
  for (const pattern of urduHindiPatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // Check issue indicators as a fallback
  if (issueIndicators.some(indicator => indicator)) {
    return true;
  }
  
  return false;
}

// Incident creation interface
export interface IncidentDetails {
  exchangeName?: string;
  faultType?: string;
  description?: string;
  priority?: string;
  location?: string;
}

export interface IncidentCreationResponse {
  success: boolean;
  incidentNumber: string;
  message: string;
}

// Function to create an incident
export async function createIncident(incidentDetails: IncidentDetails): Promise<IncidentCreationResponse> {
  // Log the details for debugging
  console.log('Creating incident with details:', incidentDetails);
  
  try {
    // Validate the minimum required details
    if (!incidentDetails.exchangeName) {
      return {
        success: false,
        incidentNumber: '',
        message: 'Exchange name is required to create an incident. Please provide the exchange name and try again.'
      };
    }
    
    // In a real implementation, this would call an API endpoint to create the incident
    // For demonstration purposes, we're simulating a successful creation with a random incident number
    
    // Generate a random incident number with a prefix based on fault type
    let prefix = 'INC';
    if (incidentDetails.faultType) {
      const faultType = incidentDetails.faultType.toLowerCase();
      if (faultType.includes('fiber') || faultType.includes('fibre') || faultType.includes('cable')) {
        prefix = 'FBR';
      } else if (faultType.includes('power') || faultType.includes('electricity')) {
        prefix = 'PWR';
      } else if (faultType.includes('equipment') || faultType.includes('hardware')) {
        prefix = 'EQP';
      }
    }
    
    const incidentNumber = `${prefix}-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;
    
    // Create a timestamp for the incident
    const timestamp = new Date().toLocaleString();
    
    // Simulate API call latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Format a detailed response with the incident information
    const responseMessage = `
Incident ${incidentNumber} has been successfully created with the following details:

Exchange: ${incidentDetails.exchangeName}
${incidentDetails.faultType ? `Fault Type: ${incidentDetails.faultType}` : ''}
${incidentDetails.description ? `Description: ${incidentDetails.description}` : ''}
${incidentDetails.priority ? `Priority: ${incidentDetails.priority}` : ''}
${incidentDetails.location ? `Location: ${incidentDetails.location}` : ''}
Timestamp: ${timestamp}

Your incident has been registered in the system and assigned to the appropriate team. You can track the status of this incident using the incident number.
`.trim();
    
    return {
      success: true,
      incidentNumber,
      message: responseMessage,
    };
  } catch (error) {
    console.error('Error creating incident:', error);
    return {
      success: false,
      incidentNumber: '',
      message: 'An error occurred while creating the incident. Please try again later.'
    };
  }
}

export interface ExtractionResult {
  success: boolean;
  data: IncidentDetails;
  error?: string;
}

// Function to extract incident details from a user message
export async function extractIncidentDetails(message: string): Promise<ExtractionResult> {
  try {
    // Log the message for debugging
    console.log('Extracting incident details from:', message);
    
    // Convert to lowercase for case-insensitive matching
    const lowerMessage = message.toLowerCase();
    
    // Common patterns in Urdu/Hindi transliteration mixed with English
    const exchangePatterns = [
      // Match exchange name after "exchange" or "at"
      /exchange(?:\s+name)?[:\s]+([a-zA-Z0-9\s\-]+)(?:,|\.|$|\s+me)/i,
      // Match the word before "me" or "main" (common in Urdu/Hindi for "in")
      /([a-zA-Z0-9\s\-]+)(?:\s+me(?:in)?|\s+main)\b/i,
      // Match after "at" or "in"
      /(?:at|in)\s+([a-zA-Z0-9\s\-]+)/i,
    ];
    
    const faultTypePatterns = [
      // Standard English patterns
      /fault(?:\s+type)?[:\s]+([a-zA-Z0-9\s\-]+)(?:,|\.|$)/i,
      /issue(?:\s+type)?[:\s]+([a-zA-Z0-9\s\-]+)(?:,|\.|$)/i,
      // Common Urdu/Hindi mixed patterns
      /([a-zA-Z0-9\s\-]+)\s+(?:kata\s+hai|cut|down|not\s+working)/i,
    ];
    
    // Extract exchange name using multiple patterns
    let exchangeName: string | undefined;
    for (const pattern of exchangePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        exchangeName = match[1].trim();
        // Check if it's a common exchange name and standardize
        const standardizedName = standardizeExchangeName(exchangeName);
        if (standardizedName) {
          exchangeName = standardizedName;
        }
        break;
      }
    }
    
    // Extract fault type using multiple patterns
    let faultType: string | undefined;
    for (const pattern of faultTypePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        faultType = match[1].trim();
        break;
      }
    }
    
    // If no fault type found yet, check for common issues in the full message
    if (!faultType) {
      if (lowerMessage.includes('fiber') || lowerMessage.includes('fibre') || lowerMessage.includes('cable')) {
        if (lowerMessage.includes('cut') || lowerMessage.includes('kata') || lowerMessage.includes('damage')) {
          faultType = 'Fiber Cut';
        }
      } else if (lowerMessage.includes('power') || lowerMessage.includes('electricity') || lowerMessage.includes('bijli')) {
        faultType = 'Power Issue';
      } else if (lowerMessage.includes('equipment') || lowerMessage.includes('hardware') || lowerMessage.includes('device')) {
        faultType = 'Equipment Failure';
      }
    }
    
    // Extract description - use the whole message if no specific description found
    const descriptionMatch = message.match(/description[:\s]+([^,.]+)(?:,|\.|$)/i);
    const description = descriptionMatch ? descriptionMatch[1].trim() : message;
    
    // Extract priority if available
    const priorityMatch = message.match(/priority[:\s]+([a-zA-Z0-9\s]+)(?:,|\.|$)/i);
    
    // Extract location if available
    const locationMatch = message.match(/location[:\s]+([a-zA-Z0-9\s]+)(?:,|\.|$)/i);
    
    // If message mentions MSAG or specific equipment, add to description
    let enhancedDescription = description;
    if (lowerMessage.includes('msag') || lowerMessage.includes('olt') || lowerMessage.includes('cabinet')) {
      const msagMatch = message.match(/msag\s*(\d+)/gi);
      if (msagMatch) {
        enhancedDescription = `${description} (Affected equipment: ${msagMatch.join(', ')})`;
      }
    }
    
    // Default to empty if not found
    const incidentDetails: IncidentDetails = {
      exchangeName: exchangeName || undefined,
      faultType: faultType || undefined,
      description: enhancedDescription,
      priority: priorityMatch ? priorityMatch[1].trim() : undefined,
      location: locationMatch ? locationMatch[1].trim() : undefined
    };
    
    // Check if we have at least the exchange name or fault type
    if (incidentDetails.exchangeName || incidentDetails.faultType) {
      return {
        success: true,
        data: incidentDetails
      };
    } else {
      return {
        success: false,
        data: {},
        error: "Couldn't extract enough incident details"
      };
    }
  } catch (error) {
    console.error('Error extracting incident details:', error);
    return {
      success: false,
      data: {},
      error: "Error processing message"
    };
  }
}

// Helper function to standardize common exchange names
function standardizeExchangeName(name: string): string | null {
  const standardNames: Record<string, string[]> = {
    'EPZA': ['epza', 'export processing zone', 'e.p.z.a'],
    'GULISTAN-E-JAUHAR': ['gulistan', 'jauhar', 'goliestan', 'gulistan-e-jauhar', 'gulistan e jauhar'],
    'KATHORE': ['kathore', 'kathoor', 'kathor'],
    'KAP': ['kap', 'k.a.p', 'karachi airport'],
    'KORANGI': ['korangi', 'korangi creek', 'korungi'],
    // Add more exchange names as needed
  };

  const lowerName = name.toLowerCase();
  for (const [standard, variations] of Object.entries(standardNames)) {
    if (variations.some(v => lowerName.includes(v))) {
      return standard;
    }
  }
  
  return null;
} 