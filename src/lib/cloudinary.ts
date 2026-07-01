// Cloudinary Client Direct Unsigned Uploads Helper
import { getOptionalEnvVar } from './typeGuards';

export const isCloudinaryConfigured = (): boolean => {
  const cloudName = getOptionalEnvVar('VITE_CLOUDINARY_CLOUD_NAME');
  const uploadPreset = getOptionalEnvVar('VITE_CLOUDINARY_UPLOAD_PRESET');
  return !!(cloudName && uploadPreset && cloudName.indexOf('placeholder') === -1);
};

export async function uploadToCloudinary(base64OrBlob: string): Promise<string> {
  const cloudName = getOptionalEnvVar('VITE_CLOUDINARY_CLOUD_NAME');
  const uploadPreset = getOptionalEnvVar('VITE_CLOUDINARY_UPLOAD_PRESET');

  if (!isCloudinaryConfigured()) {
    console.warn('Cloudinary is not configured. Keeping file in local state mode.');
    return base64OrBlob; // fallback to original dataUrl/base64 so application keeps functioning
  }

  try {
    const formData = new FormData();
    formData.append('file', base64OrBlob);
    formData.append('upload_preset', uploadPreset);

    console.log('📤 Sending to Cloudinary:', { cloudName, uploadPreset: uploadPreset?.substring(0, 5) + '***' });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Cloudinary upload failed: ${errorMsg}`);
    }

    const data = await response.json();
    const returnUrl = data.secure_url || data.url;
    console.log('✅ Cloudinary returned URL:', returnUrl);
    return returnUrl;
  } catch (error) {
    console.error('❌ Error uploading file to Cloudinary:', error);
    throw error;
  }
}
