import { useEffect, useState } from 'react';

interface StatusBadgeProps {
  status: string | undefined;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="w-20 h-6"></div>; // Placeholder while loading
  }

  return (
    <span className={`px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800`}>
      {status || 'Unknown'}
    </span>
  );
} 