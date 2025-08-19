import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { addDoc, collection } from 'firebase/firestore';
import useUserStore from './stores/userStore';
import useChatStore from './stores/chatStore';
import * as api from './services/api';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Components
import Login from './components/auth/Login';
import EnhancedSignup from './components/auth/EnhancedSignup';
import WelcomeScreen from './components/WelcomeScreen';
import WelcomeGuide from './components/WelcomeGuide';
import ChatInterface from './components/ChatInterface';

import ErrorBoundary from './components/ErrorBoundary';

import UserProfile from './components/profile/UserProfile';
import ChatHistory from './components/chat/ChatHistory';
import SavedResponses from './components/SavedResponses';

// Layout Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

function App() {
  const { user, setUser, isAuthenticated, isLoading, getUserId, getUserLocation, getUserCropType, getUserLanguage } = useUserStore();
  const { startNewChat, addChatMessage, loadUserChats } = useChatStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showEnhancedSignup, setShowEnhancedSignup] = useState(false);
  const [currentView, setCurrentView] = useState('welcome');
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(true); // Default to true to prevent sidebar flash on login
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // New state for sidebar

  // Debug logging for modal states (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('App.js modal states:', {
        showLogin,
        showEnhancedSignup,
        currentView,
        user: user?.uid,
        isSidebarOpen // Add sidebar state to debug logging
      });
    }
  }, [showLogin, showEnhancedSignup, currentView, user?.uid, isSidebarOpen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await setUser(user);
        // Load user chats from Firestore
        await loadUserChats(user.uid);
        // Start a new chat session when user logs in
        startNewChat();
        // Show welcome guide for new users
        setShowWelcomeGuide(true);
      } else {
        setUser(null);
        setShowWelcomeGuide(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, startNewChat, loadUserChats]);

  const handleViewChange = (view) => {
    console.log('Changing view to:', view);
    setCurrentView(view);
    // Close sidebar when changing views
    setIsSidebarOpen(false);
    
    if (view === 'welcome') {
      // Show Welcome Guide when Home is clicked
      setShowWelcomeGuide(true);
    } else if (view !== 'welcome') {
      // Hide Welcome Guide and start new chat for other views
      setShowWelcomeGuide(false);
      startNewChat();
    }
  };

  const handleStartJourney = () => {
    setShowWelcomeGuide(false);
    setCurrentView('query');
    // Ensure sidebar is closed when starting journey
    setIsSidebarOpen(false);
  };

  const handleGoHome = () => {
    setShowWelcomeGuide(true);
    // Close sidebar when going home
    setIsSidebarOpen(false);
    // Welcome Guide is the home screen, no need to set currentView
  };

  const handleLogoClick = () => {
    // Show Welcome Guide when logo is clicked
    setShowWelcomeGuide(true);
    // Close sidebar when logo is clicked
    setIsSidebarOpen(false);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Create or get existing chat for user
  const createOrGetChat = async (userId) => {
    try {
      // Check if user has an existing active chat
      const existingChats = await loadUserChats(userId);
      if (existingChats && existingChats.length > 0) {
        // Return the most recent chat
        return existingChats[0].id;
      }
      
      // Create new chat if none exists
      const newChat = {
        user_id: userId,
        title: 'New Chat',
        type: 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: []
      };
      
      const chatRef = await addDoc(collection(db, 'chats'), newChat);
      return chatRef.id;
    } catch (error) {
      console.error('Error creating/getting chat:', error);
      // Fallback: use timestamp as chat ID
      return `chat_${Date.now()}`;
    }
  };

  const handleQuerySubmit = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is properly authenticated
      if (!user || !user.uid) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      // Test backend connection first
      try {
        console.log('🔍 Testing backend connectivity...');
        const healthCheck = await fetch('http://localhost:8000/health', {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          timeout: 10000 // 10 second timeout for health check
        });
        
        if (!healthCheck.ok) {
          throw new Error(`Backend health check failed: ${healthCheck.status}`);
        }
        
        const healthData = await healthCheck.json();
        console.log('✅ Backend connection test successful:', healthData);
        
        // Test if we can reach the specific endpoint
        console.log('🔍 Testing query endpoint accessibility...');
        const testResponse = await fetch('http://localhost:8000/query/text', {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'query=test&language=en',
          timeout: 30000 // 30 second timeout for endpoint test
        });
        
        if (testResponse.status === 401) {
          console.log('✅ Query endpoint accessible (401 expected for unauthenticated test)');
        } else if (testResponse.ok) {
          console.log('✅ Query endpoint accessible and responding');
        } else {
          console.log('⚠️ Query endpoint accessible but returned:', testResponse.status);
        }
        
      } catch (connectionError) {
        console.error('❌ Backend connection test failed:', connectionError);
        setError(`Cannot connect to backend server: ${connectionError.message}. Please ensure it's running on port 8000.`);
        setLoading(false);
        return;
      }
      
      let response;
      const user_id = getUserId();
      const location = getUserLocation();
      const crop_type = getUserCropType();
      const language = getUserLanguage();
      
      // Debug: Log user preferences
      console.log('User preferences - user_id:', user_id);
      console.log('User preferences - location:', location);
      console.log('User preferences - crop_type:', crop_type);
      console.log('User preferences - language:', language);
      
      // Validate that we have a user ID
      if (!user_id) {
        throw new Error('Unable to get user ID. Please try logging in again.');
      }
      
      // Parse FormData to extract values
      const queryType = formData.get('type');
      const queryText = formData.get('text') || formData.get('transcription') || '';
      const audioBlob = formData.get('audio_file');
      const imageFile = formData.get('file') || formData.get('image');
      
      console.log('🔍 Parsed query data:', { queryType, queryText, hasAudio: !!audioBlob, hasImage: !!imageFile });
      
      // Create a new message for the current chat
      const message = {
        id: Date.now().toString(),
        type: queryType,
        content: queryText || (queryType === 'image' ? 'Image query' : queryType === 'voice' ? 'Voice query' : 'Text query'),
        timestamp: new Date().toISOString(),
        user_id: user_id,
        metadata: {
          location: location,
          crop_type: crop_type,
          hasImage: !!imageFile,
          hasAudio: !!audioBlob
        }
      };
      
      // Create or get chat ID and add message
      const chatId = await createOrGetChat(user_id);
      if (chatId) {
        addChatMessage(chatId, message);
      }
      
      try {
        if (queryType === 'text') {
          if (imageFile) {
            // Text query with image - use the new combined endpoint
            console.log('🔍 Sending combined text + image query for comprehensive analysis');
            response = await api.sendTextImageQuery(queryText, imageFile, language);
          } else {
            // Text-only query
            response = await api.sendTextQuery(queryText, language, location, crop_type);
          }
        } else if (queryType === 'image') {
          response = await api.sendImageQuery(imageFile, queryText, language);
        } else if (queryType === 'voice') {
          if (imageFile) {
            // Voice query with image - use the new combined endpoint
            console.log('🔍 Sending combined voice + image query for disease detection');
            response = await api.sendVoiceImageQuery(audioBlob, imageFile, queryText, language);
          } else {
            // Voice-only query
            response = await api.sendVoiceQuery(audioBlob, queryText, language);
          }
        }
        
        // Debug: Log the response structure
        console.log('🔍 Response received:', response);
        console.log('🔍 Response type:', typeof response);
        console.log('🔍 Response keys:', response ? Object.keys(response) : 'No response');
        console.log('🔍 Response.success:', response?.success);
        console.log('🔍 Response.data:', response?.data);
        console.log('🔍 Response.data.response:', response?.data?.response);
        
        // Check if this is an error response first
        if (response && response.success === false) {
          console.log('❌ Backend returned error response');
          console.log('❌ Error message:', response.message);
          console.log('❌ Error details:', response.error);
          
          // Create a fallback response for the user
          let fallbackContent = "I'm sorry, but I couldn't process your voice query properly. ";
          if (response.error) {
            fallbackContent += response.error;
          } else if (response.message) {
            fallbackContent += response.message;
          }
          

          
          // Return error response to ChatInterface
          return { 
            success: false, 
            error: response.error || response.message,
            message: response.message 
          };
        }
        
        // Try multiple response structures for successful responses
        let responseContent = null;
        let audioUrl = null;
        
        // Structure 1: response.success + response.data.response (Backend ResponseModel format)
        if (response && response.success && response.data && response.data.response) {
          responseContent = response.data.response;
          audioUrl = response.data.audio_url;
          console.log('✅ Using structure 1 (success + data.response)');
        }
        // Structure 2: direct response.response field
        else if (response && response.response) {
          responseContent = response.response;
          audioUrl = response.audio_url;
          console.log('✅ Using structure 2 (direct response field)');
        }
        // Structure 3: response.data as direct content
        else if (response && response.data && typeof response.data === 'string') {
          responseContent = response.data;
          audioUrl = response.audio_url;
          console.log('✅ Using structure 3 (data as string)');
        }
        // Structure 4: response.data as object with different structure
        else if (response && response.data && typeof response.data === 'object') {
          // Try to find response content in different possible fields
          responseContent = response.data.response || response.data.content || response.data.message || JSON.stringify(response.data);
          audioUrl = response.data.audio_url || response.data.audioUrl;
          console.log('✅ Using structure 4 (data as object with fallback)');
        }
        
        if (responseContent) {
          // Return response data to ChatInterface
          return { response: responseContent, audio_url: audioUrl };
        } else {
          console.error('❌ No valid response structure found:', response);
          console.error('❌ Response structure analysis:', {
            hasResponse: !!response,
            hasSuccess: !!response?.success,
            hasData: !!response?.data,
            hasResponseField: !!response?.response,
            responseType: typeof response,
            responseKeys: response ? Object.keys(response) : 'No response',
            dataKeys: response?.data ? Object.keys(response.data) : 'No data keys',
            dataType: typeof response?.data
          });
          
          // Try to extract any useful information from the response
          let fallbackContent = "I received a response from the backend, but I'm having trouble processing it properly. ";
          if (response && response.message) {
            fallbackContent += response.message;
          } else if (response && response.data && response.data.message) {
            fallbackContent += response.data.message;
          } else {
            fallbackContent += "Please try again or contact support if the issue persists.";
          }
          

          setError('Response structure not recognized. Please check backend response format.');
          
          // Return fallback response to ChatInterface
          return { response: fallbackContent, audio_url: null };
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
        
        // Check if it's an authentication error
        if (apiError.message && apiError.message.includes('401')) {
          setError('Authentication failed. Please log in again.');
          return;
        }
        
        // Check if it's a network error
        if (apiError.message && (apiError.message.includes('Network Error') || apiError.message.includes('No response received'))) {
          setError('Cannot connect to server. Please check if backend is running on port 8000.');
          return;
        }
        
        // Provide a fallback response if backend is not available
        const fallbackResponse = `I understand you're asking about ${queryType === 'text' ? 'farming' : queryType === 'image' ? 'plant health' : 'voice query'}. While I'm having trouble connecting to my specialized farming knowledge base right now, here are some general tips:
        
        • Always consider your local weather conditions
        • Monitor your crops regularly for signs of disease or pests
        • Maintain proper soil moisture and drainage
        • Use organic methods when possible for sustainable farming
        
        Please try again later when the connection is restored, or contact support if the issue persists.`;
        

          setError('Backend connection issue - showing fallback response');
          
          // Return fallback response to ChatInterface
          return { response: fallbackResponse, audio_url: null };
        }
    } catch (error) {
      console.error('Error submitting query:', error);
      setError(error.message || 'Failed to submit query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
              <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Loading Krishi Bandhu...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show welcome screen with auth modals
  if (!isAuthenticated) {
    return (
      <DarkModeProvider>
        <LanguageProvider>
          <ErrorBoundary>
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <WelcomeScreen 
              onGetStarted={() => handleViewChange('chat')}
              user={user}
              onShowLogin={() => setShowLogin(true)}
              onShowSignup={() => setShowEnhancedSignup(true)}
            />
            
            {/* Authentication Modals */}
            {showLogin && (
              <Login 
                onClose={() => setShowLogin(false)}
                onSwitchToSignup={() => {
                  setShowLogin(false);
                  setShowEnhancedSignup(true);
                }}
              />
            )}

            {showEnhancedSignup && (
              <EnhancedSignup 
                onClose={() => setShowEnhancedSignup(false)}
                onSwitchToLogin={() => {
                  setShowEnhancedSignup(false);
                  setShowLogin(true);
                }}
              />
            )}

            {/* Welcome Guide Modal */}
            {showWelcomeGuide && isAuthenticated && (
              <WelcomeGuide 
                onStartJourney={handleStartJourney}
                user={user}
              />
            )}
          </div>
                 </ErrorBoundary>
        </LanguageProvider>
      </DarkModeProvider>
    );
  }

  // Authenticated - show main app
  return (
    <DarkModeProvider>
      <LanguageProvider>
        <ErrorBoundary>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          
          {/* Header - Always visible when authenticated */}
          <Header 
            user={user}
            onProfileClick={() => setShowProfile(true)}
            onChatHistoryClick={() => {
              setShowChatHistory(false);
              setShowWelcomeGuide(false);
              setCurrentView('chat');
              setIsSidebarOpen(false);
            }}
            onLogoClick={handleLogoClick}
            onSidebarToggle={handleSidebarToggle}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Loading State - Prevent flash of content during authentication */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading...</p>
              </div>
            </div>
          )}

          {/* Welcome Guide - This is the HOME SCREEN, never show sidebar here */}
          {/* This screen appears on first login AND when user clicks "Go Home" */}
          {!isLoading && showWelcomeGuide && (
            <WelcomeGuide 
              onStartJourney={handleStartJourney}
              user={user}
              onGoToMainApp={() => setShowWelcomeGuide(false)}
            />
          )}

          {/* Main App Interface - Only show after user completes WelcomeGuide */}
          {/* Sidebar is ONLY shown in this section, never in Welcome Guide */}
          {!isLoading && !showWelcomeGuide && isAuthenticated && (
            <>
              {/* Main Content */}
              <div className="flex h-[calc(100vh-4rem)]">
                {/* Sidebar - Only shown in main app, never in Welcome Guide */}
                {isSidebarOpen && (
                  <Sidebar 
                    currentView={currentView}
                    onViewChange={handleViewChange}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    user={user}
                  />
                )}

                {/* Main Content Area */}
                <main className="flex-1 p-6 overflow-y-auto">
                  {/* Welcome/Home View */}
                  {currentView === 'welcome' && (
                    <div className="h-full flex flex-col items-center justify-center">
                      <WelcomeGuide 
                        onStartJourney={() => handleViewChange('query')}
                        user={user}
                        onGoToMainApp={() => setShowWelcomeGuide(false)}
                      />
                    </div>
                  )}
                  
                  {/* Query Interface - Main app screen with ChatInterface */}
                  {currentView === 'query' && (
                    <div>
                      <ChatInterface 
                        onSubmit={handleQuerySubmit}
                        user={user}
                      />
                    </div>
                  )}
              
              {currentView === 'chat' && (
                <div>
                  <SavedResponses 
                    onBackToQuery={() => handleViewChange('query')}
                    user={user}
                  />
                </div>
              )}
              

                </main>
              </div>
            </>
          )}

          {/* Modals */}
          {showProfile && (
            <UserProfile onClose={() => setShowProfile(false)} />
          )}

          {/* ChatHistory modal removed - now directly navigates to SavedResponses view */}
        </div>
      </Router>
      </ErrorBoundary>
        </LanguageProvider>
    </DarkModeProvider>
  );
}

export default App;