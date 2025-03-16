"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { isUserAdmin } from '@/app/services/authService';
import NavBar from '@/app/components/NavBar';
import '../styles/reports.css';

interface DeletedTicket {
  id: string;
  deletedTicketId: number;
  originalTicketNumber: string;
  sourceCollection: 'incidents' | 'gponIncidents';
  deletedAt: any;
  deletedBy: string;
  exchangeName: string;
  domain?: string;
  faultType?: string;
  equipmentType?: string;
  timestamp: any;
  status: string;
  [key: string]: any;
}

export default function DeletedTicketsPage() {
  const [deletedTickets, setDeletedTickets] = useState<DeletedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (!auth) {
      router.replace('/login');
      return;
    }

    const authData = JSON.parse(auth);
    if (!isUserAdmin(authData)) {
      router.replace('/');
      return;
    }

    fetchDeletedTickets();
  }, [router]);

  const fetchDeletedTickets = async () => {
    try {
      setLoading(true);
      const deletedTicketsRef = collection(db, 'deletedTickets');
      const q = query(deletedTicketsRef, orderBy('deletedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const tickets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DeletedTicket[];

      setDeletedTickets(tickets);
      setError(null);
    } catch (err) {
      console.error('Error fetching deleted tickets:', err);
      setError('Failed to load deleted tickets');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading deleted tickets...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar />
        <div className="error-container">
          <p>{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="reports-container">
        <div className="header">
          <h1>Deleted Tickets</h1>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Deleted Entry #</th>
                <th>Original Ticket #</th>
                <th>Source</th>
                <th>Exchange</th>
                <th>Domain</th>
                <th>Fault Type</th>
                <th>Equipment Type</th>
                <th>Created At</th>
                <th>Deleted At</th>
                <th>Deleted By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deletedTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.deletedTicketId}</td>
                  <td>{ticket.originalTicketNumber}</td>
                  <td>{ticket.sourceCollection === 'incidents' ? 'Reports' : 'GPON Reports'}</td>
                  <td>{ticket.exchangeName}</td>
                  <td>{ticket.domain || 'N/A'}</td>
                  <td>{ticket.faultType || 'N/A'}</td>
                  <td>{ticket.equipmentType || 'N/A'}</td>
                  <td>{formatDate(ticket.timestamp)}</td>
                  <td>{formatDate(ticket.deletedAt)}</td>
                  <td>{ticket.deletedBy}</td>
                  <td>
                    <span className={`status-badge ${ticket.status.toLowerCase()}`}>
                      {ticket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
} 