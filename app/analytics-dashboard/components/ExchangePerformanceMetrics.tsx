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

interface ExchangePerformanceMetricsProps {
  incidents: Incident[];
}

export default function ExchangePerformanceMetrics({ incidents }: ExchangePerformanceMetricsProps) {
  const [metricType, setMetricType] = useState<'frequency' | 'resolutionTime'>('frequency');
  
  // Calculate exchange performance metrics
  const exchangeMetrics = useMemo(() => {
    // Group incidents by exchange
    const exchangeMap: Record<string, { 
      incidentCount: number,
      resolvedCount: number,
      totalResolutionTime: number 
    }> = {};
    
    // Process each incident
    incidents.forEach((incident) => {
      const exchange = incident.exchangeName || 'Unknown';
      
      if (!exchangeMap[exchange]) {
        exchangeMap[exchange] = {
          incidentCount: 0,
          resolvedCount: 0,
          totalResolutionTime: 0
        };
      }
      
      exchangeMap[exchange].incidentCount++;
      
      // For completed incidents, calculate resolution time
      if (incident.status === 'Completed' && incident.timestamp && incident.faultEndTime) {
        const startTime = incident.timestamp.toDate();
        const endTime = incident.faultEndTime.toDate();
        
        if (endTime >= startTime) {
          const resolutionTimeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          exchangeMap[exchange].resolvedCount++;
          exchangeMap[exchange].totalResolutionTime += resolutionTimeHours;
        }
      }
    });
    
    // Calculate metrics for each exchange
    const exchanges = Object.keys(exchangeMap);
    const metrics = exchanges.map(exchange => {
      const { incidentCount, resolvedCount, totalResolutionTime } = exchangeMap[exchange];
      const averageResolutionTime = resolvedCount > 0 
        ? parseFloat((totalResolutionTime / resolvedCount).toFixed(2)) 
        : 0;
      
      return {
        exchange,
        incidentCount,
        resolvedCount,
        averageResolutionTime
      };
    });
    
    // Filter exchanges with at least 1 incident and sort based on the selected metric
    const activeExchanges = metrics.filter(m => m.incidentCount >= 1);
    
    return activeExchanges.sort((a, b) => {
      if (metricType === 'resolutionTime') {
        // Sort by average resolution time, but only consider exchanges with resolved incidents
        if (a.resolvedCount === 0 && b.resolvedCount === 0) return 0;
        if (a.resolvedCount === 0) return 1; // Move exchanges with no resolutions to the end
        if (b.resolvedCount === 0) return -1;
        return a.averageResolutionTime - b.averageResolutionTime; // Lower is better
      } else {
        return b.incidentCount - a.incidentCount; // Higher incident count first
      }
    }).slice(0, 10); // Limit to top 10 for readability
  }, [incidents, metricType]);
  
  // Prepare chart data
  const chartData = {
    labels: exchangeMetrics.map(item => item.exchange),
    datasets: [
      {
        label: metricType === 'resolutionTime' 
          ? 'Average Resolution Time (hours)' 
          : 'Incident Count',
        data: metricType === 'resolutionTime' 
          ? exchangeMetrics.map(item => item.averageResolutionTime)
          : exchangeMetrics.map(item => item.incidentCount),
        backgroundColor: metricType === 'resolutionTime'
          ? 'rgba(75, 192, 192, 0.7)'
          : 'rgba(153, 102, 255, 0.7)',
        borderColor: metricType === 'resolutionTime'
          ? 'rgba(75, 192, 192, 1)'
          : 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
        datalabels: {
          display: true,
          color: '#fff',
          backgroundColor: context => context.dataset.backgroundColor,
          borderRadius: 3,
          font: {
            weight: 'bold'
          },
          formatter: (value) => value
        }
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
        labels: {
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const metric = exchangeMetrics[index];
            if (metricType === 'resolutionTime') {
              return [
                `Average: ${metric.averageResolutionTime} hours`,
                `Resolved incidents: ${metric.resolvedCount}`,
                `Total incidents: ${metric.incidentCount}`
              ];
            } else {
              return [
                `Total incidents: ${metric.incidentCount}`,
                `Resolved incidents: ${metric.resolvedCount}`,
                `Avg resolution time: ${metric.averageResolutionTime.toFixed(1)} hours`
              ];
            }
          }
        }
      },
      datalabels: {
        align: 'end',
        anchor: 'end',
        display: true,
        color: '#333',
        font: {
          weight: 'bold'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: metricType === 'resolutionTime' ? 'Hours' : 'Count',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          font: {
            weight: 'bold'
          },
          callback: function(value: any) {
            return metricType === 'resolutionTime' ? value + ' hrs' : value;
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Exchange',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            weight: 'bold'
          }
        }
      },
    },
  };

  // Placeholder data for empty state
  const placeholderData = {
    labels: ['No Data'],
    datasets: [{ 
      label: 'No exchange data available',
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
  if (exchangeMetrics.length === 0) {
    return (
      <div>
        <div className="flex justify-center mb-4 space-x-2">
          <button
            onClick={() => setMetricType('frequency')}
            className={`px-3 py-1 rounded ${
              metricType === 'frequency' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            } font-bold`}
          >
            Incident Frequency
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
          <p className="text-gray-500 dark:text-gray-400 mb-4 font-bold">No exchange data available for the selected period</p>
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
          onClick={() => setMetricType('frequency')}
          className={`px-3 py-1 rounded ${
            metricType === 'frequency' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          } font-bold`}
        >
          Incident Frequency
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