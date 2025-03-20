"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import NavBar from '@/app/components/NavBar';
import { TroubleshootingGuide, TroubleshootingSolution } from '../types';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Plus, Edit, Trash2, Star, Clock, User, AlertCircle, CheckCircle, ThumbsUp, ThumbsDown, ImageIcon, X } from 'lucide-react';
import { troubleshootingService } from '@/lib/supabaseServices';
import { uploadImage } from '@/lib/supabaseImageService';

export default function TroubleshootingGuidesPage() {
  const [guides, setGuides] = useState<TroubleshootingGuide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<TroubleshootingGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentGuide, setCurrentGuide] = useState<TroubleshootingGuide | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<TroubleshootingGuide | null>(null);
  const [isGuideDetailOpen, setIsGuideDetailOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [faultType, setFaultType] = useState('');
  const [solutions, setSolutions] = useState<TroubleshootingSolution[]>([
    { id: '1', steps: [''], expectedOutcome: '', successRate: 0, timeToResolve: '', images: [] }
  ]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchGuides();
  }, []);

  useEffect(() => {
    filterGuides();
  }, [searchQuery, guides]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const fetchedGuides = await troubleshootingService.getAll();
      console.log('Fetched guides:', fetchedGuides);
      setGuides(fetchedGuides);
      setFilteredGuides(fetchedGuides);
    } catch (error) {
      console.error('Error fetching guides:', error);
      toast({
        title: "Error",
        description: "Failed to fetch troubleshooting guides",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterGuides = () => {
    let filtered = [...guides];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guide => 
        guide.title.toLowerCase().includes(query) ||
        guide.problem.toLowerCase().includes(query) ||
        guide.symptoms.some(symptom => symptom.toLowerCase().includes(query))
      );
    }
    
    setFilteredGuides(filtered);
  };

  const handleCreateGuide = async () => {
    try {
      const symptomsArray = symptoms.split('\n').map(s => s.trim()).filter(s => s);
      
      const newGuide: Omit<TroubleshootingGuide, 'id' | 'createdAt' | 'updatedAt'> = {
        title,
        problem,
        symptoms: symptomsArray,
        equipmentType,
        faultType,
        solutions,
        author: 'Current User',
        rating: 0,
        ratingCount: 0
      };
      
      await troubleshootingService.create(newGuide);
      
      toast({
        title: "Success",
        description: "Troubleshooting guide created successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      fetchGuides();
    } catch (error) {
      console.error('Error creating guide:', error);
      toast({
        title: "Error",
        description: "Failed to create troubleshooting guide",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGuide = async () => {
    if (!currentGuide) return;
    
    try {
      const symptomsArray = symptoms.split('\n').map(s => s.trim()).filter(s => s);
      
      const updatedGuide: Partial<TroubleshootingGuide> = {
        title,
        problem,
        symptoms: symptomsArray,
        equipmentType,
        faultType,
        solutions,
        updatedAt: new Date()
      };
      
      await troubleshootingService.update(currentGuide.id, updatedGuide);
      
      toast({
        title: "Success",
        description: "Troubleshooting guide updated successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      setIsEditMode(false);
      setCurrentGuide(null);
      fetchGuides();
    } catch (error) {
      console.error('Error updating guide:', error);
      toast({
        title: "Error",
        description: "Failed to update troubleshooting guide",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGuide = async (id: string) => {
    try {
      await troubleshootingService.delete(id);
      
      toast({
        title: "Success",
        description: "Troubleshooting guide deleted successfully",
      });
      
      fetchGuides();
      if (selectedGuide && selectedGuide.id === id) {
        setSelectedGuide(null);
        setIsGuideDetailOpen(false);
      }
    } catch (error) {
      console.error('Error deleting guide:', error);
      toast({
        title: "Error",
        description: "Failed to delete troubleshooting guide",
        variant: "destructive",
      });
    }
  };

  const handleEditGuide = (guide: TroubleshootingGuide) => {
    setCurrentGuide(guide);
    setTitle(guide.title);
    setProblem(guide.problem);
    setSymptoms(guide.symptoms.join('\n'));
    setEquipmentType(guide.equipmentType);
    setFaultType(guide.faultType);
    setSolutions(guide.solutions);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleViewGuide = (guide: TroubleshootingGuide) => {
    console.log('Viewing guide with solutions:', guide.solutions);
    if (guide.solutions) {
      guide.solutions.forEach((solution, index) => {
        console.log(`Solution ${index} images:`, solution.images);
      });
    }
    setSelectedGuide(guide);
    setIsGuideDetailOpen(true);
  };

  const handleAddSolution = () => {
    setSolutions([
      ...solutions,
      {
        id: `solution-${Date.now()}`,
        steps: [''],
        expectedOutcome: '',
        successRate: 0,
        timeToResolve: '',
        images: []
      }
    ]);
  };

  const handleRemoveSolution = (index: number) => {
    setSolutions(solutions.filter((_, i) => i !== index));
  };

  const handleSolutionChange = (index: number, field: keyof TroubleshootingSolution, value: any) => {
    const updatedSolutions = [...solutions];
    if (field === 'steps' && typeof value === 'string') {
      updatedSolutions[index].steps = value.split('\n').map(s => s.trim()).filter(s => s);
    } else if (field === 'steps' && Array.isArray(value)) {
      updatedSolutions[index][field] = value;
    } else {
      // @ts-ignore (field access is safe)
      updatedSolutions[index][field] = value;
    }
    setSolutions(updatedSolutions);
  };

  const handleImageUpload = async (index: number) => {
    if (!fileInputRef.current?.files || fileInputRef.current.files.length === 0) return;
    
    const file = fileInputRef.current.files[0];
    setUploadingImage(true);
    setCurrentSolutionIndex(index);
    
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
      
      // Add the image URL to the solution
      const updatedSolutions = [...solutions];
      if (!updatedSolutions[index].images) {
        updatedSolutions[index].images = [];
      }
      updatedSolutions[index].images?.push(imageUrl);
      setSolutions(updatedSolutions);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
      
      // Reset the file input
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
      setCurrentSolutionIndex(null);
    }
  };

  const handleDeleteImage = (solutionIndex: number, imageIndex: number) => {
    const updatedSolutions = [...solutions];
    if (updatedSolutions[solutionIndex].images) {
      updatedSolutions[solutionIndex].images?.splice(imageIndex, 1);
      setSolutions(updatedSolutions);
      
      toast({
        title: "Success",
        description: "Image removed successfully",
      });
    }
  };

  const handleRateSolution = async (guideId: string, solutionId: string, isHelpful: boolean) => {
    try {
      const guide = guides.find(g => g.id === guideId);
      if (!guide) return;
      
      const solutionIndex = guide.solutions.findIndex(s => s.id === solutionId);
      if (solutionIndex === -1) return;
      
      const updatedSolutions = [...guide.solutions];
      const solution = { ...updatedSolutions[solutionIndex] };
      
      const currentRate = solution.successRate || 0;
      const currentCount = guide.ratingCount || 0;
      
      let newRate: number;
      if (currentCount === 0) {
        newRate = isHelpful ? 100 : 0;
      } else {
        const totalPositive = (currentRate / 100) * currentCount;
        const newTotalPositive = isHelpful ? totalPositive + 1 : totalPositive;
        newRate = (newTotalPositive / (currentCount + 1)) * 100;
      }
      
      solution.successRate = Math.round(newRate);
      updatedSolutions[solutionIndex] = solution;
      
      const updatedGuide: Partial<TroubleshootingGuide> = {
        solutions: updatedSolutions,
        ratingCount: (guide.ratingCount || 0) + 1
      };
      
      await troubleshootingService.update(guideId, updatedGuide);
      
      toast({
        title: "Thank You",
        description: "Your feedback has been recorded.",
      });
      
      fetchGuides();
      
      if (selectedGuide && selectedGuide.id === guideId) {
        const updatedSelectedGuide = {
          ...selectedGuide,
          solutions: updatedSolutions,
          ratingCount: (selectedGuide.ratingCount || 0) + 1
        };
        setSelectedGuide(updatedSelectedGuide);
      }
    } catch (error) {
      console.error('Error rating solution:', error);
      toast({
        title: "Error",
        description: "Failed to submit your rating",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setProblem('');
    setSymptoms('');
    setEquipmentType('');
    setFaultType('');
    setSolutions([
      { id: '1', steps: [''], expectedOutcome: '', successRate: 0, timeToResolve: '', images: [] }
    ]);
    setCurrentGuide(null);
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
          onChange={() => currentSolutionIndex !== null && handleImageUpload(currentSolutionIndex)}
        />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Troubleshooting Guides</h1>
          <Button onClick={() => { resetForm(); setIsFormOpen(true); setIsEditMode(false); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Guide
          </Button>
        </div>

        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search guides by title, problem, symptoms, equipment type, or fault type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No troubleshooting guides found</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? "Try adjusting your search criteria" 
                : "Get started by adding a new troubleshooting guide"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide) => (
              <Card key={guide.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{guide.title}</CardTitle>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditGuide(guide)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGuide(guide.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="flex items-center text-sm">
                    <Badge variant="outline" className="mr-2">{guide.equipmentType}</Badge>
                    <Badge variant="secondary">{guide.faultType}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                    {guide.problem}
                  </p>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Common Symptoms:</p>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc pl-4">
                      {guide.symptoms.slice(0, 3).map((symptom, index) => (
                        <li key={index} className="line-clamp-1">{symptom}</li>
                      ))}
                      {guide.symptoms.length > 3 && (
                        <li className="text-blue-500">+{guide.symptoms.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t flex justify-between items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {guide.author}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleViewGuide(guide)}>
                    View Solutions
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Troubleshooting Guide' : 'Create New Troubleshooting Guide'}</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new troubleshooting guide
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="title" className="text-right font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Resolving Wi-Fi Connectivity Issues"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="equipmentType" className="text-right font-medium">
                Equipment Type
              </label>
              <Input
                id="equipmentType"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Router, Switch, Fiber Modem"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="faultType" className="text-right font-medium">
                Fault Type
              </label>
              <Input
                id="faultType"
                value={faultType}
                onChange={(e) => setFaultType(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Connectivity, Hardware, Configuration"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="problem" className="text-right font-medium pt-2">
                Problem Description
              </label>
              <Textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="col-span-3"
                placeholder="Describe the problem in detail"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="symptoms" className="text-right font-medium pt-2">
                Symptoms
              </label>
              <Textarea
                id="symptoms"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="col-span-3"
                placeholder="List symptoms, one per line"
                rows={3}
              />
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Solutions</h3>
              {solutions.map((solution, index) => (
                <div key={solution.id} className="border rounded-lg p-4 mb-6 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium">Solution {index + 1}</h4>
                    {solutions.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveSolution(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-6">
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label className="text-right font-medium pt-2">
                        Steps
                      </label>
                      <Textarea
                        value={Array.isArray(solution.steps) ? solution.steps.join('\n') : ''}
                        onChange={(e) => handleSolutionChange(index, 'steps', e.target.value)}
                        className="col-span-3"
                        rows={4}
                        placeholder="List steps, one per line"
                      />
                    </div>
                    
                    {/* Image upload section */}
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label className="text-right font-medium pt-2">
                        Images
                      </label>
                      <div className="col-span-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="mb-2"
                          onClick={() => {
                            setCurrentSolutionIndex(index);
                            fileInputRef.current?.click();
                          }}
                          disabled={uploadingImage}
                        >
                          <ImageIcon className="mr-2 h-4 w-4" />
                          {uploadingImage && currentSolutionIndex === index 
                            ? 'Uploading...' 
                            : 'Add Image'}
                        </Button>
                        
                        {/* Display uploaded images */}
                        {solution.images && solution.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {solution.images.map((imageUrl, imgIndex) => (
                              <div key={imgIndex} className="relative group border rounded p-1">
                                <img 
                                  src={imageUrl} 
                                  alt={`Solution ${index + 1} image ${imgIndex + 1}`}
                                  className="w-full h-32 object-cover rounded"
                                />
                                <button
                                  type="button"
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteImage(index, imgIndex)}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-right font-medium">
                        Expected Outcome
                      </label>
                      <Input
                        value={solution.expectedOutcome}
                        onChange={(e) => handleSolutionChange(index, 'expectedOutcome', e.target.value)}
                        className="col-span-3"
                        placeholder="What should happen when the steps are followed correctly"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-right font-medium">
                        Time to Resolve
                      </label>
                      <Input
                        value={solution.timeToResolve}
                        onChange={(e) => handleSolutionChange(index, 'timeToResolve', e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., 30 minutes, 1-2 hours"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleAddSolution}
              >
                Add Another Solution
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={isEditMode ? handleUpdateGuide : handleCreateGuide}>
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGuideDetailOpen} onOpenChange={setIsGuideDetailOpen}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedGuide && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedGuide.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{selectedGuide.equipmentType}</Badge>
                    <Badge variant="secondary">{selectedGuide.faultType}</Badge>
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Problem</h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedGuide.problem}</p>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Symptoms</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedGuide.symptoms.map((symptom, index) => (
                      <li key={index} className="text-gray-700 dark:text-gray-300">{symptom}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Solutions</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {selectedGuide.solutions.map((solution, index) => (
                      <AccordionItem key={index} value={`solution-${index}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center">
                            <span className="mr-2">Solution {index + 1}</span>
                            {solution.successRate !== undefined && solution.successRate > 0 && (
                              <div className="flex items-center text-xs">
                                <span className={`px-1.5 py-0.5 rounded ${
                                  solution.successRate > 80 ? 'bg-green-100 text-green-800' :
                                  solution.successRate > 50 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {solution.successRate}% success rate
                                </span>
                              </div>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                            <h4 className="font-medium mb-2">Steps:</h4>
                            <ol className="list-decimal pl-5 space-y-2 mb-4">
                              {solution.steps.map((step, stepIndex) => (
                                <li key={stepIndex} className="text-gray-700 dark:text-gray-300">{step}</li>
                              ))}
                            </ol>
                            
                            {/* Display solution images */}
                            {(() => {
                              console.log(`Rendering solution ${index} images:`, solution.images);
                              return null;
                            })()}
                            {solution.images && solution.images.length > 0 ? (
                              <div className="mb-4">
                                <h4 className="font-medium mb-2">Images ({solution.images.length}):</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {solution.images.map((imageUrl, imgIndex) => {
                                    console.log(`Image ${imgIndex} URL:`, imageUrl);
                                    return (
                                      <a 
                                        key={imgIndex} 
                                        href={imageUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block border rounded p-1"
                                      >
                                        <img 
                                          src={imageUrl} 
                                          alt={`Solution ${index + 1} image ${imgIndex + 1}`}
                                          className="w-full h-32 object-cover rounded"
                                        />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="mb-4 text-gray-500">No images available</div>
                            )}
                            
                            <div className="mb-4">
                              <h4 className="font-medium mb-1">Expected Outcome:</h4>
                              <p className="text-gray-700 dark:text-gray-300">{solution.expectedOutcome}</p>
                            </div>
                            
                            {solution.timeToResolve && (
                              <div className="mb-4">
                                <h4 className="font-medium mb-1">Estimated Time to Resolve:</h4>
                                <p className="text-gray-700 dark:text-gray-300">{solution.timeToResolve}</p>
                              </div>
                            )}
                            
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="font-medium mb-2">Was this solution helpful?</h4>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRateSolution(selectedGuide.id, solution.id, true)}
                                >
                                  <ThumbsUp className="h-4 w-4 mr-1" /> Yes
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRateSolution(selectedGuide.id, solution.id, false)}
                                >
                                  <ThumbsDown className="h-4 w-4 mr-1" /> No
                                </Button>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    Created by {selectedGuide.author}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Last updated {formatDate(selectedGuide.updatedAt)}
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