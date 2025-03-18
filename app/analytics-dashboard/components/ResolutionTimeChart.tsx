import React, { useMemo } from 'react';
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
import { Incident } from '../../types/incident';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ResolutionTimeChartProps {
  incidents: Incident[];
}

export default function ResolutionTimeChart({ incidents }: ResolutionTimeChartProps) {
  // Calculate resolution time in hours for each incident
  const resolutionData = useMemo(() => {
    // Filter incidents that have both start and end times
    const resolvedIncidents = incidents.filter(
      (incident) => incident.timestamp && incident.faultEndTime
    );

    // Calculate resolution time in hours and group by fault type
    const faultTypeMap: Record<string, number[]> = {};
    
    resolvedIncidents.forEach((incident) => {
      const startTime = incident.timestamp.toDate();
      const endTime = incident.faultEndTime?.toDate();
      
      if (endTime) {
        const resolutionTimeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        if (!faultTypeMap[incident.faultType]) {
          faultTypeMap[incident.faultType] = [];
        }
        
        faultTypeMap[incident.faultType].push(resolutionTimeHours);
      }
    });
    
    return faultTypeMap;
  }, [incidents]);
  
  // Check if we have data to display
  const hasData = useMemo(() => {
    return Object.keys(resolutionData).length > 0;
  }, [resolutionData]);

  // Calculate average resolution time for each fault type
  const averageResolutionTimes = useMemo(() => {
    const faultTypes = Object.keys(resolutionData);
    return faultTypes.map(faultType => {
      const times = resolutionData[faultType];
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      return {
        faultType,
        averageTime: parseFloat(average.toFixed(2)),
        count: times.length
      };
    });
  }, [resolutionData]);

  // Sort by average resolution time (descending)
  const sortedAverageResolutionTimes = useMemo(() => {
    return averageResolutionTimes.sort((a, b) => b.averageTime - a.averageTime);
  }, [averageResolutionTimes]);

  // Prepare chart data
  const chartData = {
    labels: sortedAverageResolutionTimes.map(item => item.faultType),
    datasets: [
      {
        label: 'Average Resolution Time (hours)',
        data: sortedAverageResolutionTimes.map(item => item.averageTime),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: true,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const count = sortedAverageResolutionTimes[index].count;
            return [
              `Average: ${context.raw} hours`,
              `Sample size: ${count} incidents`
            ];
          }
        }
      },
      datalabels: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours',
        },
        ticks: {
          callback: function(value: any) {
            return value + ' hrs';
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Fault Type',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  // Render empty state if no data
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 p-4">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No resolved incidents found for the selected time period. Resolution time data is only available for incidents with both start and end times.
        </p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <Bar data={chartData} options={options} />
    </div>
  );
} 