// Types for the Supabase implementation
// These mirror the Firebase types but are adapted for Supabase

export interface SupabaseDocumentation {
  id?: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  created_at?: string; // Supabase uses snake_case by default
  updated_at?: string;
  version: string;
  attachments?: string[];
  parent_id?: string;
  is_version_history?: boolean;
  image_url?: string;
  image_urls?: string[]; // Array of image URLs
}

export interface SupabaseTroubleshootingGuide {
  id?: string;
  title: string;
  problem: string;
  symptoms: string[];
  solutions: SupabaseTroubleshootingSolution[];
  equipment_type: string;
  fault_type: string;
  author: string;
  created_at?: string;
  updated_at?: string;
  rating?: number;
  rating_count?: number;
}

export interface SupabaseTroubleshootingSolution {
  id?: string;
  steps: string[];
  expected_outcome: string;
  success_rate?: number;
  time_to_resolve?: string;
  images?: string[]; // Array of image URLs
}

export interface SupabaseBestPractice {
  id?: string;
  title: string;
  category: string;
  content: string;
  examples: string[];
  author: string;
  created_at?: string;
  updated_at?: string;
  rating?: number;
  rating_count?: number;
  image_urls?: string[]; // Array of image URLs
}

// Image upload related types
export interface ImageUploadResult {
  url: string;
  path: string;
  size: number;
}

// Mapping functions to convert between Supabase and Firebase types
export function mapToFirebaseDocumentation(doc: SupabaseDocumentation) {
  return {
    id: doc.id || '',
    title: doc.title,
    content: doc.content,
    category: doc.category,
    tags: doc.tags,
    author: doc.author,
    createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
    updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date(),
    version: doc.version,
    attachments: doc.attachments || [],
    parentId: doc.parent_id,
    isVersionHistory: doc.is_version_history,
    imageUrl: doc.image_url,
    imageUrls: doc.image_urls || []
  };
}

export function mapToSupabaseDocumentation(doc: any) {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    category: doc.category,
    tags: doc.tags,
    author: doc.author,
    created_at: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updated_at: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    version: doc.version,
    attachments: doc.attachments,
    parent_id: doc.parentId,
    is_version_history: doc.isVersionHistory,
    image_url: doc.imageUrl,
    image_urls: doc.imageUrls || []
  };
}

export function mapToFirebaseTroubleshootingGuide(guide: SupabaseTroubleshootingGuide) {
  return {
    id: guide.id || '',
    title: guide.title,
    problem: guide.problem,
    symptoms: guide.symptoms,
    solutions: guide.solutions.map(sol => ({
      id: sol.id || '',
      steps: sol.steps,
      expectedOutcome: sol.expected_outcome,
      successRate: sol.success_rate,
      timeToResolve: sol.time_to_resolve,
      images: sol.images || []
    })),
    equipmentType: guide.equipment_type,
    faultType: guide.fault_type,
    author: guide.author,
    createdAt: guide.created_at ? new Date(guide.created_at) : new Date(),
    updatedAt: guide.updated_at ? new Date(guide.updated_at) : new Date(),
    rating: guide.rating,
    ratingCount: guide.rating_count
  };
}

export function mapToSupabaseTroubleshootingGuide(guide: any) {
  return {
    id: guide.id,
    title: guide.title,
    problem: guide.problem,
    symptoms: guide.symptoms,
    solutions: guide.solutions.map((sol: any) => ({
      id: sol.id,
      steps: sol.steps,
      expected_outcome: sol.expectedOutcome,
      success_rate: sol.successRate,
      time_to_resolve: sol.timeToResolve,
      images: sol.images || []
    })),
    equipment_type: guide.equipmentType,
    fault_type: guide.faultType,
    author: guide.author,
    created_at: guide.createdAt instanceof Date ? guide.createdAt.toISOString() : guide.createdAt,
    updated_at: guide.updatedAt instanceof Date ? guide.updatedAt.toISOString() : guide.updatedAt,
    rating: guide.rating,
    rating_count: guide.ratingCount
  };
}

export function mapToFirebaseBestPractice(practice: SupabaseBestPractice) {
  return {
    id: practice.id || '',
    title: practice.title,
    category: practice.category,
    content: practice.content,
    examples: practice.examples,
    author: practice.author,
    createdAt: practice.created_at ? new Date(practice.created_at) : new Date(),
    updatedAt: practice.updated_at ? new Date(practice.updated_at) : new Date(),
    rating: practice.rating,
    ratingCount: practice.rating_count,
    imageUrls: practice.image_urls || []
  };
}

export function mapToSupabaseBestPractice(practice: any) {
  return {
    id: practice.id,
    title: practice.title,
    category: practice.category,
    content: practice.content,
    examples: practice.examples,
    author: practice.author,
    created_at: practice.createdAt instanceof Date ? practice.createdAt.toISOString() : practice.createdAt,
    updated_at: practice.updatedAt instanceof Date ? practice.updatedAt.toISOString() : practice.updatedAt,
    rating: practice.rating,
    rating_count: practice.ratingCount,
    image_urls: practice.imageUrls || []
  };
} 