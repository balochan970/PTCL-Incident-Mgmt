import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Incident } from '../../types/incident';
import { format, subDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

interface TrendAnalysisProps {
  incidents: Incident[];
  timeRange: string;
  metricType?: 'teamPerformance' | 'stakeholderPerformance' | 'exchangePerformance' | 'general';
}

export default function TrendAnalysis({ incidents, timeRange, metricType = 'general' }: TrendAnalysisProps) {
  // Generate trend data based on time range and metric type
  const trendData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let intervals: Date[];
    let formatString: string;
    
    // Determine date range and interval based on selected time range
    switch (timeRange) {
      case '7days':
        startDate = subDays(now, 7);
        intervals = eachDayOfInterval({ start: startDate, end: now });
        formatString = 'MMM d';
        break;
      case '30days':
        startDate = subDays(now, 30);
        intervals = eachDayOfInterval({ start: startDate, end: now });
        formatString = 'MMM d';
        break;
      case '90days':
        startDate = subDays(now, 90);
        intervals = eachWeekOfInterval({ start: startDate, end: now });
        formatString = 'MMM d';
        break;
      case '6months':
      case '1year':
      default:
        startDate = subDays(now, timeRange === '6months' ? 180 : 365);
        intervals = eachMonthOfInterval({ start: startDate, end: now });
        formatString = 'MMM yyyy';
    }

    // Filter incidents based on metricType
    const filteredIncidents = incidents.filter(incident => {
      if (metricType === 'general') {
        return true; // Include all incidents
      } else if (metricType === 'teamPerformance') {
        return incident.closedBy; // Only incidents that have closedBy field
      } else if (metricType === 'stakeholderPerformance') {
        return incident.stakeholders && incident.stakeholders.length > 0; // Only incidents with stakeholders
      } else if (metricType === 'exchangePerformance') {
        return incident.exchangeName; // Only incidents with exchange name
      }
      return true;
    });
    
    // Count incidents for each interval
    const incidentCounts = intervals.map(intervalDate => {
      let intervalStart: Date;
      let intervalEnd: Date;
      
      // Set interval boundaries based on time range
      if (timeRange === '7days' || timeRange === '30days') {
        intervalStart = startOfDay(intervalDate);
        intervalEnd = endOfDay(intervalDate);
      } else if (timeRange === '90days') {
        intervalStart = startOfWeek(intervalDate);
        intervalEnd = endOfWeek(intervalDate);
      } else {
        intervalStart = startOfMonth(intervalDate);
        intervalEnd = endOfMonth(intervalDate);
      }
      
      // Count incidents in this interval
      const count = filteredIncidents.filter(incident => {
        const incidentDate = incident.timestamp.toDate();
        return isWithinInterval(incidentDate, { start: intervalStart, end: intervalEnd });
      }).length;
      
      return {
        date: intervalDate,
        label: format(intervalDate, formatString),
        count
      };
    });
    
    return incidentCounts;
  }, [incidents, timeRange, metricType]);
  
  // Get title based on metric type
  const getTrendTitle = () => {
    switch (metricType) {
      case 'teamPerformance':
        return 'Team Performance Trend';
      case 'stakeholderPerformance':
        return 'Stakeholder Involvement Trend';
      case 'exchangePerformance':
        return 'Exchange Incidents Trend';
      default:
        return 'Incident Frequency Trend';
    }
  };
  
  // Get chart colors based on metric type
  const getChartColors = () => {
    switch (metricType) {
      case 'teamPerformance':
        return {
          primary: 'rgba(75, 192, 192, 1)', // teal
          secondary: 'rgba(75, 192, 192, 0.2)',
          trend: 'rgba(75, 152, 152, 0.8)'
        };
      case 'stakeholderPerformance':
        return {
          primary: 'rgba(153, 102, 255, 1)', // purple
          secondary: 'rgba(153, 102, 255, 0.2)',
          trend: 'rgba(113, 72, 215, 0.8)'
        };
      case 'exchangePerformance':
        return {
          primary: 'rgba(255, 159, 64, 1)', // orange
          secondary: 'rgba(255, 159, 64, 0.2)',
          trend: 'rgba(215, 129, 44, 0.8)'
        };
      default:
        return {
          primary: 'rgba(53, 162, 235, 1)', // blue
          secondary: 'rgba(53, 162, 235, 0.2)',
          trend: 'rgba(255, 99, 132, 0.8)' // pink trend line for contrast
        };
    }
  };
  
  // Calculate 3-point moving average for smoother trend line
  const movingAverage = useMemo(() => {
    if (trendData.length < 3) return trendData.map(d => d.count);
    
    return trendData.map((data, index, array) => {
      if (index === 0) return data.count;
      if (index === array.length - 1) return data.count;
      
      const sum = array[index - 1].count + data.count + array[index + 1].count;
      return parseFloat((sum / 3).toFixed(1));
    });
  }, [trendData]);

  const colors = getChartColors();
  
  // Prepare chart data
  const chartData = {
    labels: trendData.map(item => item.label),
    datasets: [
      {
        label: `${metricType === 'general' ? 'Incident' : metricType.replace('Performance', '')} Count`,
        data: trendData.map(item => item.count),
        borderColor: colors.primary,
        backgroundColor: colors.secondary,
        pointBackgroundColor: colors.primary,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        fill: true,
        tension: 0.1, // Slightly smoothed line
      },
      {
        label: 'Trend (3-point avg)',
        data: movingAverage,
        borderColor: colors.trend,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        pointBackgroundColor: colors.trend,
        pointBorderColor: '#fff',
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
      }
    ],
  };
  
  // Find peak points for labels
  const peaks = trendData
    .map((item, index) => ({ ...item, index }))
    .filter((item, index, array) => {
      // Define a peak as a point that's 50% higher than the average
      const avg = array.reduce((sum, curr) => sum + curr.count, 0) / array.length;
      return item.count > Math.max(2, avg * 1.5);
    });
  
  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: getTrendTitle(),
        font: {
          size: 14,
          weight: 'bold' as const
        },
        padding: {
          bottom: 10
        },
        color: '#334155'
      },
      legend: {
        position: 'top' as const,
        display: true,
        labels: {
          font: {
            weight: 'bold' as const
          },
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          weight: 'bold' as const,
          size: 13
        },
        bodyFont: {
          size: 12
        },
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          label: (context: any) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.raw || 0;
            return `${datasetLabel}: ${value}`;
          }
        }
      },
      datalabels: {
        display: (context: any) => {
          // Only show labels for peak points
          const index = context.dataIndex;
          return peaks.some(peak => peak.index === index);
        },
        color: '#fff',
        backgroundColor: (context: any) => {
          return context.dataset.borderColor;
        },
        borderRadius: 3,
        padding: 4,
        font: {
          weight: 'bold' as const,
          size: 10
        },
        formatter: (value: number) => {
          return value;
        },
        anchor: 'end' as const,
        align: 'top' as const,
        offset: -2
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count',
          font: {
            weight: 'bold' as const
          }
        },
        ticks: {
          precision: 0,
          stepSize: 1,
          font: {
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time Period',
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
        },
        grid: {
          display: false
        }
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    hover: {
      mode: 'index' as const,
      intersect: false
    }
  };

  // If no data or all zeros, show a placeholder chart
  const hasData = trendData.some(item => item.count > 0);
  if (!hasData) {
    // Generate sample data for demonstration
    const sampleLabels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const placeholderData = {
      labels: sampleLabels,
      datasets: [
        {
          label: `No ${metricType === 'general' ? 'Incident' : metricType.replace('Performance', '')} Data Available`,
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: 'rgba(200, 200, 200, 0.7)',
          backgroundColor: 'rgba(200, 200, 200, 0.1)',
          pointBackgroundColor: 'rgba(200, 200, 200, 0.7)',
          pointBorderColor: '#fff',
          pointRadius: 4,
          borderWidth: 2,
          fill: true,
        }
      ],
    };

    return (
      <div className="h-72 flex flex-col justify-center items-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">No {metricType === 'general' ? 'trend' : metricType.replace('Performance', '')} data available for the selected period</p>
        <div className="w-full h-40">
          <Line 
            data={placeholderData} 
            options={{
              ...options,
              plugins: {
                ...options.plugins,
                tooltip: {
                  enabled: false,
                },
                legend: {
                  ...options.plugins.legend,
                  labels: {
                    color: 'rgba(150, 150, 150, 0.7)',
                  }
                }
              },
            }} 
          />
        </div>
        <p className="text-gray-400 dark:text-gray-500 mt-4 text-sm italic">This is a sample visualization. Real data will appear here when available.</p>
      </div>
    );
  }

  return (
    <div className="h-72">
      <Line data={chartData} options={options} />
    </div>
  );
} 