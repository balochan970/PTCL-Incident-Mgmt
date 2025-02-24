import React from 'react';
import { format } from 'date-fns';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  status: string;
  description: string;
  user?: string;
}

interface StatusTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return '#FFA500';
    case 'in progress':
      return '#3498db';
    case 'resolved':
      return '#2ecc71';
    case 'critical':
      return '#e74c3c';
    default:
      return '#95a5a6';
  }
};

export default function StatusTimeline({ events, currentStatus }: StatusTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="timeline-container">
      <div className="current-status">
        <h3>Current Status</h3>
        <div 
          className="status-badge"
          style={{ backgroundColor: getStatusColor(currentStatus) }}
        >
          {currentStatus}
        </div>
      </div>

      <div className="timeline">
        {sortedEvents.map((event, index) => (
          <div key={event.id} className="timeline-event">
            <div className="timeline-marker">
              <div 
                className="status-dot"
                style={{ backgroundColor: getStatusColor(event.status) }}
              />
              {index !== sortedEvents.length - 1 && <div className="timeline-line" />}
            </div>
            
            <div className="event-content">
              <div className="event-header">
                <span className="event-time">
                  {format(event.timestamp, 'MMM d, yyyy HH:mm')}
                </span>
                <span 
                  className="event-status"
                  style={{ color: getStatusColor(event.status) }}
                >
                  {event.status}
                </span>
              </div>
              <p className="event-description">{event.description}</p>
              {event.user && (
                <span className="event-user">Updated by: {event.user}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .timeline-container {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .current-status {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
        }

        .current-status h3 {
          margin: 0;
          color: #333;
          font-size: 1.1rem;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 0.9rem;
          text-transform: capitalize;
        }

        .timeline {
          position: relative;
          padding-left: 24px;
        }

        .timeline-event {
          position: relative;
          padding-bottom: 24px;
          display: flex;
        }

        .timeline-marker {
          position: absolute;
          left: -24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          z-index: 2;
        }

        .timeline-line {
          position: absolute;
          top: 12px;
          width: 2px;
          height: calc(100% - 12px);
          background-color: #eee;
        }

        .event-content {
          flex: 1;
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 12px 16px;
          margin-left: 12px;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .event-time {
          color: #666;
          font-size: 0.9rem;
        }

        .event-status {
          font-weight: 500;
          font-size: 0.9rem;
          text-transform: capitalize;
        }

        .event-description {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .event-user {
          display: block;
          color: #666;
          font-size: 0.85rem;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .timeline-container {
            padding: 16px;
          }

          .event-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
} 