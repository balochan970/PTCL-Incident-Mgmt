"use client";
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface StatusBadgeProps {
  status: string | undefined;
  timestamp?: any;
  pulseAnimation?: boolean;
}

export default function StatusBadge({ status, timestamp, pulseAnimation = true }: StatusBadgeProps) {
  const [isClient, setIsClient] = useState(false);
  const [tooltipContent, setTooltipContent] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    
    // Generate tooltip content
    if (timestamp) {
      try {
        const date = timestamp.toDate();
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        const timeSince = getTimeSince(date);
        setTooltipContent(`Status since: ${formattedDate}\n(${timeSince} ago)`);
      } catch (error) {
        setTooltipContent('Status time unknown');
      }
    } else {
      setTooltipContent('Status time unknown');
    }
  }, [timestamp]);

  if (!isClient) {
    return <div className="w-20 h-6"></div>; // Placeholder while loading
  }

  const getStatusColor = (status: string | undefined) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('in progress') || statusLower === 'inprogress' || statusLower === 'in-progress' || statusLower === 'pending') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    } else if (statusLower === 'resolved' || statusLower === 'closed' || statusLower === 'completed') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    } else if (statusLower === 'critical' || statusLower === 'urgent' || statusLower === 'high priority') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    } else if (statusLower === 'open' || statusLower === 'new') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    } else {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
    }
  };

  const getTimeSince = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''}`;
    } else if (diffHour > 0) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''}`;
    } else if (diffMin > 0) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''}`;
    } else {
      return 'just now';
    }
  };

  const statusClass = getStatusColor(status);
  const pulseClass = pulseAnimation && (status?.toLowerCase()?.includes('in progress') || status?.toLowerCase() === 'pending') 
    ? 'animate-pulse' 
    : '';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={`px-2 py-1 rounded-full text-sm ${statusClass} ${pulseClass} transition-all duration-300 inline-flex items-center`}
          >
            <span className={`w-2 h-2 rounded-full mr-1.5 ${
              status?.toLowerCase()?.includes('in progress') || status?.toLowerCase() === 'pending'
                ? 'bg-blue-500 dark:bg-blue-400'
                : status?.toLowerCase() === 'resolved' || status?.toLowerCase() === 'closed' || status?.toLowerCase() === 'completed'
                ? 'bg-green-500 dark:bg-green-400'
                : status?.toLowerCase() === 'critical' || status?.toLowerCase() === 'urgent'
                ? 'bg-red-500 dark:bg-red-400'
                : 'bg-gray-500 dark:bg-gray-400'
            }`}></span>
            {status || 'Unknown'}
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-white dark:bg-dark-surface text-gray-800 dark:text-dark-text border border-gray-200 dark:border-dark-border p-2 shadow-md whitespace-pre-line">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 