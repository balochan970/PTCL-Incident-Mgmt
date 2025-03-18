import React, { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Incident } from '../../types/incident';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface TeamPerformanceMetricsProps {
  incidents: Incident[];
}

export default function TeamPerformanceMetrics({ incidents }: TeamPerformanceMetricsProps) {
  const [metricType, setMetricType] = useState<'resolutionTime' | 'incidentCount'>('resolutionTime');
  
  // Calculate team performance metrics
  const teamMetrics = useMemo(() => {
    // Filter incidents that have both start and end times and a closedBy field
    const resolvedIncidents = incidents.filter(
      (incident) => incident.timestamp && incident.faultEndTime && incident.closedBy
    );
    
    // Group incidents by team member
    const teamMemberMap: Record<string, { 
      incidents: Incident[], 
      totalResolutionTime: number 
    }> = {};
    
    resolvedIncidents.forEach((incident) => {
      const teamMember = incident.closedBy || 'Unknown';
      
      if (!teamMemberMap[teamMember]) {
        teamMemberMap[teamMember] = {
          incidents: [],
          totalResolutionTime: 0
        };
      }
      
      const startTime = incident.timestamp.toDate();
      const endTime = incident.faultEndTime?.toDate();
      
      if (endTime) {
        const resolutionTimeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        teamMemberMap[teamMember].incidents.push(incident);
        teamMemberMap[teamMember].totalResolutionTime += resolutionTimeHours;
      }
    });
    
    // Calculate metrics for each team member
    const teamMembers = Object.keys(teamMemberMap);
    const metrics = teamMembers.map(member => {
      const { incidents, totalResolutionTime } = teamMemberMap[member];
      const incidentCount = incidents.length;
      const averageResolutionTime = incidentCount > 0 
        ? parseFloat((totalResolutionTime / incidentCount).toFixed(2)) 
        : 0;
      
      return {
        teamMember: member,
        incidentCount,
        averageResolutionTime
      };
    });
    
    // Filter out team members with less than 2 incidents to focus on active members
    const activeMembers = metrics.filter(m => m.incidentCount >= 1);
    
    // Sort based on the selected metric
    return activeMembers.sort((a, b) => {
      if (metricType === 'resolutionTime') {
        return a.averageResolutionTime - b.averageResolutionTime; // Faster resolution time is better
      } else {
        return b.incidentCount - a.incidentCount; // More incidents resolved is better
      }
    }).slice(0, 10); // Limit to top 10 for readability
  }, [incidents, metricType]);
  
  // Prepare chart data
  const chartData = {
    labels: teamMetrics.map(item => item.teamMember),
    datasets: [
      {
        label: metricType === 'resolutionTime' 
          ? 'Average Resolution Time (hours)' 
          : 'Incidents Resolved',
        data: metricType === 'resolutionTime' 
          ? teamMetrics.map(item => item.averageResolutionTime)
          : teamMetrics.map(item => item.incidentCount),
        backgroundColor: metricType === 'resolutionTime'
          ? 'rgba(75, 192, 192, 0.7)'
          : 'rgba(153, 102, 255, 0.7)',
        borderColor: metricType === 'resolutionTime'
          ? 'rgba(75, 192, 192, 1)'
          : 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        position: 'top' as const,
        display: true,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const metric = teamMetrics[index];
            if (metricType === 'resolutionTime') {
              return [
                `Average: ${metric.averageResolutionTime} hours`,
                `Incidents resolved: ${metric.incidentCount}`
              ];
            } else {
              return [
                `Incidents resolved: ${metric.incidentCount}`,
                `Average resolution time: ${metric.averageResolutionTime} hours`
              ];
            }
          }
        }
      },
      datalabels: {
        display: false
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: metricType === 'resolutionTime' ? 'Hours' : 'Count',
        },
        ticks: {
          callback: function(value: any) {
            return metricType === 'resolutionTime' ? value + ' hrs' : value;
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Team Member',
        },
      },
    },
  };

  // If no data, show a placeholder chart with dummy data
  if (teamMetrics.length === 0) {
    const placeholderData = {
      labels: ['No Team Data Available'],
      datasets: [
        {
          label: 'No team performance data available',
          data: [0],
          backgroundColor: 'rgba(200, 200, 200, 0.3)',
          borderColor: 'rgba(200, 200, 200, 1)',
          borderWidth: 1,
        },
      ],
    };

    const placeholderOptions = {
      ...options,
      indexAxis: 'x' as const,
      plugins: {
        ...options.plugins,
        legend: {
          ...options.plugins.legend,
          display: true,
        },
        tooltip: {
          enabled: false,
        },
      },
      scales: {
        x: {
          display: false,
        },
        y: {
          display: false,
        },
      },
    };

    return (
      <div>
        <div className="flex justify-center mb-4 space-x-2">
          <button
            onClick={() => setMetricType('resolutionTime')}
            className={`px-3 py-1 rounded ${
              metricType === 'resolutionTime' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            Resolution Time
          </button>
          <button
            onClick={() => setMetricType('incidentCount')}
            className={`px-3 py-1 rounded ${
              metricType === 'incidentCount' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            Incidents Resolved
          </button>
        </div>
        
        <div className="h-72 flex flex-col justify-center items-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No team performance data available for the selected period</p>
          <div className="w-full h-40">
            <Bar data={placeholderData} options={placeholderOptions} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-4 space-x-2">
        <button
          onClick={() => setMetricType('resolutionTime')}
          className={`px-3 py-1 rounded ${
            metricType === 'resolutionTime' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}
        >
          Resolution Time
        </button>
        <button
          onClick={() => setMetricType('incidentCount')}
          className={`px-3 py-1 rounded ${
            metricType === 'incidentCount' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}
        >
          Incidents Resolved
        </button>
      </div>
      
      <div className="h-72">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
} 