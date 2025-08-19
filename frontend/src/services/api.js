import axios from 'axios';
import { auth } from '../config/firebase';

// Global flag to prevent duplicate requests
let isRequestInProgress = false;

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 300000, // Increased to 300000 (5 minutes) to handle comprehensive market price searches
});

// Helper function to get Firebase ID token
const getAuthToken = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return `Bearer ${token}`;
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Request interceptor for logging
api.interceptors.request.use(
  async (config) => {
    console.log('🔍 API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Return the full response, not just response.data
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The server is taking too long to respond. Please try again.');
    }
    
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        console.error('Authentication failed - user may need to re-login');
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(error.response.data?.error || error.response.data?.detail || `Server error: ${error.response.status}`);
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error details:', {
        message: error.message,
        code: error.code,
        config: error.config
      });
      throw new Error('Network error: Cannot reach the server. Please check your internet connection and try again.');
    } else {
      // Something else happened
      throw new Error(`Request failed: ${error.message}`);
    }
  }
);

// Health check endpoint
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Health check failed');
  }
};

// Text query endpoint - Fixed to match backend
export const sendTextQuery = async (query, language = 'en', location = null, crop_type = null) => {
  // Prevent duplicate requests
  if (isRequestInProgress) {
    console.log('⚠️ Request already in progress, skipping duplicate');
    return { success: false, error: 'Request already in progress' };
  }

  isRequestInProgress = true;
  
  const maxRetries = 2;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Attempt ${attempt}/${maxRetries} to send text query...`);
      console.log('🔍 Query data:', { query, language, location, crop_type });
      
      const formData = new FormData();
      formData.append('query', query);
      formData.append('language', language);
      if (location) formData.append('location', location);
      if (crop_type) formData.append('crop_type', crop_type);

      // Create auth header from Firebase
      let authHeader = await getAuthToken();
      if (authHeader) {
        console.log('✅ Using Firebase ID token for auth');
      } else {
        console.log('⚠️ No Firebase user authenticated');
        throw new Error('User not authenticated. Please sign in first.');
      }

      console.log('🔍 Sending request to /query/text with headers:', {
        'Content-Type': 'multipart/form-data',
        'Authorization': authHeader
      });

      const response = await api.post('/query/text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': authHeader
        },
      });
      
      console.log(`✅ Text query successful on attempt ${attempt}`);
      console.log('🔍 Full response:', response);
      console.log('🔍 Response data:', response.data);
      
      // Return the response data, not the full response object
      isRequestInProgress = false;
      return response.data;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      console.error('❌ Full error:', error);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  isRequestInProgress = false;
  throw new Error(`Text query failed after ${maxRetries} attempts: ${lastError.message}`);
};

// Image query endpoint - Fixed to match backend
export const sendImageQuery = async (file, query = '', language = 'en') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('query', query);
    formData.append('language', language);

    // Create auth header from Firebase
    let authHeader = await getAuthToken();
    if (authHeader) {
      console.log('✅ Using Firebase ID token for auth in image query');
    } else {
      console.log('⚠️ No Firebase user authenticated for image query');
      throw new Error('User not authenticated. Please sign in first.');
    }

    console.log('🔍 Image query data:', { file: file.name, query, language });

    const response = await api.post('/query/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': authHeader
      },
    });
    
    console.log('🔍 Image query response:', response);
    return response.data;
  } catch (error) {
    throw new Error(`Image query failed: ${error.message}`);
  }
};

// Voice query endpoint - Fixed to match backend
export const sendVoiceQuery = async (audioBlob, transcription = '', language = 'en') => {
  try {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'voice_query.wav');
    formData.append('language', language);
    formData.append('transcription', transcription);

    // Create auth header from Firebase
    let authHeader = await getAuthToken();
    if (authHeader) {
      console.log('✅ Using Firebase ID token for auth in voice query');
    } else {
      console.log('⚠️ No Firebase user authenticated for voice query');
      throw new Error('User not authenticated. Please sign in first.');
    }

    console.log('🔍 Voice query data:', { audioBlob: audioBlob.size, transcription, language });

    const response = await api.post('/query/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': authHeader
      },
    });
    
    console.log('🔍 Voice query response:', response);
    return response.data;
  } catch (error) {
    throw new Error(`Voice query failed: ${error.message}`);
  }
};

// Combined voice + image query endpoint for disease detection
export const sendVoiceImageQuery = async (audioBlob, imageFile, transcription = '', language = 'en') => {
  try {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'voice_query.wav');
    formData.append('image_file', imageFile);
    formData.append('language', language);
    formData.append('transcription', transcription);

    // Create auth header from Firebase
    let authHeader = await getAuthToken();
    if (authHeader) {
      console.log('✅ Using Firebase ID token for auth in voice+image query');
    } else {
      console.log('⚠️ No Firebase user authenticated for voice+image query');
      throw new Error('User not authenticated. Please sign in first.');
    }

    console.log('🔍 Voice+Image query data:', { 
      audioBlob: audioBlob.size, 
      imageFile: imageFile.name,
      transcription, 
      language 
    });

    const response = await api.post('/query/voice-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': authHeader
      },
    });
    
    console.log('🔍 Voice+Image query response:', response);
    return response.data;
  } catch (error) {
    throw new Error(`Voice + Image query failed: ${error.message}`);
  }
};

// Combined text + image query endpoint for comprehensive analysis
export const sendTextImageQuery = async (text, imageFile, language = 'en') => {
  try {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('image_file', imageFile);
    formData.append('language', language);

    // Create auth header from Firebase
    let authHeader = await getAuthToken();
    if (authHeader) {
      console.log('✅ Using Firebase ID token for auth in text+image query');
    } else {
      console.log('⚠️ No Firebase user authenticated for text+image query');
      throw new Error('User not authenticated. Please sign in first.');
    }

    console.log('🔍 Text+Image query data:', { 
      text, 
      imageFile: imageFile.name,
      language 
    });

    const response = await api.post('/query/text-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': authHeader
      },
    });
    
    console.log('🔍 Text+Image query response:', response);
    return response.data;
  } catch (error) {
    throw new Error(`Text + Image query failed: ${error.message}`);
  }
};

// User profile endpoints
export const getUserProfile = async (userId) => {
  try {
    const response = await api.get(`/user/profile/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get user profile: ${error.message}`);
  }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await api.put(`/user/profile/${userId}`, profileData);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
};

// Chat history endpoints
export const getChatHistory = async (userId, limit = 50) => {
  try {
    const response = await api.post('/chat/history', { user_id: userId, limit });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get chat history: ${error.message}`);
  }
};

export const saveChatMessage = async (messageData) => {
  try {
    const response = await api.post('/chat/message', messageData);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to save chat message: ${error.message}`);
  }
};

// Utility functions for file handling
export const utils = {
  validateImageFile: (file) => {
    if (!file) {
      throw new Error('No file selected');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG or PNG image.');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File is too large. Maximum size is 10MB.');
    }

    return true;
  },

  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  validateAudioFile: (file) => {
    if (!file) {
      throw new Error('No audio file selected');
    }

    // Check file type
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid audio file type. Please upload a WAV, MP3, WebM, or OGG file.');
    }

    return true;
  }
};

// Export default api instance for direct use if needed
export default api;