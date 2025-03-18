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
  ChartData,
  ChartOptions,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Context } from 'chartjs-plugin-datalabels';
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

interface StakeholderPerformanceMetricsProps {
  incidents: Incident[];
}

export default function StakeholderPerformanceMetrics({ incidents }: StakeholderPerformanceMetricsProps) {
  const [metricType, setMetricType] = useState<'involvement' | 'resolutionTime'>('involvement');
  
  // Calculate stakeholder performance metrics
  const stakeholderMetrics = useMemo(() => {
    // Filter relevant incidents based on metric type
    const relevantIncidents = metricType === 'resolutionTime'
      ? incidents.filter(incident => incident.timestamp && incident.faultEndTime && incident.status === 'Completed')
      : incidents;
    
    // Create a map to store stakeholder data
    const stakeholderMap: Record<string, { 
      involvementCount: number,
      incidents: Incident[],
      totalResolutionTime: number 
    }> = {};
    
    // Process each incident
    relevantIncidents.forEach((incident) => {
      // Process each stakeholder in the incident
      (incident.stakeholders || []).forEach(stakeholder => {
        if (!stakeholderMap[stakeholder]) {
          stakeholderMap[stakeholder] = {
            involvementCount: 0,
            incidents: [],
            totalResolutionTime: 0
          };
        }
        
        stakeholderMap[stakeholder].involvementCount++;
        
        // For completed incidents, calculate resolution time
        if (incident.status === 'Completed' && incident.timestamp && incident.faultEndTime) {
          const startTime = incident.timestamp.toDate();
          const endTime = incident.faultEndTime.toDate();
          
          if (endTime && startTime) {
            const resolutionTimeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            stakeholderMap[stakeholder].incidents.push(incident);
            stakeholderMap[stakeholder].totalResolutionTime += resolutionTimeHours;
          }
        }
      });
    });
    
    // Calculate metrics for each stakeholder
    const stakeholders = Object.keys(stakeholderMap);
    const metrics = stakeholders.map(stakeholder => {
      const { involvementCount, incidents, totalResolutionTime } = stakeholderMap[stakeholder];
      const incidentCount = incidents.length;
      const averageResolutionTime = incidentCount > 0 
        ? parseFloat((totalResolutionTime / incidentCount).toFixed(2)) 
        : 0;
      
      return {
        stakeholder,
        involvementCount,
        incidentCount,
        averageResolutionTime
      };
    });
    
    // Filter stakeholders with at least 1 incident and sort based on the selected metric
    const activeStakeholders = metrics.filter(m => m.involvementCount >= 1);
    
    return activeStakeholders.sort((a, b) => {
      if (metricType === 'resolutionTime') {
        return a.averageResolutionTime - b.averageResolutionTime; // Lower is better
      } else {
        return b.involvementCount - a.involvementCount; // Higher is better
      }
    }).slice(0, 10); // Limit to top 10 for readability
  }, [incidents, metricType]);
  
  // Prepare chart data
  const chartData = {
    labels: stakeholderMetrics.map(item => item.stakeholder),
    datasets: [
      {
        label: metricType === 'resolutionTime' 
          ? 'Average Resolution Time (hours)' 
          : 'Incident Involvement Count',
        data: metricType === 'resolutionTime' 
          ? stakeholderMetrics.map(item => item.averageResolutionTime)
          : stakeholderMetrics.map(item => item.involvementCount),
        backgroundColor: metricType === 'resolutionTime'
          ? 'rgba(255, 99, 132, 0.7)'
          : 'rgba(54, 162, 235, 0.7)',
        borderColor: metricType === 'resolutionTime'
          ? 'rgba(255, 99, 132, 1)'
          : 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        datalabels: {
          display: true,
          color: '#fff',
          backgroundColor: (context: Context) => context.dataset.backgroundColor as string,
          borderRadius: 3,
          font: {
            weight: 'bold' as const
          },
          formatter: (value: number) => value
        }
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
        labels: {
          font: {
            size: 12,
            weight: 'bold' as const
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const metric = stakeholderMetrics[index];
            if (metricType === 'resolutionTime') {
              return [
                `Average: ${metric.averageResolutionTime} hours`,
                `Incidents resolved: ${metric.incidentCount}`,
                `Total involvement: ${metric.involvementCount}`
              ];
            } else {
              return [
                `Incident involvement: ${metric.involvementCount}`,
                `Completed incidents: ${metric.incidentCount}`,
                `Avg resolution time: ${metric.averageResolutionTime.toFixed(1)} hours`
              ];
            }
          }
        }
      },
      datalabels: {
        align: 'end' as const,
        anchor: 'end' as const,
        display: true,
        color: '#333',
        font: {
          weight: 'bold' as const
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Stakeholders',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        ticks: {
          font: {
            weight: 'bold' as const
          }
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: metricType === 'involvement' ? 'Number of Incidents' : 'Resolution Time (hours)',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        ticks: {
          font: {
            weight: 'bold' as const
          },
          callback: (value: any) => metricType === 'resolutionTime' ? `${value}h` : value
        }
      },
    },
  };

  // Placeholder data for empty state
  const placeholderData = {
    labels: ['No Data'],
    datasets: [{ 
      label: 'No stakeholder data available',
      data: [0],
      backgroundColor: 'rgba(200, 200, 200, 0.2)',
      borderColor: 'rgba(200, 200, 200, 1)',
      borderWidth: 1
    }]
  };
  
  const placeholderOptions = {
    ...options,
    plugins: {
      ...options.plugins,
      tooltip: { enabled: false },
      datalabels: { display: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  // If no data available
  if (stakeholderMetrics.length === 0) {
    return (
      <div>
        <div className="flex justify-center mb-4 space-x-2">
          <button
            onClick={() => setMetricType('involvement')}
            className={`px-3 py-1 rounded ${
              metricType === 'involvement' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            } font-bold`}
          >
            Incident Involvement
          </button>
          <button
            onClick={() => setMetricType('resolutionTime')}
            className={`px-3 py-1 rounded ${
              metricType === 'resolutionTime' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            } font-bold`}
          >
            Resolution Time
          </button>
        </div>
        
        <div className="h-72 flex flex-col justify-center items-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4 font-bold">No stakeholder data available for the selected period</p>
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
          onClick={() => setMetricType('involvement')}
          className={`px-3 py-1 rounded ${
            metricType === 'involvement' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          } font-bold`}
        >
          Incident Involvement
        </button>
        <button
          onClick={() => setMetricType('resolutionTime')}
          className={`px-3 py-1 rounded ${
            metricType === 'resolutionTime' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          } font-bold`}
        >
          Resolution Time
        </button>
      </div>
      
      <div className="h-72">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
} 