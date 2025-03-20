"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const shortcuts = [
  { key: 'Ctrl + Q', description: 'New Single Fault' },
  { key: 'Ctrl + G', description: 'New GPON Fault' },
  { key: 'Ctrl + M', description: 'New Multiple Faults' },
  { key: 'Ctrl + R', description: 'View Reports' },
  { key: 'Ctrl + A', description: 'View Active Faults' },
  { key: 'Ctrl + H', description: 'Go to Home' },
  { key: 'Ctrl + K', description: 'Open Knowledge Base' },
  { key: 'Ctrl + L', description: 'View Fault Locations' },
  { key: 'Ctrl + D', description: 'Analytics Dashboard' },
  { key: 'Esc', description: 'Close dialogs' }
];

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-sm dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-surface/90"
        >
          ⌨️ Keyboard Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] dark:bg-dark-surface dark:text-dark-text">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold dark:text-dark-text">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center gap-4">
              <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:text-dark-text dark:bg-dark-background dark:border-dark-border">
                {shortcut.key}
              </kbd>
              <span className="text-sm dark:text-dark-text/90">{shortcut.description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 