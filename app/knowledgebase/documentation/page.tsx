"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
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
import { Search, Plus, Edit, Trash2, Clock, User, AlertCircle, FileText, Tag, History, Upload, X } from 'lucide-react';
import { documentationService } from '@/lib/supabaseServices';
import { uploadImage } from '@/lib/supabaseImageService';

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
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
      const fetchedDocuments = await documentationService.getAll();
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
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }
    
    setFilteredDocuments(filtered);
  };

  const handleCreateDocument = async () => {
    try {
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const attachmentsArray = attachments ? attachments.split('\n').map(a => a.trim()).filter(a => a) : [];
      
      const newDocument: Omit<Documentation, 'id' | 'createdAt' | 'updatedAt'> = {
        title,
        content,
        category,
        tags: tagsArray,
        version,
        author: 'Current User', // Use actual user info in production
        attachments: attachmentsArray,
        imageUrls: uploadedImages,
      };
      
      await documentationService.create(newDocument);
      
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
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const attachmentsArray = attachments ? attachments.split('\n').map(a => a.trim()).filter(a => a) : [];
      
      const updatedDocument: Partial<Documentation> = {
        title,
        content,
        category,
        tags: tagsArray,
        version,
        attachments: attachmentsArray,
        imageUrls: uploadedImages,
        updatedAt: new Date()
      };
      
      await documentationService.update(currentDocument.id, updatedDocument);
      
      toast({
        title: "Success",
        description: "Documentation updated successfully",
      });
      
      resetForm();
      setIsFormOpen(false);
      setIsEditMode(false);
      setCurrentDocument(null);
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
    try {
      await documentationService.delete(id);
      
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      
      fetchDocuments();
      if (selectedDocument && selectedDocument.id === id) {
        setSelectedDocument(null);
        setIsDocumentDetailOpen(false);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
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
    setUploadedImages(document.imageUrls || []);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleViewDocument = (document: Documentation) => {
    setSelectedDocument(document);
    setIsDocumentDetailOpen(true);
    
    if (document.id) {
      handleViewVersionHistory(document.id);
    }
  };

  const handleViewVersionHistory = async (documentId: string) => {
    try {
      toast({
        title: "Version History",
        description: "Version history functionality is not available in the Supabase implementation yet.",
      });
    } catch (error) {
      console.error('Error fetching version history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch version history.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
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
      
      // Downscale image before upload
      const downscaledImage = await downscaleImage(file);
      
      // Upload the downscaled image
      const uploadResult = await uploadImage(downscaledImage);
      
      // Add the image URL to the uploadedImages array
      setUploadedImages(prev => [...prev, uploadResult]);
      
      // Also insert the image URL into the content for backward compatibility
      const imageMarkdown = `\n![${file.name}](${uploadResult})\n`;
      setContent(prevContent => prevContent + imageMarkdown);
      
      toast({
        title: "Success",
        description: "Image uploaded and inserted",
      });
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

  // Function to downscale an image
  const downscaleImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // Set maximum dimensions
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          // Create canvas and draw downscaled image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert back to file
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            
            // Create new file with same name but downscaled
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            resolve(newFile);
          }, 'image/jpeg', 0.85); // Compression quality
        };
        img.onerror = () => {
          reject(new Error('Error loading image'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
    });
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Equipment Manuals');
    setContent('');
    setTags('');
    setVersion('1.0');
    setAttachments('');
    setUploadedImages([]);
    setCurrentDocument(null);
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
      minute: '2-digit',
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
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <Badge variant="outline">{document.category}</Badge>
                    <div className="flex items-center mt-1">
                      <Badge variant="secondary" className="text-xs">v{document.version}</Badge>
                    </div>
                  </div>
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
          <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
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
            {isEditMode ? (
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
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="version" className="text-right">
                  Version
                </label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-24"
                  />
                  <span className="ml-2 text-sm text-gray-500">
                    (Default: 1.0)
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="content" className="text-right font-medium pt-2">
                Content
              </label>
              <div className="col-span-3 space-y-2">
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Document content in markdown format"
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor="image-upload"
                      className={`flex cursor-pointer items-center rounded-md px-3 py-1 text-sm border border-input 
                                hover:bg-accent hover:text-accent-foreground
                                ${uploadingImage ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      <span>Upload Image</span>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                    {uploadingImage && <span className="text-xs text-muted-foreground">Uploading...</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Images will be optimized automatically. Max size: 5MB
                  </div>
                </div>
                
                {/* Display uploaded images */}
                {uploadedImages.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Uploaded Images:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {uploadedImages.map((imageUrl, index) => (
                        <div key={index} className="relative group border rounded p-1">
                          <img 
                            src={imageUrl} 
                            alt={`Uploaded image ${index + 1}`}
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
                  </div>
                )}
              </div>
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
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <Badge variant="outline">{selectedDocument.category}</Badge>
                      <div className="flex items-center mt-1">
                        <Badge variant="secondary" className="text-xs">v{selectedDocument.version}</Badge>
                      </div>
                    </div>
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
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Content</h3>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {selectedDocument.content}
                      </div>
                    </div>
                    
                    {/* Display document images */}
                    {selectedDocument.imageUrls && selectedDocument.imageUrls.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium mb-2">Images</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedDocument.imageUrls.map((imageUrl, index) => (
                            <a 
                              key={index} 
                              href={imageUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block border rounded p-1 hover:opacity-90 transition-opacity"
                            >
                              <img 
                                src={imageUrl} 
                                alt={`Document image ${index + 1}`}
                                className="w-full h-40 object-cover rounded"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="history" className="pt-4">
                    <div className="text-center py-8">
                      <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Version History Feature</h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        The version history functionality is not available in the current Supabase implementation.
                      </p>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        This feature will allow you to track changes to documentation over time.
                      </p>
                    </div>
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

      {/* Version History Information */}
      <Dialog open={isDocumentDetailOpen && showVersionHistory} onOpenChange={(open) => {
        if (!open) setShowVersionHistory(false);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Information about version history feature
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center">
              <History className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Feature in Development
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                The version history functionality is currently being developed for the Supabase implementation.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                When complete, this feature will allow you to:
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 list-disc list-inside text-left mt-2 space-y-1">
                <li>Track all changes made to documentation</li>
                <li>View previous versions of documents</li>
                <li>Compare changes between versions</li>
                <li>Restore previous versions if needed</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowVersionHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 