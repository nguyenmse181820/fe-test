import React, { useState } from 'react';
import { uploadFileToFirebase, validateFile } from '../firebase/storage';
import { toast } from 'react-toastify';

const FirebaseUploadTest = () => {
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !validateFile(file)) return;

    try {
      setUploading(true);
      const url = await uploadFileToFirebase(file, 'test-uploads');
      setFileUrl(url);
      console.log('Upload successful:', url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Firebase Upload Test</h3>
      
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      {uploading && (
        <p className="mt-2 text-blue-600">Uploading to Firebase...</p>
      )}
      
      {fileUrl && (
        <div className="mt-4">
          <p className="text-green-600 mb-2">Upload successful!</p>
          <img src={fileUrl} alt="Uploaded" className="max-w-full h-auto rounded" />
          <p className="text-xs text-gray-500 mt-2 break-all">{fileUrl}</p>
        </div>
      )}
    </div>
  );
};

export default FirebaseUploadTest;
