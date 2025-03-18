"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
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
import { Search, Plus, Edit, Trash2, Star, Clock, User, AlertCircle, CheckCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

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
  
  // Form state
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [faultType, setFaultType] = useState('');
  const [solutions, setSolutions] = useState<TroubleshootingSolution[]>([
    { id: '1', steps: [''], expectedOutcome: '', successRate: 0, timeToResolve: '' }
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
      const q = query(collection(db, 'troubleshooting'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedGuides: TroubleshootingGuide[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<TroubleshootingGuide, 'id'>;
        const guide: TroubleshootingGuide = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        
        fetchedGuides.push(guide);
      });
      
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
    if (!searchQuery) {
      setFilteredGuides(guides);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = guides.filter(guide => 
      guide.title.toLowerCase().includes(query) || 
      guide.problem.toLowerCase().includes(query) || 
      guide.symptoms.some(symptom => symptom.toLowerCase().includes(query)) ||
      guide.equipmentType.toLowerCase().includes(query) ||
      guide.faultType.toLowerCase().includes(query)
    );
    
    setFilteredGuides(filtered);
  };

  const handleCreateGuide = async () => {
    try {
      const symptomsArray = symptoms.split('\n').map(s => s.trim()).filter(s => s);
      
      const newGuide = {
        title,
        problem,
        symptoms: symptomsArray,
        solutions,
        equipmentType,
        faultType,
        author: JSON.parse(localStorage.getItem('auth') || '{}').username || 'Unknown',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rating: 0,
        ratingCount: 0
      };
      
      await addDoc(collection(db, 'troubleshooting'), newGuide);
      
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
      
      const updatedGuide = {
        title,
        problem,
        symptoms: symptomsArray,
        solutions,
        equipmentType,
        faultType,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(db, 'troubleshooting', currentGuide.id), updatedGuide);
      
      toast({
        title: "Success",
        description: "Troubleshooting guide updated successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      setIsEditMode(false);
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
    if (confirm('Are you sure you want to delete this troubleshooting guide?')) {
      try {
        await deleteDoc(doc(db, 'troubleshooting', id));
        
        toast({
          title: "Success",
          description: "Troubleshooting guide deleted successfully",
        });
        
        fetchGuides();
      } catch (error) {
        console.error('Error deleting guide:', error);
        toast({
          title: "Error",
          description: "Failed to delete troubleshooting guide",
          variant: "destructive",
        });
      }
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
    setSelectedGuide(guide);
    setIsGuideDetailOpen(true);
  };

  const handleAddSolution = () => {
    setSolutions([
      ...solutions,
      { 
        id: `${solutions.length + 1}`, 
        steps: [''], 
        expectedOutcome: '', 
        successRate: 0, 
        timeToResolve: '' 
      }
    ]);
  };

  const handleRemoveSolution = (index: number) => {
    const updatedSolutions = [...solutions];
    updatedSolutions.splice(index, 1);
    setSolutions(updatedSolutions);
  };

  const handleSolutionChange = (index: number, field: keyof TroubleshootingSolution, value: any) => {
    const updatedSolutions = [...solutions];
    
    if (field === 'steps') {
      updatedSolutions[index].steps = value.split('\n').map((s: string) => s.trim()).filter((s: string) => s);
    } else {
      updatedSolutions[index][field] = value;
    }
    
    setSolutions(updatedSolutions);
  };

  const handleRateSolution = async (guideId: string, solutionId: string, isHelpful: boolean) => {
    try {
      const guideRef = doc(db, 'troubleshooting', guideId);
      const guide = guides.find(g => g.id === guideId);
      
      if (!guide) return;
      
      const updatedSolutions = guide.solutions.map(solution => {
        if (solution.id === solutionId) {
          const currentRate = solution.successRate || 0;
          const currentCount = guide.ratingCount || 0;
          
          // Simple weighted average calculation
          const newRate = isHelpful 
            ? Math.min(100, currentRate + (100 - currentRate) / (currentCount + 1))
            : Math.max(0, currentRate - currentRate / (currentCount + 1));
          
          return {
            ...solution,
            successRate: parseFloat(newRate.toFixed(1))
          };
        }
        return solution;
      });
      
      await updateDoc(guideRef, {
        solutions: updatedSolutions,
        ratingCount: (guide.ratingCount || 0) + 1
      });
      
      toast({
        title: "Thank you!",
        description: "Your feedback helps improve our troubleshooting guides",
      });
      
      fetchGuides();
    } catch (error) {
      console.error('Error rating solution:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating",
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
    setSolutions([{ id: '1', steps: [''], expectedOutcome: '', successRate: 0, timeToResolve: '' }]);
    setCurrentGuide(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
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

      {/* Create/Edit Guide Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Troubleshooting Guide' : 'Create New Troubleshooting Guide'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update the troubleshooting guide details below' 
                : 'Fill in the details to create a new troubleshooting guide'}
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
                placeholder="e.g., Resolving Fiber Link Failures"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="equipmentType" className="text-right">
                Equipment Type
              </label>
              <Input
                id="equipmentType"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Router, Switch, OLT"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="faultType" className="text-right">
                Fault Type
              </label>
              <Input
                id="faultType"
                value={faultType}
                onChange={(e) => setFaultType(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Fiber Break, Power Outage"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="problem" className="text-right pt-2">
                Problem Description
              </label>
              <Textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="col-span-3"
                rows={3}
                placeholder="Describe the problem in detail"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="symptoms" className="text-right pt-2">
                Symptoms
              </label>
              <Textarea
                id="symptoms"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="col-span-3"
                rows={4}
                placeholder="List symptoms, one per line"
              />
            </div>
            
            <div className="col-span-4">
              <h3 className="font-medium text-lg mb-2">Solutions</h3>
              {solutions.map((solution, index) => (
                <div key={index} className="border rounded-md p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Solution {index + 1}</h4>
                    {solutions.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveSolution(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label className="text-right pt-2 text-sm">
                        Steps
                      </label>
                      <Textarea
                        value={solution.steps.join('\n')}
                        onChange={(e) => handleSolutionChange(index, 'steps', e.target.value)}
                        className="col-span-3"
                        rows={4}
                        placeholder="List steps, one per line"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-right text-sm">
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
                      <label className="text-right text-sm">
                        Time to Resolve
                      </label>
                      <Input
                        value={solution.timeToResolve}
                        onChange={(e) => handleSolutionChange(index, 'timeToResolve', e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., 30 minutes, 1-2 hours"
                      />
                    </div>
                    
                    {isEditMode && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm">
                          Success Rate
                        </label>
                        <div className="col-span-3 flex items-center">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={solution.successRate || 0}
                            onChange={(e) => handleSolutionChange(index, 'successRate', parseFloat(e.target.value))}
                            className="w-24"
                          />
                          <span className="ml-2">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <Button variant="outline" onClick={handleAddSolution} className="w-full">
                Add Another Solution
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={isEditMode ? handleUpdateGuide : handleCreateGuide}>
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guide Detail Dialog */}
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
                    Last updated {selectedGuide.updatedAt.toLocaleDateString()}
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