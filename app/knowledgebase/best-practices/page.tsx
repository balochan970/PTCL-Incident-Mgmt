"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
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
import { Search, Plus, Edit, Trash2, Star, Clock, User, AlertCircle, ThumbsUp, ThumbsDown, Image, Upload, X } from 'lucide-react';
import { bestPracticesService } from '@/lib/supabaseServices';
import { uploadImage } from '@/lib/supabaseImageService';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPractice, setCurrentPractice] = useState<BestPractice | null>(null);
  const [selectedPractice, setSelectedPractice] = useState<BestPractice | null>(null);
  const [isPracticeDetailOpen, setIsPracticeDetailOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [benefitsAndOutcomes, setBenefitsAndOutcomes] = useState('');
  
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
      const fetchedPractices = await bestPracticesService.getAll();
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
    if (!practices.length) return;
    
    let filtered = [...practices];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(practice => 
        practice.title.toLowerCase().includes(query) ||
        practice.description.toLowerCase().includes(query) ||
        practice.recommendations.some(rec => rec.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(practice => 
        practice.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    setFilteredPractices(filtered);
  };

  const handleImageUpload = async () => {
    if (!fileInputRef.current?.files || fileInputRef.current.files.length === 0) return;
    
    const file = fileInputRef.current.files[0];
    setUploadingImage(true);
    
    try {
      // Check file size limit (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size exceeds 5MB limit. Please use a smaller image.",
          variant: "destructive",
        });
        setUploadingImage(false);
        return;
      }
      
      // Upload the image to Supabase
      const imageUrl = await uploadImage(file);
      
      // Add the image URL to the uploadedImages array
      setUploadedImages(prev => [...prev, imageUrl]);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Success",
      description: "Image removed successfully",
    });
  };

  const handleCreatePractice = async () => {
    try {
      const recommendationsArray = recommendations.split('\n').map(s => s.trim()).filter(s => s);
      const benefitsArray = benefitsAndOutcomes.split('\n').map(s => s.trim()).filter(s => s);
      
      const newPractice: Omit<BestPractice, 'id' | 'createdAt' | 'updatedAt'> = {
        title,
        category,
        description,
        recommendations: recommendationsArray,
        benefitsAndOutcomes: benefitsArray,
        author: 'Current User', // Replace with actual user info
        likes: 0,
        dislikes: 0,
        imageUrls: uploadedImages
      };
      
      await bestPracticesService.create(newPractice);
      
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
      const recommendationsArray = recommendations.split('\n').map(s => s.trim()).filter(s => s);
      const benefitsArray = benefitsAndOutcomes.split('\n').map(s => s.trim()).filter(s => s);
      
      const updatedPractice: Partial<BestPractice> = {
        title,
        category,
        description,
        recommendations: recommendationsArray,
        benefitsAndOutcomes: benefitsArray,
        imageUrls: uploadedImages,
        updatedAt: new Date()
      };
      
      await bestPracticesService.update(currentPractice.id, updatedPractice);
      
      toast({
        title: "Success",
        description: "Best practice updated successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      setIsEditMode(false);
      setCurrentPractice(null);
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
    try {
      await bestPracticesService.delete(id);
      
      toast({
        title: "Success",
        description: "Best practice deleted successfully",
      });
      
      fetchPractices();
      
      if (selectedPractice && selectedPractice.id === id) {
        setSelectedPractice(null);
        setIsPracticeDetailOpen(false);
      }
    } catch (error) {
      console.error('Error deleting best practice:', error);
      toast({
        title: "Error",
        description: "Failed to delete best practice",
        variant: "destructive",
      });
    }
  };

  const handleEditPractice = (practice: BestPractice) => {
    setCurrentPractice(practice);
    setTitle(practice.title);
    setCategory(practice.category);
    setDescription(practice.description);
    setRecommendations(practice.recommendations.join('\n'));
    setBenefitsAndOutcomes(practice.benefitsAndOutcomes.join('\n'));
    setUploadedImages(practice.imageUrls || []);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleViewPractice = (practice: BestPractice) => {
    setSelectedPractice(practice);
    setIsPracticeDetailOpen(true);
  };

  const handleRatePractice = async (practiceId: string, isLike: boolean) => {
    try {
      const practice = practices.find(p => p.id === practiceId);
      if (!practice) return;
      
      const updatedPractice: Partial<BestPractice> = {
        likes: (practice.likes || 0) + (isLike ? 1 : 0),
        dislikes: (practice.dislikes || 0) + (isLike ? 0 : 1)
      };
      
      await bestPracticesService.update(practiceId, updatedPractice);
      
      toast({
        title: "Thank You",
        description: "Your feedback has been recorded.",
      });
      
      fetchPractices();
      
      if (selectedPractice && selectedPractice.id === practiceId) {
        const updatedSelectedPractice = {
          ...selectedPractice,
          likes: (selectedPractice.likes || 0) + (isLike ? 1 : 0),
          dislikes: (selectedPractice.dislikes || 0) + (isLike ? 0 : 1)
        };
        setSelectedPractice(updatedSelectedPractice);
      }
    } catch (error) {
      console.error('Error rating practice:', error);
      toast({
        title: "Error",
        description: "Failed to submit your rating",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setDescription('');
    setRecommendations('');
    setBenefitsAndOutcomes('');
    setUploadedImages([]);
    setCurrentPractice(null);
  };

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      date = date.toDate();
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get unique categories from practices
  const categories = ['all', ...new Set(practices.map(practice => practice.category))];

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half-star" className="h-4 w-4 fill-yellow-400 text-yellow-400 half-filled" />);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }
    
    return <div className="flex">{stars}</div>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Hidden file input for image uploads */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageUpload}
        />
        
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
              <Card key={practice.id} className="mb-4 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">{practice.title}</CardTitle>
                    <Badge variant="secondary">{practice.category}</Badge>
                  </div>
                  <CardDescription className="flex items-center text-xs space-x-2">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {practice.author}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(practice.updatedAt)}
                    </div>
                    <div className="flex items-center">
                      <div className="flex">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        <span>{practice.likes || 0}</span>
                      </div>
                      <div className="flex ml-2">
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        <span>{practice.dislikes || 0}</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm pb-2">
                  <div className="line-clamp-3">
                    {practice.description}
                  </div>
                  {practice.recommendations?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-xs">Recommendations:</p>
                      <ul className="list-disc list-inside text-xs pl-2 line-clamp-2">
                        {practice.recommendations.slice(0, 2).map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                        {practice.recommendations.length > 2 && (
                          <li className="text-muted-foreground">And {practice.recommendations.length - 2} more...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewPractice(practice)}
                  >
                    View Details
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPractice(practice);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePractice(practice.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                rows={8}
                placeholder="Describe the best practice in detail..."
              />
            </div>
            
            {/* Image upload section */}
            <div className="grid grid-cols-4 items-start gap-4">
              <label className="text-right pt-2">
                Images
              </label>
              <div className="col-span-3">
                <Button 
                  type="button" 
                  variant="outline"
                  className="mb-2" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingImage ? 'Uploading...' : 'Add Image'}
                </Button>
                
                {/* Display uploaded images */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative group border rounded p-1">
                        <img 
                          src={imageUrl} 
                          alt={`Image ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="examples" className="text-right pt-2">
                Recommendations
              </label>
              <Textarea
                id="examples"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="col-span-3"
                rows={5}
                placeholder="List recommendations, one per line"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="benefits" className="text-right pt-2">
                Benefits & Outcomes
              </label>
              <Textarea
                id="benefits"
                value={benefitsAndOutcomes}
                onChange={(e) => setBenefitsAndOutcomes(e.target.value)}
                className="col-span-3"
                rows={5}
                placeholder="List benefits and outcomes, one per line"
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
                <DialogTitle className="flex justify-between items-center">
                  <span>{selectedPractice.title}</span>
                  <Badge variant="secondary">{selectedPractice.category}</Badge>
                </DialogTitle>
                <DialogDescription>
                  <div className="flex items-center text-xs space-x-2 mt-1">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {selectedPractice.author}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Last updated {formatDate(selectedPractice.updatedAt)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        <span>{selectedPractice.likes || 0}</span>
                      </div>
                      <div className="flex items-center">
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        <span>{selectedPractice.dislikes || 0}</span>
                      </div>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 pt-2">
                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-2">Description</h3>
                  <div className="prose prose-sm max-w-none">
                    {selectedPractice.description}
                  </div>
                </div>
                
                {/* Display images */}
                {selectedPractice.imageUrls && selectedPractice.imageUrls.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold mb-2">Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedPractice.imageUrls.map((imageUrl, index) => (
                        <a 
                          key={index} 
                          href={imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block border rounded p-1 hover:opacity-90 transition-opacity"
                        >
                          <img 
                            src={imageUrl} 
                            alt={`Image ${index + 1}`}
                            className="w-full h-40 object-cover rounded"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedPractice.recommendations.map((rec, index) => (
                      <li key={index} className="pl-2">{rec}</li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-2">Benefits & Outcomes</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedPractice.benefitsAndOutcomes.map((outcome, index) => (
                      <li key={index} className="pl-2">{outcome}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex justify-between mt-4">
                  <div>
                    <span className="text-sm font-medium">Was this helpful?</span>
                    <div className="flex space-x-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                        onClick={() => handleRatePractice(selectedPractice.id, true)}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                        onClick={() => handleRatePractice(selectedPractice.id, false)}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        No
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPractice(selectedPractice)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleDeletePractice(selectedPractice.id);
                        setIsPracticeDetailOpen(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
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