import { supabase } from './supabase';

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - The bucket name ('profile-photos' or 'event-banners')
 * @param {string} userId - User ID or event ID for unique file naming
 * @returns {Promise<{url: string, error: string|null}>}
 */
export async function uploadFile(file, bucket, userId) {
  if (!file) return { url: null, error: 'No file selected' };

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: 'Only image files are allowed (JPG, PNG, WebP, GIF)' };
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: 'File size must be less than 5MB' };
  }

  try {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const filename = `${userId}-${timestamp}-${random}${getFileExtension(file.name)}`;

    // Upload file
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error.message };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} url - The public URL of the file
 * @param {string} bucket - The bucket name
 * @returns {Promise<{error: string|null}>}
 */
export async function deleteFile(url, bucket) {
  if (!url) return { error: 'No URL provided' };

  try {
    // Extract filename from URL
    const filename = url.split('/').pop();

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filename]);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get file extension
 */
function getFileExtension(filename) {
  return filename.substring(filename.lastIndexOf('.'));
}
