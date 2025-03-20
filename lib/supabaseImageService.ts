import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseServices';
import { ImageUploadResult } from '@/app/knowledgebase/supabase-types';

/**
 * Compresses an image file before uploading
 * @param file The image file to compress
 * @param maxWidth Maximum width of the compressed image
 * @param maxHeight Maximum height of the compressed image
 * @param quality Compression quality (0-1)
 * @returns A promise that resolves to a compressed Blob
 */
async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      let width = img.width;
      let height = img.height;
      
      // Calculate the new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      // Create a canvas element to draw the resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert the canvas to a Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
  });
}

/**
 * Uploads an image to Supabase Storage and returns the public URL
 * 
 * @param file - The file to upload
 * @returns Promise with the public URL of the uploaded image
 */
export const uploadImage = async (file: File): Promise<string> => {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `knowledgebase/${fileName}`;

    // Upload the file to the 'images' bucket
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get the public URL for the uploaded file
    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
};

/**
 * Deletes an image from Supabase Storage
 * 
 * @param url - The public URL of the image to delete
 * @returns Promise<void>
 */
export const deleteImage = async (url: string): Promise<void> => {
  try {
    // Extract the file path from the URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketName = pathParts[1];
    const filePath = pathParts.slice(2).join('/');

    // Delete the file from storage
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteImage:', error);
    throw error;
  }
}; 