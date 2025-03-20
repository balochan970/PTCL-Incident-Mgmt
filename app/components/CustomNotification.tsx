"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomNotificationProps {
  message: string;
  duration?: number;
  variant?: 'success' | 'error' | 'warning' | 'info';
  isVisible?: boolean;
  onClose?: () => void;
}

export function CustomNotification({
  message,
  duration = 3000,
  variant = 'success',
  isVisible = true,
  onClose
}: CustomNotificationProps) {
  const [visible, setVisible] = useState(isVisible);

  // Auto-hide notification after duration
  useEffect(() => {
    setVisible(isVisible);
    
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  // Map variant to background color
  const getBgColor = () => {
    switch (variant) {
      case 'success': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      case 'warning': return 'bg-amber-600';
      case 'info': return 'bg-blue-600';
      default: return 'bg-green-600';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-4 right-4 z-50 ${getBgColor()} text-white px-4 py-2 rounded-lg shadow-lg`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper function to create and show a notification programmatically
export function showNotification(
  message: string, 
  options?: Omit<CustomNotificationProps, 'message' | 'isVisible'>
) {
  // Create notification container if it doesn't exist
  let notificationContainer = document.getElementById('custom-notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'custom-notification-container';
    document.body.appendChild(notificationContainer);
  }

  // Create notification element
  const notificationElement = document.createElement('div');
  notificationContainer.appendChild(notificationElement);

  // Get background color based on variant
  const variant = options?.variant || 'success';
  const bgColor = 
    variant === 'success' ? 'bg-green-600' :
    variant === 'error' ? 'bg-red-600' :
    variant === 'warning' ? 'bg-amber-600' : 'bg-blue-600';

  // Set notification styling
  notificationElement.className = `fixed bottom-4 right-4 z-50 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg`;
  notificationElement.textContent = message;

  // Set fade-in animation
  notificationElement.style.opacity = '0';
  notificationElement.style.transform = 'translateY(20px)';
  notificationElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  // Trigger animation
  setTimeout(() => {
    notificationElement.style.opacity = '1';
    notificationElement.style.transform = 'translateY(0)';
  }, 10);

  // Auto remove after duration
  const duration = options?.duration || 3000;
  setTimeout(() => {
    // Fade out
    notificationElement.style.opacity = '0';
    notificationElement.style.transform = 'translateY(10px)';
    
    // Remove after animation completes
    setTimeout(() => {
      if (notificationElement.parentNode) {
        notificationElement.parentNode.removeChild(notificationElement);
      }
      
      // Remove container if empty
      if (notificationContainer && notificationContainer.childNodes.length === 0) {
        document.body.removeChild(notificationContainer);
      }
      
      if (options?.onClose) {
        options.onClose();
      }
    }, 300);
  }, duration);

  // Return a function to manually close the notification
  return {
    close: () => {
      notificationElement.style.opacity = '0';
      notificationElement.style.transform = 'translateY(10px)';
      
      setTimeout(() => {
        if (notificationElement.parentNode) {
          notificationElement.parentNode.removeChild(notificationElement);
        }
      }, 300);
    }
  };
} 