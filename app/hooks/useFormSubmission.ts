import { useState, useRef, useCallback } from 'react';

interface UseFormSubmissionOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  debounceTime?: number;
}

/**
 * Custom hook to handle form submissions with debounce and duplicate prevention
 */
export function useFormSubmission<T>({
  onSuccess,
  onError,
  debounceTime = 1000
}: UseFormSubmissionOptions = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitTimeRef = useRef<number>(0);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = useCallback(
    async (submitFn: () => Promise<T>, formData?: any) => {
      // Prevent multiple submissions within debounce time
      const now = Date.now();
      if (isSubmitting || now - submitTimeRef.current < debounceTime) {
        console.log('Submission prevented by debounce');
        return null;
      }

      setIsSubmitting(true);
      setError(null);
      submitTimeRef.current = now;

      // Disable the submit button to prevent multiple clicks
      if (submitButtonRef.current) {
        submitButtonRef.current.disabled = true;
      }

      try {
        const result = await submitFn();
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        console.error('Error during form submission:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        
        if (onError && err instanceof Error) {
          onError(err);
        }
        
        return null;
      } finally {
        setIsSubmitting(false);
        
        // Re-enable the submit button
        if (submitButtonRef.current) {
          submitButtonRef.current.disabled = false;
        }
      }
    },
    [isSubmitting, debounceTime, onSuccess, onError]
  );

  return {
    isSubmitting,
    error,
    submitButtonRef,
    handleSubmit
  };
} 