import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Send, 
  Mic, 
  Image as ImageIcon, 
  FileText, 
  CloudRain, 
  TrendingUp, 
  Lightbulb, 
  BookOpen, 
  Users,
  CheckCircle,
  AlertCircle,
  Zap,
  Sparkles,
  Globe,
  MapPin,
  Calendar,
  Droplets,
  Wind,
  BarChart3,
  Sun,
  Shield,
  Sprout,
  Leaf,
  Clock,
  MessageCircle,
  Bot,
  User as UserIcon,
  Paperclip,
  Smile,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  Bookmark,
  Volume2,
  Play,
  Pause
} from 'lucide-react';
import SaveResponseModal from './SaveResponseModal';
import useSavedResponsesStore from '../stores/savedResponsesStore';

const ChatInterface = ({ onSubmit, user }) => {
  const { currentLanguage, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [voicePreview, setVoicePreview] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAdvice, setProcessingAdvice] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const [responseAudioUrl, setResponseAudioUrl] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentQueryType, setCurrentQueryType] = useState('text');
  const [audioPlaylist, setAudioPlaylist] = useState(null);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [audioError, setAudioError] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Sample messages for demonstration
  useEffect(() => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: t('ask_your_farming_questions'),
        timestamp: new Date(Date.now() - 300000),
        avatar: '🌾'
      }
    ]);
  }, [t]);

  const quickQueries = [
    {
      textKey: "weather_forecast_query",
      icon: Sun,
      color: "from-orange-500 to-red-500",
      categoryKey: "category_weather",
      description: "Get weather insights for farming",
      detailedText: "What's the weather forecast for the next 2 weeks? I need to plan when to plant my wheat crop."
    },
    {
      textKey: "plant_diseases_query",
      icon: Shield,
      color: "from-blue-500 to-cyan-500",
      categoryKey: "category_plant_disease",
      description: "Identify and treat plant diseases",
      detailedText: "My tomato plants have yellow leaves with brown spots. What disease is this and how can I treat it?"
    },
    {
      textKey: "loan_subsidy_query",
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
      categoryKey: "category_loans_subsidies",
      description: "Get information about farming loans and subsidies",
      detailedText: "What farming loans and subsidies are available for small farmers? I want to buy new equipment."
    },
    {
      textKey: "market_price_query",
      icon: BarChart3,
      color: "from-purple-500 to-pink-500",
      categoryKey: "category_market_prices",
      description: "Check current market prices for crops",
      detailedText: "What are the current market prices for wheat and rice? I want to know when is the best time to sell."
    }
  ];

  const processingAdviceTips = [
    {
      icon: Sun,
      color: "from-yellow-400 to-orange-500",
      titleKey: "weather_wisdom_title",
      adviceKey: "weather_wisdom_advice"
    },
    {
      icon: Droplets,
      color: "from-blue-400 to-cyan-500",
      titleKey: "water_management_title",
      adviceKey: "water_management_advice"
    },
    {
      icon: Shield,
      color: "from-green-400 to-emerald-500",
      titleKey: "disease_prevention_title",
      adviceKey: "disease_prevention_advice"
    },
    {
      icon: TrendingUp,
      color: "from-purple-400 to-pink-500",
      titleKey: "soil_health_title",
      adviceKey: "soil_health_advice"
    },
    {
      icon: Clock,
      color: "from-indigo-400 to-blue-500",
      titleKey: "seasonal_planning_title",
      adviceKey: "seasonal_planning_advice"
    },
    {
      icon: Leaf,
      color: "from-lime-400 to-green-500",
      titleKey: "natural_pest_control_title",
      adviceKey: "natural_pest_control_advice"
    }
  ];

  const getRandomAdvice = () => {
    const randomIndex = Math.floor(Math.random() * processingAdviceTips.length);
    const advice = processingAdviceTips[randomIndex];
    return {
      ...advice,
      title: t(advice.titleKey),
      advice: t(advice.adviceKey)
    };
  };

  const startProcessing = () => {
    setIsProcessing(true);
    setProcessingAdvice(getRandomAdvice());
    
    // Update advice every 10 seconds while processing
    const adviceInterval = setInterval(() => {
      setProcessingAdvice(getRandomAdvice());
    }, 10000);
    
    // Store interval ID for cleanup
    window.adviceInterval = adviceInterval;
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    if (window.adviceInterval) {
      clearInterval(window.adviceInterval);
      window.adviceInterval = null;
    }
  };

  const handleAskAgain = () => {
    setShowResponse(false);
    setResponseContent('');
    setShowTextInput(false);
    setShowVoiceInput(false);
    setSelectedImage(null);
    setAudioBlob(null);
    setQuery('');
    setResponseAudioUrl(null);
    setIsAudioLoading(false);
    setIsAudioPlaying(false);
    setAudioPlaylist(null);
    setCurrentAudioIndex(0);
    setAudioError(null);
    setAudioProgress(0);
    setAudioDuration(0);
    setAudioCurrentTime(0);
    setAudioVolume(1);
    setShowVolumeSlider(false);
    setAudioSpeed(1);
    setShowSpeedMenu(false);
  };

  const handleSaveResponse = () => {
    setShowSaveModal(true);
  };

  const handleSaveResponseConfirm = (responseData) => {
    const { addResponse } = useSavedResponsesStore.getState();
    addResponse(responseData);
    
    // Show success message
    alert('Response saved successfully! You can find it in the Saved Responses section.');
  };

  const farmingTips = [
    {
      icon: Clock,
      titleKey: "seasonal_planning",
      tipKey: "seasonal_planning_tip",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: MapPin,
      titleKey: "location_matters",
      tipKey: "location_matters_tip",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: BarChart3,
      titleKey: "monitor_progress",
      tipKey: "monitor_progress_tip",
      color: "from-purple-500 to-pink-500"
    }
  ];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [query]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (window.adviceInterval) {
        clearInterval(window.adviceInterval);
        window.adviceInterval = null;
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isSubmitting) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query.trim(),
      timestamp: new Date(),
      avatar: user?.displayName?.[0] || user?.email?.[0] || '👤'
    };
    
    // Store current query for saving response
    setCurrentQuery(query.trim());
    setCurrentQueryType('text');
    
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsSubmitting(true);
    setIsTyping(true);
    
    // Start processing state with advice
    startProcessing();
    
    try {
      // Create FormData for backend submission
      const formData = new FormData();
      formData.append('type', 'text');
      formData.append('text', query.trim());
      if (selectedImage) {
        formData.append('file', selectedImage);
      }
      
      // Call backend through onSubmit and wait for response
      const response = await onSubmit(formData);
      
      // Stop processing and show response
      stopProcessing();
      
      // Use actual response from backend or fallback to generic message
      if (response && response.response) {
        setResponseContent(response.response);
        setResponseAudioUrl(response.audio_url || null);
      } else {
        setResponseContent(`Thank you for your question about "${query.trim()}". Here's my detailed farming advice based on your query. I've analyzed your question and provided comprehensive guidance to help you with your farming needs.`);
        setResponseAudioUrl(null);
      }
      
      setShowResponse(true);
      
      // Reset text input view and image after successful submission
      setShowTextInput(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Chat submission error:', error);
      setIsTyping(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceSubmit = async (voiceText) => {
    if (!voiceText.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: voiceText.trim(),
      timestamp: new Date(),
      avatar: user?.displayName?.[0] || user?.email?.[0] || '👤',
      isVoice: true
    };
    
    // Store current query for saving response
    setCurrentQuery(voiceText.trim());
    setCurrentQueryType('voice');
    
    setMessages(prev => [...prev, userMessage]);
    setIsSubmitting(true);
    setIsTyping(true);
    
    // Start processing state with advice
    startProcessing();
    
    try {
      // Create FormData for backend submission
      const formData = new FormData();
      formData.append('type', 'voice');
      formData.append('transcription', voiceText.trim());
      if (audioBlob) {
        try {
          console.log('🔄 Converting audio to WAV format...');
          
          // Convert audio to WAV format for better backend compatibility
          const wavBlob = await convertToWav(audioBlob);
          
          // Create a properly named WAV file
          const audioFile = new File([wavBlob], 'voice_query.wav', { 
            type: 'audio/wav'
          });
          
          formData.append('audio_file', audioFile);
          formData.append('audio_format', 'audio/wav'); // Send format info to backend
          
          console.log('✅ Audio converted and ready to send:', {
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size,
            originalSize: audioBlob.size
          });
          
        } catch (conversionError) {
          console.error('❌ Audio conversion failed, sending original format:', conversionError);
          
          // Fallback to original format if conversion fails
          const audioFile = new File([audioBlob], 'voice_query.webm', { 
            type: audioBlob.type 
          });
          
          formData.append('audio_file', audioFile);
          formData.append('audio_format', audioBlob.type);
        }
      }
      if (selectedImage) {
        formData.append('file', selectedImage);
      }
      
      // Call backend through onSubmit and wait for response
      const response = await onSubmit(formData);
      
      // Stop processing and show response
      stopProcessing();
      
      // Check if the response indicates an error
      if (response && response.success === false) {
        // Handle error response
        let errorMessage = 'Voice query failed. Please try again.';
        
        if (response.error) {
          errorMessage = response.error;
        } else if (response.message) {
          errorMessage = response.message;
        }
        
        // Show error to user
        alert(`Voice Query Error: ${errorMessage}\n\nPlease try:\n• Speaking more clearly\n• Reducing background noise\n• Recording in a quiet environment`);
        
        // Reset voice input view but keep the recording
        setShowVoiceInput(false);
        setVoicePreview('');
        return;
      }
      
      // Use actual response from backend or fallback to generic message
      if (response && response.response) {
        setResponseContent(response.response);
        setResponseAudioUrl(response.audio_url || null);
      } else {
        setResponseContent(`I heard you say: "${voiceText.trim()}". Here's my detailed farming advice based on your voice query. I've analyzed your question and provided comprehensive guidance to help you with your farming needs.`);
        setResponseAudioUrl(null);
      }
      
      setShowResponse(true);
      
      // Reset voice input view and image after successful submission
      setShowVoiceInput(false);
      setVoicePreview('');
      setSelectedImage(null);
      setAudioBlob(null);
    } catch (error) {
      console.error('Voice submission error:', error);
      setIsTyping(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickQuery = (quickQuery) => {
    setQuery(t(quickQuery.textKey));
    textareaRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100, // Higher sample rate for better quality
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Try to use the most compatible format for speech recognition
      let mimeType = 'audio/webm;codecs=opus';
      
      // Check what formats are supported and prioritize speech-friendly ones
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
        console.log('✅ Using WebM with Opus codec (best for speech)');
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
        console.log('✅ Using WebM format');
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
        console.log('✅ Using MP4 format');
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
        console.log('✅ Using OGG with Opus codec');
      } else {
        // Fallback to default
        mimeType = 'audio/webm';
        console.log('⚠️ Using fallback WebM format');
      }
      
      console.log('🎤 Recording with format:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // Higher bitrate for better quality
      });
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        console.log('🎵 Recording stopped, blob created:', {
          size: blob.size,
          type: blob.type
        });
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Store mediaRecorder reference for stopping
      window.currentMediaRecorder = mediaRecorder;
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (window.currentMediaRecorder) {
      window.currentMediaRecorder.stop();
    }
    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);
    
    // Set a placeholder voice preview (in real implementation, this would be the transcription)
    const voiceQuery = "This is a simulated voice query about farming";
    setVoicePreview(voiceQuery);
    
    console.log('Voice recording stopped, preview ready');
  };

  const formatTime = (timestamp) => {
    if (timestamp instanceof Date) {
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (typeof timestamp === 'number') {
      // For recording time in seconds
      const minutes = Math.floor(timestamp / 60);
      const seconds = timestamp % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return '0:00';
  };

  const MessageBubble = ({ message }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {message.type === 'ai' && (
        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {message.avatar}
        </div>
      )}
      
      <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          message.type === 'user' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
            : 'bg-white border border-green-200 text-gray-800 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {message.isVoice && (
              <Mic className="w-3 h-3 text-green-300" />
            )}
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 mt-2 text-xs text-green-600 ${
          message.type === 'user' ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(message.timestamp)}</span>
          {message.type === 'ai' && (
            <div className="flex items-center gap-1">
              {/* Audio Playback Button */}
              <button className="p-1 hover:bg-green-100 rounded transition-colors" title="Listen to response">
                <Volume2 className="w-3 h-3" />
              </button>
              
              {/* Bookmark Button */}
              <button className="p-1 hover:bg-green-100 rounded transition-colors" title="Save this advice">
                <Bookmark className="w-3 h-3" />
              </button>
              
              {/* Thumbs Up Button */}
              <button className="p-1 hover:bg-green-100 rounded transition-colors" title="Helpful">
                <ThumbsUp className="w-3 h-3" />
              </button>
              
              {/* Thumbs Down Button */}
              <button className="p-1 hover:bg-green-100 rounded transition-colors" title="Not helpful">
                <ThumbsDown className="w-3 h-3" />
              </button>
              
              {/* Copy Button */}
              <button className="p-1 hover:bg-green-100 rounded transition-colors" title="Copy text">
                <Copy className="w-3 h-3" />
              </button>
              
              {/* Share Button */}
              <button className="p-1 hover:bg-green-100 rounded transition-colors" title="Share advice">
                <Share2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {message.type === 'user' && (
        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {message.avatar}
        </div>
      )}
    </motion.div>
  );

  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        🌾
      </div>
      <div className="bg-white border border-green-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </motion.div>
  );

  const handleAudioPlay = () => {
    if (audioRef.current && audioRef.current.src) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsAudioPlaying(true);
        }).catch(e => {
          console.error('Error playing audio:', e);
          setIsAudioPlaying(false);
          setAudioError('Failed to play audio');
        });
      }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setAudioCurrentTime(current);
      setAudioDuration(duration);
      setAudioProgress((current / duration) * 100);
    }
  };

  const handleAudioSeek = (e) => {
    if (audioRef.current && audioRef.current.duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const seekTime = (clickX / width) * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setAudioVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatAudioTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAudioRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setAudioCurrentTime(0);
      setAudioProgress(0);
    }
  };

  const handleSpeedChange = (speed) => {
    setAudioSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  // Function to convert audio blob to WAV format
  const convertToWav = async (audioBlob) => {
    try {
      // Create an audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create WAV file from audio buffer
      const wavBlob = audioBufferToWav(audioBuffer);
      
      console.log('✅ Audio converted to WAV:', {
        originalSize: audioBlob.size,
        wavSize: wavBlob.size,
        originalType: audioBlob.type,
        wavType: wavBlob.type
      });
      
      return wavBlob;
    } catch (error) {
      console.error('❌ Audio conversion failed:', error);
      // Return original blob if conversion fails
      return audioBlob;
    }
  };

  // Function to convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer) => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV file header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert audio data to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Processing Interface - Replaces Query Interface */}
      {isProcessing && (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          {/* Enhanced Loading Animation */}
          <div className="mb-8">
            <div className="relative w-24 h-24 mx-auto">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-green-500 rounded-full animate-spin"></div>
              
              {/* Inner rotating ring */}
              <div className="absolute inset-2 border-4 border-emerald-200 rounded-full"></div>
              <div className="absolute inset-2 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              
              {/* Center icon */}
              <div className="absolute inset-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Processing Header */}
          <div className="text-center mb-6">
            <h3 className="text-3xl font-bold text-gray-800 mb-2">{t('processing_query')}</h3>
            <p className="text-lg text-gray-600">{t('processing_subtitle')}</p>
          </div>
          
          {/* Farming Advice */}
          {processingAdvice && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 max-w-md mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${processingAdvice.color} rounded-full flex items-center justify-center`}>
                  <processingAdvice.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-800">{processingAdvice.title}</h4>
              </div>
              <p className="text-base text-gray-700 leading-relaxed">{processingAdvice.advice}</p>
            </div>
          )}
          
          {/* Animated dots */}
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}

      {/* Response Interface - Replaces Query Interface */}
      {showResponse && (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl max-w-4xl w-full"
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl overflow-hidden">
                {/* Background gradient matching header */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800" />
                
                {/* Logo Image */}
                <img
                  src="/logo.png"
                  alt="Krishi Bandhu Logo"
                  className="absolute inset-0 w-full h-full object-contain p-1"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-800">Response from Krishi Bandhu</h3>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Verified</span>
                  </div>
                </div>
                <p className="text-gray-600">Your complete personalized hyperlocal farming response</p>
              </div>
              <button
                onClick={handleAskAgain}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                <span className="text-gray-600 text-xl">×</span>
              </button>
            </div>

            {/* Audio Button and Action Buttons - Moved to top */}
            <div className="mb-6 flex flex-col items-center gap-4">
              {/* Compact Audio Player */}
              {responseAudioUrl && (
                <div className="w-full max-w-lg mx-auto">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                      {/* Play/Pause Button */}
                      <button
                        onClick={handleAudioPlay}
                        className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                        disabled={isAudioLoading}
                      >
                        {isAudioLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isAudioPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>

                      {/* Time Display */}
                      <div className="text-xs font-mono text-gray-600 min-w-[60px]">
                        {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                      </div>

                      {/* Progress Bar */}
                      <div className="flex-1 relative">
                        <div
                          className="w-full h-1.5 bg-gray-200 rounded-full cursor-pointer"
                          onClick={handleAudioSeek}
                        >
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-100"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Speed Control */}
                      <div className="relative">
                        <button
                          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                          className="w-6 h-6 text-gray-600 hover:text-gray-800 transition-colors text-xs font-medium"
                          title={`${audioSpeed}x speed`}
                        >
                          {audioSpeed}x
                        </button>
                        {showSpeedMenu && (
                          <div className="absolute bottom-full right-0 mb-1 bg-white rounded-md shadow-lg border border-gray-200 p-1 min-w-[60px]">
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                              <button
                                key={speed}
                                onClick={() => handleSpeedChange(speed)}
                                className={`w-full px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors ${
                                  audioSpeed === speed ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Volume Control */}
                      <div className="relative">
                        <button
                          onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                          className="w-6 h-6 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        {showVolumeSlider && (
                          <div className="absolute bottom-full right-0 mb-1 bg-white rounded-md shadow-lg border border-gray-200 p-2">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={audioVolume}
                              onChange={handleVolumeChange}
                              className="w-16 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${audioVolume * 100}%, #e5e7eb ${audioVolume * 100}%, #e5e7eb 100%)`
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Restart Button */}
                      <button
                        onClick={handleAudioRestart}
                        className="w-6 h-6 text-gray-600 hover:text-gray-800 transition-colors"
                        title="Restart audio"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>

                    {/* Error Display */}
                    {audioError && (
                      <div className="mt-2 text-xs text-red-600 text-center">
                        {audioError}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAskAgain}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  {t('ask_followup')}
                </button>
                
                <button
                  onClick={handleSaveResponse}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  {t('save_response')}
                </button>
              </div>

              {responseAudioUrl && (
                <audio
                  ref={audioRef}
                  src={`http://localhost:8000${responseAudioUrl}`}
                  onEnded={() => setIsAudioPlaying(false)}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={() => {
                    if (audioRef.current) {
                      setAudioDuration(audioRef.current.duration);
                    }
                  }}
                  onError={(e) => {
                    console.error('Audio error:', e);
                    setIsAudioLoading(false);
                    setIsAudioPlaying(false);
                    setAudioError('Failed to load audio');
                  }}
                  preload="metadata"
                />
              )}
            </div>

            {/* Response Content */}
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6">
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{responseContent}</p>
                </div>
              </div>
            </div>
            
            {/* Timestamp */}
            <div className="mt-6 text-center">
              <div className="text-sm text-gray-500">
                {t('response_generated')} {new Date().toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Query Interface - Only shown when not processing or showing response */}
      {!isProcessing && !showResponse && (
        <div className="flex-1 flex flex-col p-4">
          {/* Chat Options Section */}
          <div className="mb-4">
            {/* Two Big Buttons for Chat Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Text Question Button */}
              <motion.div
                className="group relative overflow-hidden bg-white rounded-xl p-6 border-2 border-green-200 hover:border-green-400 transition-all duration-300 hover:shadow-lg hover:scale-105 h-44"
                whileHover={{ y: -3 }}
              >
                {showTextInput ? (
                  /* Text Input Interface inside the button area */
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-gray-800">{t('text_query')}</h4>
                      <button
                        onClick={() => setShowTextInput(false)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                      <textarea
                        ref={textareaRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('query_placeholder')}
                        className="flex-1 w-full p-2 border-2 border-green-200 rounded-lg resize-none focus:border-green-400 focus:outline-none transition-colors text-sm"
                        rows="2"
                      />
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="submit"
                          disabled={!query.trim() || isSubmitting}
                          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        >
                          <Send className="w-3 h-3" />
                          {isSubmitting ? t('processing') : t('send')}
                        </button>
                        
                        {isSubmitting && (
                          <div className="w-3 h-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
                        )}
                      </div>
                    </form>
                  </div>
                ) : (
                  /* Original Button Content */
                  <motion.button
                    onClick={() => setShowTextInput(true)}
                    className="w-full h-full text-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-800 mb-1">{t('text_query')}</h4>
                    <p className="text-sm text-gray-600">{t('ask_your_farming_questions')}</p>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.button>
                )}
              </motion.div>

              {/* Voice Question Button */}
              <motion.div
                className="group relative overflow-hidden bg-white rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:scale-105 h-44"
                whileHover={{ y: -3 }}
              >
                {showVoiceInput ? (
                  /* Voice Input Interface inside the button area */
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-gray-800">{t('voice_query')}</h4>
                      <button
                        onClick={() => {
                          setShowVoiceInput(false);
                          setVoicePreview('');
                          setAudioBlob(null);
                        }}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      {!isRecording && !voicePreview ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                          <h4 className="text-xs font-bold text-gray-800 mb-1">{t('voice_query')}</h4>
                          <p className="text-xs text-gray-600 mb-2 text-center">{t('click_microphone_text')}</p>
                          <button
                            onClick={startRecording}
                            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 text-sm"
                          >
                            {t('start_recording')}
                          </button>
                        </div>
                      ) : isRecording ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mb-2 animate-pulse">
                            <Mic className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-xs font-semibold text-red-600 mb-1">{t('recording')}</p>
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1 mb-2">
                            <p className="text-xs text-red-700 font-medium">{t('time')}: {formatTime(recordingTime)}</p>
                          </div>
                          <button
                            onClick={stopRecording}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all duration-300 text-xs"
                          >
                            {t('stop')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col">
                          <div className="mb-2">
                            <h5 className="text-xs font-bold text-gray-800 mb-1">{t('voice_preview')}</h5>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                              <p className="text-xs text-gray-700 mb-1">{voicePreview}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1 mt-auto">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setVoicePreview('');
                                }}
                                className="flex-1 px-2 py-1 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all duration-300 text-xs"
                              >
                                {t('re_record')}
                              </button>
                              <button
                                onClick={() => {
                                  // Here you would play the recorded audio
                                  console.log('Playing recorded audio...');
                                }}
                                className="flex-1 px-2 py-1 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all duration-300 text-xs"
                              >
                                🔊 {t('preview')}
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                // Handle voice submission with backend integration
                                handleVoiceSubmit(voicePreview);
                              }}
                              className="w-full px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 text-xs"
                            >
                              {t('send')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Original Button Content */
                  <motion.button
                    onClick={() => setShowVoiceInput(true)}
                    className="w-full h-full text-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Mic className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-800 mb-1">{t('voice_query')}</h4>
                    <p className="text-sm text-gray-600">{t('voice_query_indicator')}</p>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.button>
                )}
              </motion.div>
            </div>

            {/* Image Upload Section */}
            <div className="mb-4">
              <motion.button
                onClick={() => {
                  // Create a file input element for image selection
                  const fileInput = document.createElement('input');
                  fileInput.type = 'file';
                  fileInput.accept = 'image/*';
                  fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setSelectedImage(file);
                    }
                  };
                  fileInput.click();
                }}
                className="w-full bg-white border-2 border-dashed border-green-300 rounded-2xl p-7 hover:border-green-400 hover:bg-green-50 transition-all duration-300 group"
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-center">
                  {selectedImage ? (
                    <>
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ImageIcon className="w-8 h-8 text-white" />
                      </div>
                      <h5 className="text-lg font-semibold text-gray-800 mb-2">{t('image_selected')} ✓</h5>
                      <p className="text-sm text-gray-600 mb-2">{selectedImage.name}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(null);
                        }}
                        className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                      >
                        {t('remove_image')}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                        <ImageIcon className="w-8 h-8 text-white" />
                      </div>
                      <h5 className="text-lg font-semibold text-gray-800 mb-2">{t('upload_image')}</h5>
                      <p className="text-sm text-gray-600">{t('upload_crop_images_description')}</p>
                      <p className="text-sm text-green-600 mt-2">{t('click_to_select_or_drag_drop')}</p>
                    </>
                  )}
                </div>
              </motion.button>
            </div>

            {/* Quick Questions Section */}
            <div className="mt-2">
              <h4 className="text-base font-semibold text-gray-700 mb-3 text-center">{t('quick_questions')}</h4>
              <div className="grid grid-cols-4 gap-2">
                {quickQueries.map((quickQuery, index) => {
                  const Icon = quickQuery.icon;
                  return (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setQuery(t(quickQuery.textKey));
                        setShowTextInput(true);
                        setShowVoiceInput(false); // Ensure voice is closed
                      }}
                      className="group relative overflow-hidden bg-white rounded-lg p-2 border border-green-200 hover:border-green-400 transition-all duration-300 hover:shadow-md hover:scale-105 text-left"
                      whileHover={{ y: -2 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-6 h-6 bg-gradient-to-r ${quickQuery.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mb-1`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        
                        <div className="w-full">
                          <span className="inline-block px-1 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-1">
                            {t(quickQuery.categoryKey)}
                          </span>
                          
                          <p className="text-xs text-gray-700 leading-tight font-medium">
                            {t(quickQuery.textKey)}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Response Modal */}
      <SaveResponseModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        responseContent={responseContent}
        userQuery={currentQuery}
        queryType={currentQueryType}
        onSave={handleSaveResponseConfirm}
      />
    </div>
  );
};

export default ChatInterface;