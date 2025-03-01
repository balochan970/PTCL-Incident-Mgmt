"use client";

import { useState } from 'react';
import { Contact, ExcelContact } from '../types';
import { db } from '@/app/firebase';
import { deleteDoc, doc, collection, addDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface BulkActionsProps {
  contacts: Contact[];
  onRefresh: () => void;
  selectedContacts: Set<string>;
  onSelectContact: (contactId: string) => void;
  onSelectAll: () => void;
}

export function BulkActions({ contacts, onRefresh, selectedContacts, onSelectContact, onSelectAll }: BulkActionsProps) {
  const [isInitialDeleteDialogOpen, setIsInitialDeleteDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;

    try {
      setIsLoading(true);
      const contactsRef = collection(db, 'contacts');
      const deletePromises = Array.from(selectedContacts).map(id => 
        deleteDoc(doc(contactsRef, id))
      );

      await Promise.all(deletePromises);
      
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedContacts.size} contacts`,
      });

      setIsConfirmDeleteDialogOpen(false);
      setIsInitialDeleteDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast({
        title: "Error",
        description: "Failed to delete contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateContact = (contact: Record<string, any>): contact is ExcelContact => {
    // Log the contact being validated
    console.log('Original contact:', contact);

    // Normalize the contact object - convert field names to our expected format
    const normalizedContact = {
      name: contact.Name || contact.name || '',
      number: contact.Number || contact.number || '',
      designation: contact.Designation || contact.designation || '',
      department: contact.Department || contact.department || '',
      email: contact['Email (Optional)'] || contact.email || '',
      remarks: contact['Remarks (Optional)'] || contact.remarks || '',
      exchangeName: contact.ExchangeName || contact.exchangeName || 'N/A',
      supervisorName: contact.SupervisorName || contact.supervisorName || 'N/A',
      backupNumber: contact.BackupNumber || contact.backupNumber || ''
    };

    // Convert number to string if it's a number
    if (typeof normalizedContact.number === 'number') {
      normalizedContact.number = String(normalizedContact.number);
    }

    // Ensure name is not empty
    if (!normalizedContact.name || normalizedContact.name.trim() === '') {
      console.log('Missing name field');
      return false;
    }

    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const contacts: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

      console.log('Parsed contacts from Excel:', contacts);

      const contactsRef = collection(db, 'contacts');
      let successCount = 0;
      let errorCount = 0;
      let failedContacts: any[] = [];

      for (const contact of contacts) {
        try {
          if (validateContact(contact)) {
            // Normalize the contact data before saving
            const normalizedContact = {
              name: contact.Name || contact.name || '',
              number: String(contact.Number || contact.number || ''),
              designation: contact.Designation || contact.designation || '',
              department: contact.Department || contact.department || '',
              email: contact['Email (Optional)'] || contact.email || '',
              remarks: contact['Remarks (Optional)'] || contact.remarks || '',
              exchangeName: contact.ExchangeName || contact.exchangeName || 'N/A',
              supervisorName: contact.SupervisorName || contact.supervisorName || 'N/A',
              backupNumber: contact.BackupNumber || contact.backupNumber || '',
              timestamp: new Date()
            };

            await addDoc(contactsRef, normalizedContact);
            successCount++;
            console.log('Successfully added contact:', normalizedContact);
          } else {
            errorCount++;
            failedContacts.push(contact);
            console.log('Contact failed validation:', contact);
          }
        } catch (error: any) {
          console.error('Error adding contact to Firebase:', error);
          errorCount++;
          failedContacts.push({ ...contact, error: error.message });
        }
      }

      // Log detailed results
      console.log('Import Results:', {
        total: contacts.length,
        success: successCount,
        failed: errorCount,
        failedContacts
      });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} contacts. ${errorCount} failed. Check console for details.`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "Failed to process the Excel file. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const downloadTemplate = () => {
    const templateUrl = '/templates/contacts_template.xlsx';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = 'contacts_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedContacts.size === 0 || isLoading}
            onClick={() => setIsInitialDeleteDialogOpen(true)}
          >
            Delete Selected
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
            >
              Download Template
            </Button>

            <div className="relative">
              <Button
                variant="default"
                size="sm"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Contacts'
                )}
              </Button>
              <input
                id="fileInput"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Initial Delete Dialog */}
      <Dialog open={isInitialDeleteDialogOpen} onOpenChange={setIsInitialDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Delete Contacts</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p>This action will delete the bulk contacts.</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsInitialDeleteDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIsInitialDeleteDialogOpen(false);
                  setIsConfirmDeleteDialogOpen(true);
                }}
                disabled={isLoading}
              >
                Proceed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p>Are you sure you want to delete {selectedContacts.size} contacts? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmDeleteDialogOpen(false);
                  setIsInitialDeleteDialogOpen(false);
                }}
                disabled={isLoading}
              >
                No
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Yes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 