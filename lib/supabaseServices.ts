import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { BestPractice, Documentation, TroubleshootingGuide } from '@/app/knowledgebase/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Documentation service
export const documentationService = {
  getAll: async (): Promise<Documentation[]> => {
    const { data, error } = await supabase
      .from('documentation')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching documentation:', error);
      throw error;
    }
    
    return data.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      category: doc.category,
      tags: doc.tags || [],
      imageUrl: doc.image_url,
      imageUrls: doc.image_urls || [],
      author: doc.author,
      createdAt: new Date(doc.created_at),
      updatedAt: new Date(doc.updated_at),
      version: doc.version || '1.0',
      attachments: doc.attachments || [],
      parentId: doc.parent_id,
      isVersionHistory: doc.is_version_history
    }));
  },
  
  getById: async (id: string): Promise<Documentation> => {
    const { data, error } = await supabase
      .from('documentation')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching documentation with ID ${id}:`, error);
      throw error;
    }
    
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      imageUrl: data.image_url,
      imageUrls: data.image_urls || [],
      author: data.author,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      version: data.version || '1.0',
      attachments: data.attachments || [],
      parentId: data.parent_id,
      isVersionHistory: data.is_version_history
    };
  },
  
  create: async (doc: Omit<Documentation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const { data, error } = await supabase
      .from('documentation')
      .insert({
        title: doc.title,
        content: doc.content,
        category: doc.category,
        tags: doc.tags,
        image_url: doc.imageUrl,
        author: doc.author,
        version: doc.version,
        parent_id: doc.parentId,
        is_version_history: doc.isVersionHistory,
        attachments: doc.attachments
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating documentation:', error);
      throw error;
    }
    
    // If we have image URLs, update the document after creation
    if (doc.imageUrls && doc.imageUrls.length > 0) {
      try {
        await supabase
          .from('documentation')
          .update({ image_urls: doc.imageUrls })
          .eq('id', data.id);
      } catch (updateError) {
        console.warn('Could not update image_urls:', updateError);
        // Don't throw here, as the document was created successfully
      }
    }
    
    return data.id;
  },
  
  update: async (id: string, doc: Partial<Documentation>): Promise<void> => {
    const updateData: any = {};
    
    if (doc.title !== undefined) updateData.title = doc.title;
    if (doc.content !== undefined) updateData.content = doc.content;
    if (doc.category !== undefined) updateData.category = doc.category;
    if (doc.tags !== undefined) updateData.tags = doc.tags;
    if (doc.imageUrl !== undefined) updateData.image_url = doc.imageUrl;
    if (doc.imageUrls !== undefined) updateData.image_urls = doc.imageUrls;
    if (doc.version !== undefined) updateData.version = doc.version;
    if (doc.attachments !== undefined) updateData.attachments = doc.attachments;
    if (doc.parentId !== undefined) updateData.parent_id = doc.parentId;
    if (doc.isVersionHistory !== undefined) updateData.is_version_history = doc.isVersionHistory;
    
    const { error } = await supabase
      .from('documentation')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error(`Error updating documentation with ID ${id}:`, error);
      throw error;
    }
  },
  
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('documentation')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting documentation with ID ${id}:`, error);
      throw error;
    }
  }
};

// Troubleshooting guides service
export const troubleshootingService = {
  getAll: async (): Promise<TroubleshootingGuide[]> => {
    const { data, error } = await supabase
      .from('troubleshooting_guides')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching troubleshooting guides:', error);
      throw error;
    }
    
    console.log('Raw data from Supabase:', data);
    
    return data.map(guide => ({
      id: guide.id,
      title: guide.title,
      problem: guide.problem,
      symptoms: guide.symptoms || [],
      equipmentType: guide.equipment_type,
      faultType: guide.fault_type,
      solutions: (guide.solutions || []).map((sol: any) => {
        console.log('Solution from Supabase:', sol);
        return {
          id: sol.id || '',
          steps: sol.steps || [],
          expectedOutcome: sol.expected_outcome || '',
          successRate: sol.success_rate || 0,
          timeToResolve: sol.time_to_resolve || '',
          images: sol.images || []
        };
      }),
      author: guide.author,
      rating: guide.rating || 0,
      ratingCount: guide.rating_count || 0,
      createdAt: new Date(guide.created_at),
      updatedAt: new Date(guide.updated_at),
    }));
  },
  
  getById: async (id: string): Promise<TroubleshootingGuide> => {
    const { data, error } = await supabase
      .from('troubleshooting_guides')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching troubleshooting guide with ID ${id}:`, error);
      throw error;
    }
    
    return {
      id: data.id,
      title: data.title,
      problem: data.problem,
      symptoms: data.symptoms || [],
      equipmentType: data.equipment_type,
      faultType: data.fault_type,
      solutions: (data.solutions || []).map((sol: any) => ({
        id: sol.id || '',
        steps: sol.steps || [],
        expectedOutcome: sol.expected_outcome || '',
        successRate: sol.success_rate || 0,
        timeToResolve: sol.time_to_resolve || '',
        images: sol.images || []
      })),
      author: data.author,
      rating: data.rating || 0,
      ratingCount: data.rating_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  },
  
  create: async (guide: Omit<TroubleshootingGuide, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const { data, error } = await supabase
      .from('troubleshooting_guides')
      .insert({
        title: guide.title,
        problem: guide.problem,
        symptoms: guide.symptoms,
        equipment_type: guide.equipmentType,
        fault_type: guide.faultType,
        solutions: guide.solutions,
        author: guide.author,
        rating: guide.rating || 0,
        rating_count: guide.ratingCount || 0,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating troubleshooting guide:', error);
      throw error;
    }
    
    return data.id;
  },
  
  update: async (id: string, guide: Partial<TroubleshootingGuide>): Promise<void> => {
    const updateData: any = {};
    
    if (guide.title !== undefined) updateData.title = guide.title;
    if (guide.problem !== undefined) updateData.problem = guide.problem;
    if (guide.symptoms !== undefined) updateData.symptoms = guide.symptoms;
    if (guide.equipmentType !== undefined) updateData.equipment_type = guide.equipmentType;
    if (guide.faultType !== undefined) updateData.fault_type = guide.faultType;
    if (guide.solutions !== undefined) {
      updateData.solutions = guide.solutions.map((sol) => ({
        id: sol.id,
        steps: sol.steps,
        expected_outcome: sol.expectedOutcome,
        success_rate: sol.successRate,
        time_to_resolve: sol.timeToResolve,
        images: sol.images || []
      }));
    }
    if (guide.rating !== undefined) updateData.rating = guide.rating;
    if (guide.ratingCount !== undefined) updateData.rating_count = guide.ratingCount;
    
    const { error } = await supabase
      .from('troubleshooting_guides')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error(`Error updating troubleshooting guide with ID ${id}:`, error);
      throw error;
    }
  },
  
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('troubleshooting_guides')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting troubleshooting guide with ID ${id}:`, error);
      throw error;
    }
  }
};

