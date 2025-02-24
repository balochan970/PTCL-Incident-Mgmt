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

interface GPONIncident {
  id: string;
  incidentNumber: string;
  exchangeName: string;
  fdh: string;
  fats: { id: string; value: string }[];
  oltIp: string;
  fsps: { id: string; value: string }[];
  isOutage: boolean;
  stakeholders: string[];
  ticketGenerator: string;
  timestamp: any;
  faultEndTime?: any;
  status: string;
  closedBy?: string;
  remarks?: string;
}

interface GPONFaultAnalyticsProps {
  incidents: GPONIncident[];
}

export default function GPONFaultAnalytics({ incidents }: GPONFaultAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [chartView, setChartView] = useState<'exchange' | 'fdh' | 'fat' | 'fsp' | 'fdh-fat'>('exchange');

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
      case 'exchange':
        // No additional filtering needed for exchange view
        break;
      case 'fdh':
        // Filter incidents with FDH
        filtered = filtered.filter(incident => incident.fdh);
        break;
      case 'fat':
        // Filter incidents with FATs
        filtered = filtered.filter(incident => incident.fats && incident.fats.length > 0);
        break;
      case 'fsp':
        // Filter incidents with FSPs
        filtered = filtered.filter(incident => incident.fsps && incident.fsps.length > 0);
        break;
      case 'fdh-fat':
        // Filter incidents with both FDH and FATs
        filtered = filtered.filter(incident => 
          incident.fdh && incident.fats && incident.fats.length > 0
        );
        break;
    }

    return filtered;
  };

  const calculateAnalytics = () => {
    const filteredIncidents = getFilteredIncidents();
    let exchangeFrequency: Record<string, number> = {};
    let fdhFrequency: Record<string, number> = {};
    let fatFrequency: Record<string, number> = {};
    let fspFrequency: Record<string, number> = {};
    let totalOutages = 0;
    let totalResolutionTime = 0;
    let completedIncidentsCount = 0;
    let fdhFatCombos: Record<string, number> = {};

    filteredIncidents.forEach(incident => {
      // Exchange frequency
      if (incident.exchangeName) {
        exchangeFrequency[incident.exchangeName] = (exchangeFrequency[incident.exchangeName] || 0) + 1;
      }

      // FDH frequency
      if (incident.fdh) {
        fdhFrequency[incident.fdh] = (fdhFrequency[incident.fdh] || 0) + 1;
      }

      // FAT frequency
      incident.fats.forEach(fat => {
        if (fat.value) {
          fatFrequency[fat.value] = (fatFrequency[fat.value] || 0) + 1;
          // Track FDH-FAT combinations
          const combo = `${incident.fdh} - ${fat.value}`;
          fdhFatCombos[combo] = (fdhFatCombos[combo] || 0) + 1;
        }
      });

      // FSP frequency
      incident.fsps.forEach(fsp => {
        if (fsp.value) {
          fspFrequency[fsp.value] = (fspFrequency[fsp.value] || 0) + 1;
        }
      });

      // Count outages
      if (incident.isOutage) {
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
      exchangeFrequency,
      fdhFrequency,
      fatFrequency,
      fspFrequency,
      fdhFatCombos,
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
      case 'exchange':
        data = analytics.exchangeFrequency;
        label = 'Faults by Exchange';
        break;
      case 'fdh':
        data = analytics.fdhFrequency;
        label = 'Faults by FDH';
        break;
      case 'fat':
        data = analytics.fatFrequency;
        label = 'Faults by FAT';
        break;
      case 'fsp':
        data = analytics.fspFrequency;
        label = 'Faults by FSP';
        break;
      case 'fdh-fat':
        data = analytics.fdhFatCombos;
        label = 'Most Repeated FDH-FAT Combinations';
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
        backgroundColor: chartView === 'fdh-fat' ? '#22c55e' : '#0ea5e9',
        borderColor: chartView === 'fdh-fat' ? '#16a34a' : '#0284c7',
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
          onChange={(e) => setChartView(e.target.value as 'exchange' | 'fdh' | 'fat' | 'fsp' | 'fdh-fat')}
          className="chart-view"
        >
          <option value="exchange">By Exchange</option>
          <option value="fdh">By FDH</option>
          <option value="fat">By FAT</option>
          <option value="fsp">By FSP</option>
          <option value="fdh-fat">Most Repeated Nodes</option>
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
          <h3>Fault Distribution</h3>
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
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
        }
      `}</style>
    </div>
  );
} 