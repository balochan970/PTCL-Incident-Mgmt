import React, { useMemo, useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Incident } from '../../types/incident';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface FaultTypeDistributionProps {
  incidents: Incident[];
  defaultType?: 'faultType' | 'domain' | 'equipmentType';
}

export default function FaultTypeDistribution({ incidents, defaultType = 'faultType' }: FaultTypeDistributionProps) {
  const [chartType, setChartType] = useState<'faultType' | 'domain' | 'equipmentType'>(defaultType);
  
  // Update chart type when defaultType changes
  useEffect(() => {
    setChartType(defaultType);
  }, [defaultType]);
  
  // Generate chart data based on selected chart type
  const chartData = useMemo(() => {
    // Count occurrences of each category
    const countMap: Record<string, number> = {};
    
    incidents.forEach((incident) => {
      let category: string;
      
      switch (chartType) {
        case 'domain':
          category = incident.domain || 'Unknown';
          break;
        case 'equipmentType':
          category = incident.equipmentType || 'Unknown';
          break;
        case 'faultType':
        default:
          category = incident.faultType || 'Unknown';
          break;
      }
      
      if (!countMap[category]) {
        countMap[category] = 0;
      }
      
      countMap[category]++;
    });
    
    // Sort categories by count (descending)
    const sortedCategories = Object.keys(countMap).sort((a, b) => countMap[b] - countMap[a]);
    
    // Generate colors for each category
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
      labels: sortedCategories,
      datasets: [
        {
          data: sortedCategories.map(category => countMap[category]),
          backgroundColor: sortedCategories.map((_, index) => getColor(index)),
          borderColor: sortedCategories.map((_, index) => getColor(index).replace('0.7', '1')),
          borderWidth: 1,
          datalabels: {
            display: true,
            color: '#fff',
            backgroundColor: (context: any) => {
              const backgroundColor = context.dataset.backgroundColor[context.dataIndex];
              return backgroundColor;
            },
            borderRadius: 3,
            font: {
              weight: 'bold' as const
            },
            formatter: (value: number, context: any) => {
              const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return percentage + '%';
            }
          }
        },
      ],
    };
  }, [incidents, chartType]);
  
  // Check if we have any data
  const hasData = useMemo(() => {
    return chartData.labels.length > 0;
  }, [chartData]);

  // Chart options
  const options = {
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
        formatter: (value: number, context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = ((value / total) * 100).toFixed(0);
          return Number(percentage) >= 5 ? percentage + '%' : '';
        }
      }
    },
  };

  // Render empty state if no data
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 p-4">
        <p className="text-gray-500 dark:text-gray-400 text-center font-bold">
          No incident data available to show distribution for the selected time period.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-4 space-x-2">
        <button
          onClick={() => setChartType('faultType')}
          className={`px-3 py-1 rounded ${
            chartType === 'faultType' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          } font-bold`}
        >
          Fault Type
        </button>
        <button
          onClick={() => setChartType('domain')}
          className={`px-3 py-1 rounded ${
            chartType === 'domain' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          } font-bold`}
        >
          Domain
        </button>
        <button
          onClick={() => setChartType('equipmentType')}
          className={`px-3 py-1 rounded ${
            chartType === 'equipmentType' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          } font-bold`}
        >
          Equipment Type
        </button>
      </div>
      
      <div className="h-72">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
} 