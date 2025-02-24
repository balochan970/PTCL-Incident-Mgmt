import React, { useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Incident {
  id: string;
  incidentNumber: string;
  domain: string;
  faultType: string;
  equipmentType: string;
  exchangeName: string;
  outageNodes: Record<string, boolean>;
  timestamp: any;
  faultEndTime?: any;
  status: string;
}

interface FaultAnalyticsProps {
  incidents: Incident[];
}

export default function FaultAnalytics({ incidents }: FaultAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [chartView, setChartView] = useState<'domain' | 'faultType' | 'equipment' | 'nodes'>('domain');

  const getFilteredIncidents = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = endOfDay(now);

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      startDate = startOfDay(new Date(customStartDate));
      endDate = endOfDay(new Date(customEndDate));
    } else {
      switch (timeRange) {
        case '24hours':
          startDate = subDays(now, 1);
          break;
        case '7days':
          startDate = subDays(now, 7);
          break;
        case '30days':
          startDate = subDays(now, 30);
          break;
        default:
          startDate = subDays(now, 7);
      }
    }

    // First filter by date range
    let filtered = incidents.filter(incident => {
      const incidentDate = incident.timestamp.toDate();
      return isWithinInterval(incidentDate, { start: startDate, end: endDate });
    });

    // Then apply chart view filters if any
    switch (chartView) {
      case 'domain':
        // No additional filtering needed for domain view
        break;
      case 'faultType':
        // No additional filtering needed for fault type view
        break;
      case 'equipment':
        // No additional filtering needed for equipment view
        break;
      case 'nodes':
        // Filter to only show incidents with outage nodes
        filtered = filtered.filter(incident => 
          Object.values(incident.outageNodes).some(isOutage => isOutage)
        );
        break;
    }

    return filtered;
  };

  const calculateAnalytics = () => {
    const filteredIncidents = getFilteredIncidents();
    
    const domainFrequency: Record<string, number> = {};
    const faultTypeFrequency: Record<string, number> = {};
    const equipmentFrequency: Record<string, number> = {};
    const nodeFrequency: Record<string, number> = {};
    
    let totalResolutionTime = 0;
    let completedIncidentsCount = 0;
    let totalOutages = 0;

    filteredIncidents.forEach(incident => {
      // Count frequencies
      if (incident.domain) {
        domainFrequency[incident.domain] = (domainFrequency[incident.domain] || 0) + 1;
      }
      if (incident.faultType) {
        faultTypeFrequency[incident.faultType] = (faultTypeFrequency[incident.faultType] || 0) + 1;
      }
      if (incident.equipmentType) {
        equipmentFrequency[incident.equipmentType] = (equipmentFrequency[incident.equipmentType] || 0) + 1;
      }

      // Track node frequencies
      Object.entries(incident.outageNodes).forEach(([node, isOutage]) => {
        if (isOutage) {
          nodeFrequency[node] = (nodeFrequency[node] || 0) + 1;
        }
      });

      // Count outages
      if (Object.values(incident.outageNodes).some(isOutage => isOutage)) {
        totalOutages++;
      }

      // Calculate resolution time for completed incidents
      if (incident.status === 'Completed' && incident.faultEndTime && incident.timestamp) {
        const startTime = incident.timestamp.toDate();
        const endTime = incident.faultEndTime.toDate();
        if (endTime >= startTime) {
          const resolutionTime = endTime.getTime() - startTime.getTime();
          totalResolutionTime += resolutionTime;
          completedIncidentsCount++;
        }
      }
    });

    return {
      domainFrequency,
      faultTypeFrequency,
      equipmentFrequency,
      nodeFrequency,
      totalFaults: filteredIncidents.length,
      pendingFaults: filteredIncidents.filter(i => i.status === 'Pending').length,
      inProgressFaults: filteredIncidents.filter(i => i.status === 'In Progress').length,
      completedFaults: filteredIncidents.filter(i => i.status === 'Completed').length,
      totalOutages,
      averageResolutionTime: completedIncidentsCount > 0
        ? Math.round((totalResolutionTime / completedIncidentsCount) / (1000 * 60)) / 60
        : 0
    };
  };

  const analytics = calculateAnalytics();

  const getPieChartData = () => {
    // Get filtered incidents based on all active filters
    const filteredIncidents = getFilteredIncidents();
    
    // Count incidents by status
    const statusCounts = filteredIncidents.reduce((acc, incident) => {
      const status = incident.status?.toLowerCase() || '';
      if (status === 'in progress' || status === 'pending') {
        acc.inProgress = (acc.inProgress || 0) + 1;
      } else if (status === 'completed') {
        acc.completed = (acc.completed || 0) + 1;
      }
      return acc;
    }, { inProgress: 0, completed: 0 });

    return {
      labels: ['In Progress', 'Completed'],
      datasets: [{
        label: 'Fault Status Distribution',
        data: [statusCounts.inProgress, statusCounts.completed],
        backgroundColor: [
          '#ffc107', // Yellow for In Progress
          '#28a745', // Green for Completed
        ],
      }]
    };
  };

  const getBarChartData = () => {
    let data: Record<string, number> = {};
    let label = '';

    switch (chartView) {
      case 'domain':
        data = analytics.domainFrequency;
        label = 'Faults by Domain';
        break;
      case 'faultType':
        data = analytics.faultTypeFrequency;
        label = 'Faults by Type';
        break;
      case 'equipment':
        data = analytics.equipmentFrequency;
        label = 'Faults by Equipment';
        break;
      case 'nodes':
        data = analytics.nodeFrequency;
        label = 'Most Repeated Nodes';
        break;
    }

    const sortedData = Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      labels: sortedData.map(([key]) => key),
      datasets: [{
        label,
        data: sortedData.map(([, value]) => value),
        backgroundColor: chartView === 'nodes' ? '#22c55e' : '#0ea5e9',
        borderColor: chartView === 'nodes' ? '#16a34a' : '#0284c7',
        borderWidth: 1
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            size: 14
          }
        }
      },
      tooltip: {
        titleFont: {
          size: 16
        },
        bodyFont: {
          size: 14
        },
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        color: 'white',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 14
          }
        }
      },
      y: {
        ticks: {
          font: {
            size: 14
          }
        }
      }
    }
  };

  const handleCustomRangeConfirm = () => {
    if (customStartDate && customEndDate) {
      setTimeRange('custom');
      setShowCustomRange(false);
    }
  };

  return (
    <div className="analytics-container">
      <div className="filters">
        <select 
          value={timeRange}
          onChange={(e) => {
            setTimeRange(e.target.value);
            if (e.target.value === 'custom') {
              setShowCustomRange(true);
            }
          }}
          className="time-range"
        >
          <option value="24hours">Last 24 Hours</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="custom">Custom Range</option>
        </select>

        {showCustomRange && (
          <div className="custom-range">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="date-input"
            />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="date-input"
            />
            <button onClick={handleCustomRangeConfirm} className="btn btn-primary">
              Apply
            </button>
          </div>
        )}

        <select 
          value={chartView} 
          onChange={(e) => setChartView(e.target.value as 'domain' | 'faultType' | 'equipment' | 'nodes')}
          className="chart-view"
        >
          <option value="domain">By Domain</option>
          <option value="faultType">By Fault Type</option>
          <option value="equipment">By Equipment</option>
          <option value="nodes">Most Repeated Nodes</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Faults</h3>
          <p>{analytics.totalFaults}</p>
        </div>
        <div className="stat-card">
          <h3>Total Outages</h3>
          <p>{analytics.totalOutages}</p>
        </div>
        <div className="stat-card">
          <h3>Avg. Resolution Time</h3>
          <p>{analytics.averageResolutionTime.toFixed(2)} hours</p>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Status Distribution</h3>
          <div className="pie-chart">
            <Pie data={getPieChartData()} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>{chartView === 'nodes' ? 'Most Repeated Nodes' : 'Fault Distribution'}</h3>
          <div className="bar-chart">
            <Bar data={getBarChartData()} options={chartOptions} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .analytics-container {
          padding: 20px;
        }

        .filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          align-items: center;
        }

        .time-range, .date-input, .chart-view {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .custom-range {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }

        .stat-card h3 {
          margin: 0;
          font-size: 1rem;
          color: #666;
        }

        .stat-card p {
          margin: 10px 0 0;
          font-size: 1.5rem;
          font-weight: bold;
          color: #0ea5e9;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .chart-container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .chart-container h3 {
          margin: 0 0 20px;
          text-align: center;
          color: #333;
        }

        .pie-chart, .bar-chart {
          height: 300px;
          position: relative;
        }

        @media (max-width: 768px) {
          .filters {
            flex-direction: column;
          }

          .custom-range {
            flex-direction: column;
            width: 100%;
          }

          .time-range, .date-input, .chart-view {
            width: 100%;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
} 