// Best practices service
export const bestPracticesService = {
  getAll: async (): Promise<BestPractice[]> => {
    const { data, error } = await supabase
      .from('best_practices')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching best practices:', error);
      throw error;
    }
    
    return data.map(practice => ({
      id: practice.id,
      title: practice.title,
      category: practice.category,
      description: practice.description,
      recommendations: practice.recommendations || [],
      benefitsAndOutcomes: practice.benefits_and_outcomes || [],
      author: practice.author,
      likes: practice.likes || 0,
      dislikes: practice.dislikes || 0,
      imageUrls: practice.image_urls || [],
      createdAt: new Date(practice.created_at),
      updatedAt: new Date(practice.updated_at),
    }));
  },
  
  getById: async (id: string): Promise<BestPractice> => {
    const { data, error } = await supabase
      .from('best_practices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching best practice with ID ${id}:`, error);
      throw error;
    }
    
    return {
      id: data.id,
      title: data.title,
      category: data.category,
      description: data.description,
      recommendations: data.recommendations || [],
      benefitsAndOutcomes: data.benefits_and_outcomes || [],
      author: data.author,
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
      imageUrls: data.image_urls || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  },
  
  create: async (practice: Omit<BestPractice, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const { data, error } = await supabase
      .from('best_practices')
      .insert({
        title: practice.title,
        category: practice.category,
        description: practice.description,
        recommendations: practice.recommendations,
        benefits_and_outcomes: practice.benefitsAndOutcomes,
        author: practice.author,
        likes: practice.likes || 0,
        dislikes: practice.dislikes || 0
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating best practice:', error);
      throw error;
    }
    
    // If we have image URLs, update the practice after creation
    if (practice.imageUrls && practice.imageUrls.length > 0) {
      try {
        await supabase
          .from('best_practices')
          .update({ image_urls: practice.imageUrls })
          .eq('id', data.id);
      } catch (updateError) {
        console.warn('Could not update image_urls:', updateError);
        // Don't throw here, as the practice was created successfully
      }
    }
    
    return data.id;
  },
  
  update: async (id: string, practice: Partial<BestPractice>): Promise<void> => {
    const updateData: any = {};
    
    if (practice.title !== undefined) updateData.title = practice.title;
    if (practice.category !== undefined) updateData.category = practice.category;
    if (practice.description !== undefined) updateData.description = practice.description;
    if (practice.recommendations !== undefined) updateData.recommendations = practice.recommendations;
    if (practice.benefitsAndOutcomes !== undefined) updateData.benefits_and_outcomes = practice.benefitsAndOutcomes;
    if (practice.likes !== undefined) updateData.likes = practice.likes;
    if (practice.dislikes !== undefined) updateData.dislikes = practice.dislikes;
    if (practice.imageUrls !== undefined) updateData.image_urls = practice.imageUrls;
    
    const { error } = await supabase
      .from('best_practices')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error(`Error updating best practice with ID ${id}:`, error);
      throw error;
    }
  },
  
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('best_practices')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting best practice with ID ${id}:`, error);
      throw error;
    }
  }
};

// Image upload service for documentation
export const uploadImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `knowledgebase/${fileName}`;

  const { error } = await supabase.storage
    .from('images')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }

  const { data } = supabase.storage.from('images').getPublicUrl(filePath);
  return data.publicUrl;
};

// Export the supabase client for direct access if needed
export { supabase }; 