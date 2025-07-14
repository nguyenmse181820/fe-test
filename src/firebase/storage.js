import { storage } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';

/**
 * Upload file to Firebase Storage and return the download URL
 * @param {File} file - The file to upload
 * @param {string} folder - The folder path in Firebase Storage
 * @returns {Promise<string>} - The download URL of the uploaded file
 */
export const uploadFileToFirebase = async (file, folder = 'refund-proofs') => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Check file type (images only)
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomId}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    // Show upload progress
    toast.info('Uploading file to Firebase...', { autoClose: false, toastId: 'uploading' });
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Close upload toast and show success
    toast.dismiss('uploading');
    toast.success('File uploaded successfully!');
    
    console.log('File uploaded to Firebase:', {
      fileName,
      downloadURL,
      size: file.size,
      type: file.type
    });
    
    return downloadURL;
    
  } catch (error) {
    toast.dismiss('uploading');
    console.error('Error uploading file to Firebase:', error);
    toast.error(`Upload failed: ${error.message}`);
    throw error;
  }
};

/**
 * Validate file before upload
 * @param {File} file - The file to validate
 * @returns {boolean} - Whether the file is valid
 */
export const validateFile = (file) => {
  if (!file) {
    toast.error('No file selected');
    return false;
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    toast.error('File size must be less than 5MB');
    return false;
  }

  // Check file type (images only)
  if (!file.type.startsWith('image/')) {
    toast.error('Only image files are allowed');
    return false;
  }

  return true;
};
