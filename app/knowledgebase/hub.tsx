"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import NavBar from '@/app/components/NavBar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, HelpCircle, Lightbulb, Search, Clock, TrendingUp, Loader2, Home } from 'lucide-react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { formatDistanceToNow } from 'date-fns';

// Define types for our data
interface RecentlyViewedItem {
  id: string;
  title: string;
  type: string;
  path: string;
  date: string;
}

interface PopularItem {
  id: string;
  title: string;
  type: string;
  path: string;
  views: string;
}

export default function KnowledgeBaseHub() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentCount, setDocumentCount] = useState(0);
  const [guideCount, setGuideCount] = useState(0);
  const [practiceCount, setPracticeCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch document count
        const docsSnapshot = await getDocs(collection(db, 'documentation'));
        setDocumentCount(docsSnapshot.size);

        // Fetch guide count
        const guidesSnapshot = await getDocs(collection(db, 'troubleshooting'));
        setGuideCount(guidesSnapshot.size);

        // Fetch practice count
        const practicesSnapshot = await getDocs(collection(db, 'best_practices'));
        setPracticeCount(practicesSnapshot.size);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    const fetchRecentlyViewed = async () => {
      try {
        // Get user ID from local storage
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        const userId = auth.userId || 'anonymous';

        // Fetch recently viewed items
        const viewedRef = collection(db, 'user_activity');
        const q = query(
          viewedRef, 
          where('userId', '==', userId),
          where('activityType', '==', 'view'),
          orderBy('timestamp', 'desc'),
          limit(3)
        );
        
        const snapshot = await getDocs(q);
        
        const recentItems: RecentlyViewedItem[] = [];
        for (const doc of snapshot.docs) {
          const data = doc.data();
          
          // Fetch the actual item based on the reference
          let itemData;
          let type;
          
          if (data.resourceType === 'documentation') {
            const itemDoc = await getDocs(query(collection(db, 'documentation'), where('id', '==', data.resourceId)));
            if (!itemDoc.empty) {
              itemData = itemDoc.docs[0].data();
              type = 'Documentation';
            }
          } else if (data.resourceType === 'troubleshooting') {
            const itemDoc = await getDocs(query(collection(db, 'troubleshooting'), where('id', '==', data.resourceId)));
            if (!itemDoc.empty) {
              itemData = itemDoc.docs[0].data();
              type = 'Troubleshooting Guide';
            }
          } else if (data.resourceType === 'best_practices') {
            const itemDoc = await getDocs(query(collection(db, 'best_practices'), where('id', '==', data.resourceId)));
            if (!itemDoc.empty) {
              itemData = itemDoc.docs[0].data();
              type = 'Best Practice';
            }
          }
          
          if (itemData) {
            recentItems.push({
              id: data.resourceId,
              title: itemData.title,
              type: type || 'Unknown',
              path: `/knowledgebase/${data.resourceType}`,
              date: formatDistanceToNow(data.timestamp.toDate(), { addSuffix: true })
            });
          }
        }
        
        setRecentlyViewed(recentItems);
      } catch (error) {
        console.error('Error fetching recently viewed:', error);
        // If there's an error or no data, use empty array
        setRecentlyViewed([]);
      }
    };

    const fetchPopular = async () => {
      try {
        // Fetch popular documentation
        const docQuery = query(
          collection(db, 'documentation'),
          orderBy('viewCount', 'desc'),
          limit(1)
        );
        const docSnapshot = await getDocs(docQuery);
        
        // Fetch popular best practices
        const practiceQuery = query(
          collection(db, 'best_practices'),
          orderBy('viewCount', 'desc'),
          limit(1)
        );
        const practiceSnapshot = await getDocs(practiceQuery);
        
        // Fetch popular troubleshooting guides
        const guideQuery = query(
          collection(db, 'troubleshooting'),
          orderBy('viewCount', 'desc'),
          limit(1)
        );
        const guideSnapshot = await getDocs(guideQuery);
        
        const popularItems: PopularItem[] = [];
        
        if (!docSnapshot.empty) {
          const doc = docSnapshot.docs[0];
          const data = doc.data();
          popularItems.push({
            id: doc.id,
            title: data.title,
            type: 'Documentation',
            path: `/knowledgebase/documentation`,
            views: `${data.viewCount || 0} views`
          });
        }
        
        if (!practiceSnapshot.empty) {
          const doc = practiceSnapshot.docs[0];
          const data = doc.data();
          popularItems.push({
            id: doc.id,
            title: data.title,
            type: 'Best Practice',
            path: `/knowledgebase/best-practices`,
            views: `${data.viewCount || 0} views`
          });
        }
        
        if (!guideSnapshot.empty) {
          const doc = guideSnapshot.docs[0];
          const data = doc.data();
          popularItems.push({
            id: doc.id,
            title: data.title,
            type: 'Troubleshooting Guide',
            path: `/knowledgebase/troubleshooting`,
            views: `${data.viewCount || 0} views`
          });
        }
        
        setPopular(popularItems);
      } catch (error) {
        console.error('Error fetching popular items:', error);
        // If there's an error or no data, use empty array
        setPopular([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
    fetchRecentlyViewed();
    fetchPopular();
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/knowledgebase/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const sections = [
    {
      title: "Documentation",
      description: "Access equipment manuals, network protocols, system configurations, and more.",
      icon: <FileText className="h-8 w-8 text-blue-500" />,
      path: "/knowledgebase/documentation",
      count: documentCount > 0 ? `${documentCount} document${documentCount !== 1 ? 's' : ''}` : "No documents yet",
      color: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      title: "Troubleshooting Guides",
      description: "Step-by-step solutions for common issues and equipment faults.",
      icon: <HelpCircle className="h-8 w-8 text-red-500" />,
      path: "/knowledgebase/troubleshooting",
      count: guideCount > 0 ? `${guideCount} guide${guideCount !== 1 ? 's' : ''}` : "No guides yet",
      color: "bg-red-50 dark:bg-red-900/20"
    },
    {
      title: "Best Practices",
      description: "Industry standards and recommended approaches for optimal performance.",
      icon: <Lightbulb className="h-8 w-8 text-yellow-500" />,
      path: "/knowledgebase/best-practices",
      count: practiceCount > 0 ? `${practiceCount} practice${practiceCount !== 1 ? 's' : ''}` : "No practices yet",
      color: "bg-yellow-50 dark:bg-yellow-900/20"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFF8E8] dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-6">
        {/* Header with Back to Home button */}
        <div className="flex items-center justify-between mb-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-full">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Knowledge Base Hub</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Access documentation, troubleshooting guides, and best practices to help resolve incidents efficiently.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end mb-4">
          <Link href="/">
            <button className="btn btn-primary">
              <span className="icon">🏠</span>
              Back to Home
            </button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-white">
              What are you looking for?
            </h2>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search the knowledge base..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2">
                Search
              </Button>
            </form>
          </div>
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {sections.map((section, index) => (
            <Link href={section.path} key={index} className="block">
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className={`${section.color} rounded-t-lg`}>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    {section.icon}
                  </div>
                  <CardDescription className="text-sm mt-2">
                    {section.count}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    {section.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Browse {section.title}
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recently Viewed and Popular */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recently Viewed */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-gray-500" />
                <CardTitle>Recently Viewed</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : recentlyViewed.length > 0 ? (
                <ul className="space-y-3">
                  {recentlyViewed.map((item, index) => (
                    <li key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                      <Link href={`${item.path}/${item.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 p-2 rounded">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h3>
                            <p className="text-sm text-gray-500">{item.type}</p>
                          </div>
                          <span className="text-xs text-gray-400">{item.date}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No recently viewed items</p>
                  <p className="text-sm mt-2">Items you view will appear here</p>
                </div>
              )}
            </CardContent>
            {recentlyViewed.length > 0 && (
              <CardFooter>
                <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  View All History
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Popular Resources */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-gray-500" />
                <CardTitle>Popular Resources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : popular.length > 0 ? (
                <ul className="space-y-3">
                  {popular.map((item, index) => (
                    <li key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                      <Link href={`${item.path}/${item.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 p-2 rounded">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h3>
                            <p className="text-sm text-gray-500">{item.type}</p>
                          </div>
                          <span className="text-xs text-gray-400">{item.views}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No popular resources yet</p>
                  <p className="text-sm mt-2">Popular items will appear here as they are viewed</p>
                </div>
              )}
            </CardContent>
            {popular.length > 0 && (
              <CardFooter>
                <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  View All Popular
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 