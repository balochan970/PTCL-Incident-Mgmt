import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Contact {
  id: string;
  name: string;
  number: string;
  backupNumber?: string;
  exchangeName: string;
  supervisorName: string;
  remarks?: string;
  designation?: string;
  department?: string;
  email?: string;
}

interface ContactsSectionProps {
  contacts: Contact[];
  onSave: (contact: Omit<Contact, 'id'>) => Promise<void>;
  onUpdate: (contact: Contact) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (contact: Contact) => void;
  selectedContacts: Set<string>;
  onSelectContact: (contactId: string) => void;
  onSelectAll: () => void;
}

type SortField = keyof Contact;
type SortDirection = 'asc' | 'desc';

export default function ContactsSection({ 
  contacts, 
  onSave, 
  onUpdate, 
  onDelete, 
  onEdit,
  selectedContacts,
  onSelectContact,
  onSelectAll
}: ContactsSectionProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    const comparison = aValue.toString().localeCompare(bValue.toString());
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedContacts.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentContacts = sortedContacts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(Number(value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    let isResizing = false;
    let currentTh: HTMLTableHeaderCellElement | null = null;
    let startX = 0;
    let startWidth = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !currentTh) return;
      const diff = e.pageX - startX;
      currentTh.style.width = `${startWidth + diff}px`;
    };

    const handleMouseUp = () => {
      isResizing = false;
      currentTh = null;
    };

    const headers = table.querySelectorAll('th');
    headers.forEach(th => {
      th.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.offsetX > th.offsetWidth - 8) {
          isResizing = true;
          currentTh = th;
          startX = e.pageX;
          startWidth = th.offsetWidth;
        }
      });
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="contacts-section">
      {contacts.length === 0 ? (
        <div className="empty-state">
          <p>No contacts found.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table ref={tableRef}>
              <thead>
                <tr>
                  <th className="w-[50px]">
                    <Checkbox 
                      checked={selectedContacts.size === contacts.length && contacts.length > 0}
                      onCheckedChange={onSelectAll}
                    />
                  </th>
                  <th onClick={() => handleSort('name')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('number')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Number
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('backupNumber')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Backup Number
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('exchangeName')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Exchange
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('supervisorName')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Supervisor
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('designation')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Designation
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('department')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Department
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('email')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Email
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('remarks')} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      Remarks
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <Checkbox 
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={() => onSelectContact(contact.id)}
                      />
                    </td>
                    <td>{contact.name}</td>
                    <td>{contact.number}</td>
                    <td>{contact.backupNumber || '-'}</td>
                    <td>{contact.exchangeName}</td>
                    <td>{contact.supervisorName}</td>
                    <td>{contact.designation || '-'}</td>
                    <td>{contact.department || '-'}</td>
                    <td>{contact.email || '-'}</td>
                    <td>{contact.remarks || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => onEdit(contact)}
                          className="btn btn-primary btn-small"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(contact.id)}
                          className="btn btn-danger btn-small"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-container flex items-center justify-between p-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select
                value={entriesPerPage.toString()}
                onValueChange={handleEntriesPerPageChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">entries per page</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, contacts.length)} of {contacts.length} entries
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {getPageNumbers().map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .contacts-section {
          width: 100%;
          background-color: #FFF8E8;
          border-radius: 8px;
          border: 2px solid #D4C9A8;
          overflow: hidden;
        }

        .empty-state {
          padding: 2rem;
          text-align: center;
          color: #4A4637;
          font-weight: 500;
          font-size: 1rem;
        }

        .table-container {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th {
          position: relative;
          background: #E6DFC8;
          font-weight: 600;
          font-size: 0.9rem;
          position: sticky;
          top: 0;
          z-index: 10;
          user-select: none;
        }

        th::after {
          content: '';
          position: absolute;
          right: 0;
          top: 25%;
          height: 50%;
          width: 2px;
          background-color: #D4C9A8;
          cursor: col-resize;
        }

        th:last-child::after {
          display: none;
        }

        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 2px solid #D4C9A8;
          color: #4A4637;
          font-weight: 500;
          white-space: normal;
          word-wrap: break-word;
          vertical-align: top;
        }

        td {
          font-size: 0.9rem;
          background: #FFF8E8;
          text-align: justify;
        }

        /* Column widths */
        th:first-child,
        td:first-child {
          width: 40px;
          min-width: 40px;
        }

        th:nth-child(2),
        td:nth-child(2) {
          width: 15%;
        }

        th:nth-child(3),
        td:nth-child(3),
        th:nth-child(4),
        td:nth-child(4) {
          width: 12%;
        }

        th:nth-child(5),
        td:nth-child(5),
        th:nth-child(6),
        td:nth-child(6) {
          width: 10%;
        }

        th:nth-child(7),
        td:nth-child(7),
        th:nth-child(8),
        td:nth-child(8) {
          width: 10%;
        }

        th:nth-child(9),
        td:nth-child(9) {
          width: 12%;
        }

        th:nth-child(10),
        td:nth-child(10) {
          width: 12%;
        }

        th:last-child,
        td:last-child {
          width: 100px;
          min-width: 100px;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
        }

        .btn {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          min-width: 40px;
        }

        .btn-primary {
          background-color: #4A4637;
          color: white;
        }

        .btn-primary:hover {
          background-color: #635C48;
        }

        .btn-danger {
          background-color: #DC3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #C82333;
        }

        .btn-small {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .pagination-container {
          background-color: white;
          border-top: 1px solid #e5e7eb;
          padding: 1rem;
          width: 100%;
        }
      `}</style>
    </div>
  );
} 