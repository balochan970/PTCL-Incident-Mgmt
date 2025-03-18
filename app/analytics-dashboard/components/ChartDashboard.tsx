import React, { useMemo, useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
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
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface ChartDashboardProps {
  incidents: Incident[];
  metricType: 'faultResolution' | 'faultType' | 'equipmentType' | 'domainDistribution';
}

export default function ChartDashboard({ incidents, metricType }: ChartDashboardProps) {
  // Parse the data based on the selected metric type
  const chartData = useMemo(() => {
    let data: Record<string, number> = {};
    let chartTitle = '';
    
    // For faultResolution, we need to calculate average resolution times
    if (metricType === 'faultResolution') {
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

      // Calculate average resolution time for each fault type
      Object.keys(faultTypeMap).forEach(faultType => {
        const times = faultTypeMap[faultType];
        const average = times.reduce((sum, time) => sum + time, 0) / times.length;
        data[faultType] = parseFloat(average.toFixed(2));
      });
      
      chartTitle = 'Fault Resolution Time';
    } else {
      // For other metric types, count occurrences
      incidents.forEach((incident) => {
        let category: string;
        
        switch (metricType) {
          case 'domainDistribution':
            category = incident.domain || 'Unknown';
            chartTitle = 'Domain Distribution';
            break;
          case 'equipmentType':
            category = incident.equipmentType || 'Unknown';
            chartTitle = 'Equipment Type';
            break;
          case 'faultType':
          default:
            category = incident.faultType || 'Unknown';
            chartTitle = 'Fault Type';
            break;
        }
        
        if (!data[category]) {
          data[category] = 0;
        }
        
        data[category]++;
      });
    }
    
    // Sort data by value (descending)
    const sortedEntries = Object.entries(data).sort((a, b) => {
      // For resolution time, lower is better, so sort ascending
      if (metricType === 'faultResolution') {
        return a[1] - b[1];
      }
      // For counts, higher is better, so sort descending
      return b[1] - a[1];
    });
    
    // Generate colors for categories
    const backgroundColors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
      'rgba(83, 102, 255, 0.7)',
      'rgba(40, 159, 64, 0.7)',
      'rgba(210, 199, 199, 0.7)',
    ];
    
    // If we have more categories than colors, repeat the colors
    const getColor = (index: number) => backgroundColors[index % backgroundColors.length];
    
    return {
      title: chartTitle,
      labels: sortedEntries.map(([label]) => label),
      values: sortedEntries.map(([, value]) => value),
      colors: sortedEntries.map((_, index) => getColor(index)),
      borderColors: sortedEntries.map((_, index) => getColor(index).replace('0.7', '1')),
    };
  }, [incidents, metricType]);
  
  // Check if we have data to display
  const hasData = useMemo(() => {
    return chartData.labels.length > 0;
  }, [chartData]);

  // Prepare chart data for pie chart
  const pieChartData = {
    labels: chartData.labels,
    datasets: [
      {
        data: chartData.values,
        backgroundColor: chartData.colors,
        borderColor: chartData.borderColors,
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare chart data for bar chart
  const barChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: metricType === 'faultResolution' 
          ? 'Average Resolution Time (hours)' 
          : `Number of Incidents`,
        data: chartData.values,
        backgroundColor: chartData.colors,
        borderColor: chartData.borderColors,
        borderWidth: 1,
      },
    ],
  };

  // Pie chart options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          padding: 15,
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        display: true,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            if (metricType === 'faultResolution') {
              return `${label}: ${value} hours`;
            }
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        display: true,
        color: '#fff',
        font: {
          weight: 'bold' as const,
          size: 11
        },
        backgroundColor: (context: any) => {
          const backgroundColor = context.dataset.backgroundColor[context.dataIndex];
          return backgroundColor;
        },
        borderRadius: 3,
        padding: 4,
        formatter: (value: number, context: any) => {
          if (metricType === 'faultResolution') {
            return `${value}h`;
          }
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = ((value / total) * 100).toFixed(0);
          if (Number(percentage) >= 5) {
            return `${percentage}%`;
          }
          return '';
        },
        // Ensure labels are anchored properly
        anchor: 'center' as const,
        align: 'center' as const,
        offset: 0,
        textStrokeColor: 'rgba(0,0,0,0.3)',
        textStrokeWidth: 2,
      }
    },
  };

  // Bar chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: true,
        labels: {
          font: {
            weight: 'bold' as const
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (metricType === 'faultResolution') {
              return `Average: ${context.raw} hours`;
            }
            const label = context.dataset.label || '';
            return `${label}: ${context.raw}`;
          }
        }
      },
      datalabels: {
        display: true,
        font: {
          weight: 'bold' as const,
          size: 11
        },
        color: (context: any) => {
          const value = context.dataset.data[context.dataIndex];
          // For smaller values, we'll use the bar color to ensure visibility
          return value < 5 ? context.dataset.backgroundColor[context.dataIndex] : '#fff';
        },
        backgroundColor: (context: any) => {
          const value = context.dataset.data[context.dataIndex];
          // Only add background for larger values
          if (value >= 5) {
            return context.dataset.backgroundColor[context.dataIndex];
          }
          return null;
        },
        borderRadius: 3,
        padding: 4,
        formatter: function(value: any) {
          if (metricType === 'faultResolution') {
            return value + ' hrs';
          }
          return value;
        },
        // Position the labels at the top of bars
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 0,
        textStrokeColor: 'rgba(0,0,0,0.3)',
        textStrokeWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: metricType === 'faultResolution' ? 'Hours' : 'Count',
          font: {
            weight: 'bold' as const
          }
        },
        ticks: {
          callback: function(value: any) {
            return metricType === 'faultResolution' ? value + ' hrs' : value;
          },
          font: {
            weight: 'bold' as const
          }
        }
      },
      x: {
        title: {
          display: true,
          text: chartData.title,
          font: {
            weight: 'bold' as const
          }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            weight: 'bold' as const
          }
        }
      },
    },
  };

  // Placeholder data for empty state
  const placeholderData = {
    labels: ['No Data'],
    datasets: [{ 
      label: 'No data available',
      data: [0],
      backgroundColor: 'rgba(200, 200, 200, 0.2)',
      borderColor: 'rgba(200, 200, 200, 1)',
      borderWidth: 1
    }]
  };
  
  // Render empty state if no data
  if (!hasData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center h-48 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-center font-bold mb-4">
            No data available for the selected metric and time period.
          </p>
          <div className="h-32 w-full">
            <Pie data={placeholderData} />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-48 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-center font-bold mb-4">
            No data available for the selected metric and time period.
          </p>
          <div className="h-32 w-full">
            <Bar data={placeholderData} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-72">
        <Pie data={pieChartData} options={pieOptions} />
      </div>
      <div className="h-72">
        <Bar data={barChartData} options={barOptions} />
      </div>
    </div>
  );
} 