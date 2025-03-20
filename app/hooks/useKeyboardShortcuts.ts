import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
        const altMatch = !!shortcut.altKey === event.altKey;
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          // Prevent default browser actions for Ctrl+key combinations
          if (shortcut.ctrlKey || shortcut.altKey) {
            event.preventDefault();
          }
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function useDefaultShortcuts() {
  const router = useRouter();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'q',
      ctrlKey: true,
      action: () => {
        router.push('/single-fault');
      }
    },
    {
      key: 'g',
      ctrlKey: true,
      action: () => {
        router.push('/gpon-faults');
      }
    },
    {
      key: 'm',
      ctrlKey: true,
      action: () => {
        router.push('/multiple-faults');
      }
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => {
        router.push('/reports');
      }
    },
    {
      key: 'a',
      ctrlKey: true,
      action: () => {
        router.push('/active-faults');
      }
    },
    {
      key: 'h',
      ctrlKey: true,
      action: () => {
        router.push('/');
      }
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        router.push('/knowledgebase');
      }
    },
    {
      key: 'l',
      ctrlKey: true,
      action: () => {
        router.push('/fault-locations');
      }
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => {
        router.push('/analytics-dashboard');
      }
    }
  ];

  useKeyboardShortcuts(shortcuts);
} 