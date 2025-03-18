"use client";
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import NavBar from '../components/NavBar';
import { Incident } from '../types/incident';
import TeamPerformanceMetrics from './components/TeamPerformanceMetrics';
import StakeholderPerformanceMetrics from './components/StakeholderPerformanceMetrics';
import ExchangePerformanceMetrics from './components/ExchangePerformanceMetrics';
import TrendAnalysis from './components/TrendAnalysis';
import ChartDashboard from './components/ChartDashboard';
import { format, subDays, startOfDay, endOfDay, subMonths } from 'date-fns';
import Link from 'next/link';
import { Home, AlertTriangle, BarChart4, ChevronDown } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function AnalyticsDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const { toast } = useToast();
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [totalOpenIncidents, setTotalOpenIncidents] = useState(0);
  const [averageResolutionTime, setAverageResolutionTime] = useState(0);
  const [selectedChartMetric, setSelectedChartMetric] = useState<'faultResolution' | 'faultType' | 'equipmentType' | 'domainDistribution'>('faultType');
  const [selectedMetrics, setSelectedMetrics] = useState<{
    bottomLeft: 'teamPerformance' | 'stakeholderPerformance' | 'exchangePerformance';
  }>({
    bottomLeft: 'teamPerformance'
  });

  useEffect(() => {
    fetchIncidents();
    fetchDashboardStats();
  }, [timeRange, customStartDate, customEndDate]);

  // Fetch dashboard statistics separately
  const fetchDashboardStats = async () => {
    try {
      // Fetch total incidents
      const totalIncidentsQuery = query(collection(db, 'incidents'));
      const totalSnapshot = await getDocs(totalIncidentsQuery);
      setTotalIncidents(totalSnapshot.size);
      
      // Fetch open incidents
      const openIncidentsQuery = query(
        collection(db, 'incidents'), 
        where('status', 'in', ['In Progress', 'Pending', 'Open'])
      );
      const openSnapshot = await getDocs(openIncidentsQuery);
      setTotalOpenIncidents(openSnapshot.size);
      
      // Calculate average resolution time
      const closedIncidentsQuery = query(
        collection(db, 'incidents'), 
        where('status', '==', 'Completed'),
        limit(100) // Limit to avoid performance issues
      );
      const closedSnapshot = await getDocs(closedIncidentsQuery);
      
      let totalHours = 0;
      let countWithResolution = 0;
      
      closedSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp && data.faultEndTime) {
          const startTime = data.timestamp.toDate();
          const endTime = data.faultEndTime.toDate();
          const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalHours += diffHours;
          countWithResolution++;
        }
      });
      
      if (countWithResolution > 0) {
        setAverageResolutionTime(totalHours / countWithResolution);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      // Calculate date range based on selected time range
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of day
      } else {
        const now = new Date();
        
        switch (timeRange) {
          case '7days':
            startDate = subDays(now, 7);
            break;
          case '30days':
            startDate = subDays(now, 30);
            break;
          case '90days':
            startDate = subDays(now, 90);
            break;
          case '6months':
            startDate = subMonths(now, 6);
            break;
          case '1year':
            startDate = subMonths(now, 12);
            break;
          default:
            startDate = subDays(now, 30);
            break;
        }
        
        endDate = now;
      }
      
      let incidentsQuery;
      
      if (startDate && endDate) {
        incidentsQuery = query(
          collection(db, 'incidents'),
          where('timestamp', '>=', startDate),
          where('timestamp', '<=', endDate),
          orderBy('timestamp', 'desc')
        );
      } else {
        incidentsQuery = query(
          collection(db, 'incidents'),
          orderBy('timestamp', 'desc')
        );
      }

      const querySnapshot = await getDocs(incidentsQuery);
      
      const fetchedIncidents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incident[];
      
        setIncidents(fetchedIncidents);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load incident data. Please try again later.');
      setLoading(false);
      
      toast({
        title: "Error Loading Data",
        description: "There was a problem fetching the incidents data.",
        variant: "destructive"
      });
    }
  };

  const formatResolutionTime = (hours: number) => {
    if (isNaN(hours) || hours === 0) return 'N/A';
    
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (minutes === 0) {
      return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''}`;
    } else {
      return `${wholeHours}h ${minutes}m`;
    }
  };

  const renderMetricComponent = (position: 'bottomLeft' | 'bottomRight') => {
    if (position === 'bottomRight') {
      return <TrendAnalysis incidents={incidents} timeRange={timeRange} metricType={selectedMetrics.bottomLeft} />;
    }
    
    const metricType = selectedMetrics[position];
    
    switch (metricType) {
      case 'teamPerformance':
        return <TeamPerformanceMetrics incidents={incidents} />;
      case 'stakeholderPerformance':
        return <StakeholderPerformanceMetrics incidents={incidents} />;
      case 'exchangePerformance':
        return <ExchangePerformanceMetrics incidents={incidents} />;
      default:
        return <div>Select a metric</div>;
    }
  };

  const getMetricTitle = (metricType: string) => {
    switch (metricType) {
      case 'faultResolution':
        return 'Fault Resolution Time';
      case 'faultType':
        return 'Fault Type Distribution';
      case 'equipmentType':
        return 'Equipment Type Distribution';
      case 'domainDistribution':
        return 'Domain Distribution';
      case 'teamPerformance':
        return 'Team Performance Metrics';
      case 'stakeholderPerformance':
        return 'Stakeholder Performance';
      case 'exchangePerformance':
        return 'Exchange Performance';
      case 'trendAnalysis':
        return 'Trend Analysis';
      default:
        return 'Analytics';
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8E8] dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-6">
        {/* Header with Back to Home button */}
        <div className="flex items-center justify-between mb-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-full">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              View performance metrics and trends to help improve incident resolution.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end mb-4">
          <Link href="/">
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md">
              <Home size={18} />
              <span>Back to Home</span>
            </button>
          </Link>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex flex-col items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Total Incidents</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalIncidents}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex flex-col items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Open Incidents</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{totalOpenIncidents}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex flex-col items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Avg. Resolution Time</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {formatResolutionTime(averageResolutionTime)}
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="flex flex-wrap items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Time Range</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a time period to analyze</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => { setTimeRange('7days'); setShowCustomRange(false); }}
                className={`px-4 py-2 rounded-md font-bold ${timeRange === '7days' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => { setTimeRange('30days'); setShowCustomRange(false); }}
                className={`px-4 py-2 rounded-md font-bold ${timeRange === '30days' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
              >
                30 Days
              </button>
              <button
                onClick={() => { setTimeRange('90days'); setShowCustomRange(false); }}
                className={`px-4 py-2 rounded-md font-bold ${timeRange === '90days' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
              >
                90 Days
              </button>
              <button
                onClick={() => { setTimeRange('6months'); setShowCustomRange(false); }}
                className={`px-4 py-2 rounded-md font-bold ${timeRange === '6months' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
              >
                6 Months
              </button>
              <button
                onClick={() => { setTimeRange('1year'); setShowCustomRange(false); }}
                className={`px-4 py-2 rounded-md font-bold ${timeRange === '1year' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
              >
                1 Year
              </button>
              <button
                onClick={() => setShowCustomRange(!showCustomRange)}
                className={`px-4 py-2 rounded-md font-bold ${timeRange === 'custom' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
              >
                Custom
              </button>
            </div>
          </div>

          {showCustomRange && (
            <div className="mt-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
              </div>
                <button
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    setTimeRange('custom');
                    fetchIncidents();
                  } else {
                    toast({
                      title: "Missing Dates",
                      description: "Please select both start and end dates.",
                      variant: "destructive"
                    });
                  }
                }}
                className="px-4 py-2 rounded-md bg-blue-600 text-white font-bold"
              >
                Apply Range
                </button>
            </div>
          )}
        </div>

        {/* Analytics Panels */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Loading Analytics...</h3>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Please wait while we process your incident data.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">Error Loading Data</h3>
            <p className="text-center text-red-600 dark:text-red-400">
              {error}
            </p>
            <button 
              onClick={fetchIncidents}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold"
            >
              Retry
            </button>
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <BarChart4 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Data Available</h3>
            <p className="text-center text-gray-600 dark:text-gray-400">
              No incidents found in the selected time range. Try selecting a different time period.
            </p>
          </div>
        ) : (
          <>
            {/* Top Panel - Combined Chart Dashboard */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                  {getMetricTitle(selectedChartMetric)}
                </h2>
                <div className="relative">
                  <select
                    value={selectedChartMetric}
                    onChange={(e) => setSelectedChartMetric(e.target.value as any)}
                    className="appearance-none pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  >
                    <option value="faultType">Fault Type Distribution</option>
                    <option value="faultResolution">Fault Resolution Time</option>
                    <option value="equipmentType">Equipment Type Distribution</option>
                    <option value="domainDistribution">Domain Distribution</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
              </div>
              <ChartDashboard incidents={incidents} metricType={selectedChartMetric} />
            </div>

            {/* Bottom Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bottom Left Panel */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {getMetricTitle(selectedMetrics.bottomLeft)}
                  </h2>
                  <div className="relative">
                    <select
                      value={selectedMetrics.bottomLeft}
                      onChange={(e) => setSelectedMetrics({
                        bottomLeft: e.target.value as any
                      })}
                      className="appearance-none pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                    >
                      <option value="teamPerformance">Team Performance</option>
                      <option value="stakeholderPerformance">Stakeholder Performance</option>
                      <option value="exchangePerformance">Exchange Performance</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  </div>
                </div>
                {renderMetricComponent('bottomLeft')}
              </div>

              {/* Bottom Right Panel - Fixed Trend Analysis */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {selectedMetrics.bottomLeft === 'teamPerformance' 
                      ? 'Team Performance Trend'
                      : selectedMetrics.bottomLeft === 'stakeholderPerformance'
                        ? 'Stakeholder Involvement Trend'
                        : selectedMetrics.bottomLeft === 'exchangePerformance'
                          ? 'Exchange Incidents Trend'
                          : 'Incident Trend Analysis'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Shows {selectedMetrics.bottomLeft === 'teamPerformance' 
                      ? 'team performance'
                      : selectedMetrics.bottomLeft === 'stakeholderPerformance'
                        ? 'stakeholder involvement'
                        : selectedMetrics.bottomLeft === 'exchangePerformance'
                          ? 'exchange incidents'
                          : 'incident frequency'} over time for the selected date range
                  </p>
                </div>
                {renderMetricComponent('bottomRight')}
              </div>
            </div>
          </>
        )}

        {/* Explanation Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Analytics Dashboard Guide</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            This dashboard provides a comprehensive view of incident metrics and performance indicators to help understand trends and improve response times.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Metric Types</h3>
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
                <li><span className="font-medium">Fault Resolution Time</span>: Average time to resolve incidents by fault type</li>
                <li><span className="font-medium">Fault Type Distribution</span>: Breakdown of incidents by fault category</li>
                <li><span className="font-medium">Equipment Type Distribution</span>: Incidents grouped by equipment</li>
                <li><span className="font-medium">Domain Distribution</span>: Incidents grouped by domain</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Performance Metrics</h3>
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
                <li><span className="font-medium">Team Performance</span>: Resolution metrics by team member</li>
                <li><span className="font-medium">Stakeholder Performance</span>: Analysis of stakeholder involvement</li>
                <li><span className="font-medium">Exchange Performance</span>: Incident metrics by exchange location</li>
                <li><span className="font-medium">Trend Analysis</span>: Incident frequency over time</li>
              </ul>
            </div>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mt-4">
            Use the dropdown selectors to customize which metrics you want to see in each panel.
          </p>
        </div>
      </div>
    </div>
  );
} 