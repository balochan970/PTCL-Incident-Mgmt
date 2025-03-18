"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import NavBar from '@/app/components/NavBar';
import { Documentation } from '../types';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2, Clock, User, AlertCircle, FileText, Tag, History } from 'lucide-react';

// Define categories for documentation
const CATEGORIES = [
  "Equipment Manuals",
  "Network Protocols",
  "System Configurations",
  "Policies & Procedures",
  "Training Materials",
  "Reference Guides",
  "All"
];

export default function DocumentationPage() {
  const [documents, setDocuments] = useState<Documentation[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Documentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<Documentation | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Documentation | null>(null);
  const [isDocumentDetailOpen, setIsDocumentDetailOpen] = useState(false);
  const [versionHistory, setVersionHistory] = useState<Documentation[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Equipment Manuals');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [version, setVersion] = useState('1.0');
  const [attachments, setAttachments] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, selectedCategory, documents]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'documentation'), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedDocuments: Documentation[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Documentation, 'id'>;
        const document: Documentation = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        
        fetchedDocuments.push(document);
      });
      
      setDocuments(fetchedDocuments);
      setFilteredDocuments(fetchedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documentation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(document => 
        document.title.toLowerCase().includes(query) || 
        document.content.toLowerCase().includes(query) || 
        document.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(document => document.category === selectedCategory);
    }
    
    setFilteredDocuments(filtered);
  };

  const handleCreateDocument = async () => {
    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      const attachmentsArray = attachments ? attachments.split('\n').map(a => a.trim()).filter(a => a) : [];
      
      const newDocument = {
        title,
        content,
        category,
        tags: tagsArray,
        author: JSON.parse(localStorage.getItem('auth') || '{}').username || 'Unknown',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version,
        attachments: attachmentsArray
      };
      
      await addDoc(collection(db, 'documentation'), newDocument);
      
      toast({
        title: "Success",
        description: "Documentation created successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: "Failed to create documentation",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDocument = async () => {
    if (!currentDocument) return;
    
    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      const attachmentsArray = attachments ? attachments.split('\n').map(a => a.trim()).filter(a => a) : [];
      
      // Create a version history record
      const versionHistoryRecord = {
        ...currentDocument,
        parentId: currentDocument.id,
        isVersionHistory: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Remove the id to avoid conflicts
      delete versionHistoryRecord.id;
      
      // Save the current version to history
      await addDoc(collection(db, 'documentationHistory'), versionHistoryRecord);
      
      // Increment version number
      const versionParts = version.split('.');
      const minorVersion = parseInt(versionParts[1] || '0') + 1;
      const newVersion = `${versionParts[0]}.${minorVersion}`;
      
      const updatedDocument = {
        title,
        content,
        category,
        tags: tagsArray,
        updatedAt: serverTimestamp(),
        version: newVersion,
        attachments: attachmentsArray
      };
      
      await updateDoc(doc(db, 'documentation', currentDocument.id), updatedDocument);
      
      toast({
        title: "Success",
        description: "Documentation updated successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      setIsEditMode(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "Failed to update documentation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (confirm('Are you sure you want to delete this documentation?')) {
      try {
        await deleteDoc(doc(db, 'documentation', id));
        
        toast({
          title: "Success",
          description: "Documentation deleted successfully",
        });
        
        fetchDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
        toast({
          title: "Error",
          description: "Failed to delete documentation",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditDocument = (document: Documentation) => {
    setCurrentDocument(document);
    setTitle(document.title);
    setCategory(document.category);
    setContent(document.content);
    setTags(document.tags.join(', '));
    setVersion(document.version);
    setAttachments(document.attachments ? document.attachments.join('\n') : '');
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleViewDocument = (document: Documentation) => {
    setSelectedDocument(document);
    setIsDocumentDetailOpen(true);
    fetchVersionHistory(document.id);
  };

  const fetchVersionHistory = async (documentId: string) => {
    try {
      const q = query(
        collection(db, 'documentationHistory'), 
        // where('parentId', '==', documentId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const history: Documentation[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Documentation;
        if (data.parentId === documentId) {
          history.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
        }
      });
      
      setVersionHistory(history);
    } catch (error) {
      console.error('Error fetching version history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch version history",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Equipment Manuals');
    setContent('');
    setTags('');
    setVersion('1.0');
    setAttachments('');
    setCurrentDocument(null);
  };

  const formatDate = (date: Date) => {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Documentation</h1>
          <Button onClick={() => { resetForm(); setIsFormOpen(true); setIsEditMode(false); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Documentation
          </Button>
        </div>

        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documentation by title, content, or tags..."
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
                {CATEGORIES.slice(0, 6).map(category => (
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
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No documentation found</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || selectedCategory !== 'All'
                ? "Try adjusting your search criteria or category filter" 
                : "Get started by adding new documentation"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <Card key={document.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{document.title}</CardTitle>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditDocument(document)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(document.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="flex flex-col gap-1">
                    <Badge variant="outline">{document.category}</Badge>
                    <div className="flex items-center mt-1">
                      <Badge variant="secondary" className="text-xs">v{document.version}</Badge>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                    {document.content}
                  </p>
                  {document.tags && document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {document.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2 border-t flex justify-between items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {document.author}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleViewDocument(document)}>
                    <FileText className="h-3 w-3 mr-1" /> View
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Document Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Documentation' : 'Create New Documentation'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update the documentation details below' 
                : 'Fill in the details to create new documentation'}
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
                placeholder="e.g., Router Configuration Guide"
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
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="tags" className="text-right">
                Tags
              </label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="col-span-3"
                placeholder="e.g., router, configuration, network (comma separated)"
              />
            </div>
            {isEditMode && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="version" className="text-right">
                  Version
                </label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="version"
                    value={version}
                    disabled
                    className="w-24 bg-gray-100"
                  />
                  <span className="ml-2 text-sm text-gray-500">
                    (Will be incremented automatically)
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="content" className="text-right pt-2">
                Content
              </label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="col-span-3"
                rows={12}
                placeholder="Enter the documentation content..."
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="attachments" className="text-right pt-2">
                Attachments
              </label>
              <Textarea
                id="attachments"
                value={attachments}
                onChange={(e) => setAttachments(e.target.value)}
                className="col-span-3"
                rows={3}
                placeholder="Enter URLs to attachments, one per line"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={isEditMode ? handleUpdateDocument : handleCreateDocument}>
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Detail Dialog */}
      <Dialog open={isDocumentDetailOpen} onOpenChange={setIsDocumentDetailOpen}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedDocument && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle>{selectedDocument.title}</DialogTitle>
                  <Badge variant="secondary">v{selectedDocument.version}</Badge>
                </div>
                <DialogDescription>
                  <div className="flex flex-col gap-2 mt-2">
                    <Badge variant="outline">{selectedDocument.category}</Badge>
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="h-3 w-3 mr-1" />
                      {selectedDocument.author} | 
                      <Clock className="h-3 w-3 mx-1" />
                      Last updated {formatDate(selectedDocument.updatedAt)}
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                <Tabs defaultValue="content">
                  <TabsList>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="history" onClick={() => setShowVersionHistory(true)}>
                      Version History
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="content" className="pt-4">
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="whitespace-pre-line">
                        {selectedDocument.content}
                      </div>
                      
                      {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-6 pt-4 border-t">
                          <span className="text-sm font-medium mr-2">Tags:</span>
                          {selectedDocument.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {selectedDocument.attachments && selectedDocument.attachments.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                          <h3 className="text-lg font-medium mb-2">Attachments</h3>
                          <ul className="space-y-2">
                            {selectedDocument.attachments.map((attachment, index) => (
                              <li key={index}>
                                <a 
                                  href={attachment} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center"
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  {attachment.split('/').pop() || attachment}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="pt-4">
                    {versionHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No version history</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          This document has not been updated yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {versionHistory.map((version, index) => (
                          <Card key={index}>
                            <CardHeader className="py-3">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base">Version {version.version}</CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {formatDate(version.updatedAt)}
                                </Badge>
                              </div>
                              <CardDescription className="text-xs">
                                Updated by {version.author}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="py-2">
                              <div className="text-sm line-clamp-3">
                                {version.content}
                              </div>
                            </CardContent>
                            <CardFooter className="py-2">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setSelectedDocument(version);
                                setShowVersionHistory(false);
                              }}>
                                View this version
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => handleEditDocument(selectedDocument)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 