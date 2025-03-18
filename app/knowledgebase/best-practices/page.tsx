"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import NavBar from '@/app/components/NavBar';
import { BestPractice } from '../types';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2, Star, Clock, User, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

// Define categories for best practices
const CATEGORIES = [
  "Network Configuration",
  "Troubleshooting",
  "Customer Service",
  "Equipment Installation",
  "Maintenance",
  "Safety",
  "Documentation",
  "All"
];

export default function BestPracticesPage() {
  const [practices, setPractices] = useState<BestPractice[]>([]);
  const [filteredPractices, setFilteredPractices] = useState<BestPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPractice, setCurrentPractice] = useState<BestPractice | null>(null);
  const [selectedPractice, setSelectedPractice] = useState<BestPractice | null>(null);
  const [isPracticeDetailOpen, setIsPracticeDetailOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Network Configuration');
  const [content, setContent] = useState('');
  const [examples, setExamples] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchPractices();
  }, []);

  useEffect(() => {
    filterPractices();
  }, [searchQuery, selectedCategory, practices]);

  const fetchPractices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bestPractices'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedPractices: BestPractice[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<BestPractice, 'id'>;
        const practice: BestPractice = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : (data.createdAt || new Date()),
          updatedAt: data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : (data.updatedAt || new Date()),
        };
        
        fetchedPractices.push(practice);
      });
      
      setPractices(fetchedPractices);
      setFilteredPractices(fetchedPractices);
    } catch (error) {
      console.error('Error fetching best practices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch best practices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPractices = () => {
    let filtered = [...practices];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(practice => 
        practice.title.toLowerCase().includes(query) || 
        practice.content.toLowerCase().includes(query) || 
        practice.examples.some(example => example.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(practice => practice.category === selectedCategory);
    }
    
    setFilteredPractices(filtered);
  };

  const handleCreatePractice = async () => {
    try {
      const examplesArray = examples.split('\n').map(e => e.trim()).filter(e => e);
      
      const newPractice = {
        title,
        category,
        content,
        examples: examplesArray,
        author: JSON.parse(localStorage.getItem('auth') || '{}').username || 'Unknown',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rating: 0,
        ratingCount: 0
      };
      
      await addDoc(collection(db, 'bestPractices'), newPractice);
      
      toast({
        title: "Success",
        description: "Best practice created successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      fetchPractices();
    } catch (error) {
      console.error('Error creating best practice:', error);
      toast({
        title: "Error",
        description: "Failed to create best practice",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePractice = async () => {
    if (!currentPractice) return;
    
    try {
      const examplesArray = examples.split('\n').map(e => e.trim()).filter(e => e);
      
      const updatedPractice = {
        title,
        category,
        content,
        examples: examplesArray,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(db, 'bestPractices', currentPractice.id), updatedPractice);
      
      toast({
        title: "Success",
        description: "Best practice updated successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      setIsEditMode(false);
      fetchPractices();
    } catch (error) {
      console.error('Error updating best practice:', error);
      toast({
        title: "Error",
        description: "Failed to update best practice",
        variant: "destructive",
      });
    }
  };

  const handleDeletePractice = async (id: string) => {
    if (confirm('Are you sure you want to delete this best practice?')) {
      try {
        await deleteDoc(doc(db, 'bestPractices', id));
        
        toast({
          title: "Success",
          description: "Best practice deleted successfully",
        });
        
        fetchPractices();
      } catch (error) {
        console.error('Error deleting best practice:', error);
        toast({
          title: "Error",
          description: "Failed to delete best practice",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditPractice = (practice: BestPractice) => {
    setCurrentPractice(practice);
    setTitle(practice.title);
    setCategory(practice.category);
    setContent(practice.content);
    setExamples(practice.examples.join('\n'));
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleViewPractice = (practice: BestPractice) => {
    setSelectedPractice(practice);
    setIsPracticeDetailOpen(true);
  };

  const handleRatePractice = async (practiceId: string, isHelpful: boolean) => {
    try {
      const practiceRef = doc(db, 'bestPractices', practiceId);
      const practice = practices.find(p => p.id === practiceId);
      
      if (!practice) return;
      
      const currentRating = practice.rating || 0;
      const currentCount = practice.ratingCount || 0;
      
      // Simple weighted average calculation
      const newRating = isHelpful 
        ? Math.min(5, currentRating + (5 - currentRating) / (currentCount + 1))
        : Math.max(1, currentRating - currentRating / (currentCount + 5));
      
      await updateDoc(practiceRef, {
        rating: parseFloat(newRating.toFixed(1)),
        ratingCount: (practice.ratingCount || 0) + 1
      });
      
      toast({
        title: "Thank you!",
        description: "Your feedback helps improve our best practices",
      });
      
      fetchPractices();
    } catch (error) {
      console.error('Error rating practice:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Network Configuration');
    setContent('');
    setExamples('');
    setCurrentPractice(null);
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 half-filled" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    
    return <div className="flex">{stars}</div>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Best Practices</h1>
          <Button onClick={() => { resetForm(); setIsFormOpen(true); setIsEditMode(false); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Best Practice
          </Button>
        </div>

        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search best practices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs 
              value={selectedCategory} 
              onValueChange={setSelectedCategory}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto">
                {CATEGORIES.slice(0, 7).map(category => (
                  <TabsTrigger key={category} value={category} className="text-xs md:text-sm">
                    {category}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="All" className="text-xs md:text-sm">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredPractices.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No best practices found</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || selectedCategory !== 'All'
                ? "Try adjusting your search criteria or category filter" 
                : "Get started by adding a new best practice"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPractices.map((practice) => (
              <Card key={practice.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{practice.title}</CardTitle>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditPractice(practice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePractice(practice.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="flex flex-col gap-1">
                    <Badge variant="outline">{practice.category}</Badge>
                    {(practice.rating ?? 0) > 0 && (
                      <div className="flex items-center mt-1">
                        {renderStars(practice.rating ?? 0)}
                        <span className="text-xs ml-1 text-gray-500">({practice.ratingCount ?? 0})</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                    {practice.content}
                  </p>
                </CardContent>
                <CardFooter className="pt-2 border-t flex justify-between items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {practice.author}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleViewPractice(practice)}>
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Practice Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Best Practice' : 'Create New Best Practice'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update the best practice details below' 
                : 'Fill in the details to create a new best practice'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="title" className="text-right">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Optimizing Router Configuration for Maximum Performance"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="category" className="text-right">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {CATEGORIES.filter(cat => cat !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="content" className="text-right pt-2">
                Content
              </label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="col-span-3"
                rows={8}
                placeholder="Describe the best practice in detail..."
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="examples" className="text-right pt-2">
                Examples
              </label>
              <Textarea
                id="examples"
                value={examples}
                onChange={(e) => setExamples(e.target.value)}
                className="col-span-3"
                rows={5}
                placeholder="List examples, one per line"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={isEditMode ? handleUpdatePractice : handleCreatePractice}>
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Practice Detail Dialog */}
      <Dialog open={isPracticeDetailOpen} onOpenChange={setIsPracticeDetailOpen}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedPractice && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPractice.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex flex-col gap-2 mt-2">
                    <Badge variant="outline">{selectedPractice.category}</Badge>
                    {(selectedPractice.rating ?? 0) > 0 && (
                      <div className="flex items-center mt-1">
                        {renderStars(selectedPractice.rating ?? 0)}
                        <span className="text-xs ml-1 text-gray-500">
                          ({selectedPractice.ratingCount ?? 0} {(selectedPractice.ratingCount ?? 0) === 1 ? 'rating' : 'ratings'})
                        </span>
                      </div>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Description</h3>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {selectedPractice.content}
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Examples</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {selectedPractice.examples.map((example, index) => (
                      <li key={index} className="text-gray-700 dark:text-gray-300">{example}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium mb-2">Was this best practice helpful?</h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleRatePractice(selectedPractice.id, true)}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" /> Yes, it was helpful
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleRatePractice(selectedPractice.id, false)}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" /> No, needs improvement
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center mt-6 pt-4 border-t">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    Created by {selectedPractice.author}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Last updated {selectedPractice.updatedAt instanceof Date 
                      ? selectedPractice.updatedAt.toLocaleDateString()
                      : (selectedPractice.updatedAt as any).toDate().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 