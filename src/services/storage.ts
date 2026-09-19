import { supabase } from '../lib/supabase';
import { convertImageToWebP } from '../lib/imageOptimization';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

export class StorageService {
  /**
   * Upload an image to Supabase Storage with automatic WebP conversion and optimization
   */
  public static async uploadImage(
    file: File,
    bucket: 'product-images' | 'avatars' | 'banners' | 'thumbnails' = 'product-images',
    folder: string = 'public'
  ): Promise<UploadResult> {
    try {
      // Validate MIME type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/jpg'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|avif|gif)$/i)) {
        return {
          url: null,
          error: 'Format d’image non supporté. Utilisez JPG, PNG, WEBP ou AVIF.',
        };
      }

      // Max size: 10MB
      if (file.size > 10 * 1024 * 1024) {
        return {
          url: null,
          error: 'Le fichier d’origine dépasse la taille maximale autorisée (10 Mo).',
        };
      }

      // Convert and compress to WebP on client before uploading to save storage & bandwidth
      let uploadFile: File = file;
      try {
        uploadFile = await convertImageToWebP(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
        });
      } catch (optErr) {
        console.warn('[StorageService] WebP conversion fallback to original file:', optErr);
      }

      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;

      const { data, error } = await supabase.storage.from(bucket).upload(fileName, uploadFile, {
        cacheControl: '31536000',
        upsert: false,
        contentType: 'image/webp',
      });

      if (error) {
        console.warn(`[StorageService] Upload to bucket ${bucket} returned:`, error);
        return {
          url: null,
          error: `Erreur d'upload (${error.message}). Vérifiez que le bucket "${bucket}" existe dans Supabase Storage.`,
        };
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return {
        url: publicUrlData.publicUrl,
        error: null,
      };
    } catch (err: any) {
      return {
        url: null,
        error: err.message || 'Erreur inattendue lors du téléversement.',
      };
    }
  }
}
