import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Home,
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
  X,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Camera
} from 'lucide-react';

const QuerySubmissionInterface = ({ onSubmit, onGoHome, user }) => {
  const { t } = useLanguage();
  const { getDisplayName } = useUserStore();
  const [query, setQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasImage, setHasImage] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [audioFormatSupported, setAudioFormatSupported] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const pauseStartTimeRef = useRef(null);

  // Check browser compatibility on component mount
  useEffect(() => {
    const checkAudioSupport = () => {
      const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
      const hasMediaRecorder = !!window.MediaRecorder;
      
      setAudioFormatSupported(hasAudioContext && hasMediaRecorder);
      
      if (!hasAudioContext) {
        console.warn('⚠️ AudioContext not supported - audio conversion may not work');
      }
      if (!hasMediaRecorder) {
        console.warn('⚠️ MediaRecorder not supported - voice recording may not work');
      }
    };
    
    checkAudioSupport();
  }, []);

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Add keyboard shortcut for stopping recording
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isRecording) {
        if (e.key === 'Escape') {
          stopRecording();
        } else if (e.key === ' ' && e.code === 'Space') {
          e.preventDefault(); // Prevent page scrolling
          if (isPaused) {
            resumeRecording();
          } else {
            pauseRecording();
          }
        }
      }
    };

    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, isPaused]);

  const quickQueries = [
    {
      text: { en: "What's the weather forecast for farming?", hi: "कृषि के लिए मौसम का पूर्वानुमान क्या है?", hinglish: "Farming ke liye weather forecast kya hai?" },
      icon: Sun,
      color: "from-orange-500 to-red-500",
      category: "Weather"
    },
    {
      text: { en: "How to identify plant diseases?", hi: "पौध रोगों की पहचान कैसे करें?", hinglish: "Plant diseases ki pehchaan kaise karein?" },
      icon: Shield,
      color: "from-blue-500 to-cyan-500",
      category: "Disease"
    },
    {
      text: { en: "Best time to plant tomatoes?", hi: "टमाटर लगाने का सबसे अच्छा समय?", hinglish: "Tomato lagane ka best time?" },
      icon: Sprout,
      color: "from-green-500 to-emerald-500",
      category: "Planting"
    },
    {
      text: { en: "Soil preparation tips", hi: "मिट्टी तैयार करने के सुझाव", hinglish: "Soil preparation ke tips" },
      icon: Leaf,
      color: "from-purple-500 to-pink-500",
      category: "Soil"
    },
    {
      text: { en: "Irrigation schedule advice", hi: "सिंचाई अनुसूची सलाह", hinglish: "Irrigation schedule ki advice" },
      icon: Droplets,
      color: "from-cyan-500 to-blue-500",
      category: "Water"
    },
    {
      text: { en: "Pest control methods", hi: "कीट नियंत्रण के तरीके", hinglish: "Pest control ke methods" },
      icon: Zap,
      color: "from-yellow-500 to-orange-500",
      category: "Pests"
    }
  ];

  const farmingTips = [
    {
      icon: Clock,
      title: { en: "Seasonal Planning", hi: "मौसमी योजना", hinglish: "Seasonal planning" },
      tip: { en: "Plan your crops based on local weather patterns", hi: "स्थानीय मौसम के आधार पर फसलों की योजना बनाएं", hinglish: "Local weather ke basis par crops plan karein" }
    },
    {
      icon: MapPin,
      title: { en: "Location Matters", hi: "स्थान महत्वपूर्ण", hinglish: "Location important hai" },
      tip: { en: "Consider your region's climate and soil type", hi: "अपने क्षेत्र की जलवायु और मिट्टी के प्रकार पर विचार करें", hinglish: "Apne area ke climate aur soil type ko consider karein" }
    },
    {
      icon: BarChart3,
      title: { en: "Monitor Progress", hi: "प्रगति की निगरानी", hinglish: "Progress monitor karein" },
      tip: { en: "Track crop growth and adjust care accordingly", hi: "फसल विकास को ट्रैक करें और देखभाल को समायोजित करें", hinglish: "Crop growth ko track karein aur care ko adjust karein" }
    }
  ];

  const convertAudioToWav = async (audioBlob) => {
    try {
      // Check if AudioContext is supported
      if (!window.AudioContext && !window.webkitAudioContext) {
        console.warn('⚠️ AudioContext not supported - cannot convert audio format');
        console.log('🔍 Sending original audio format:', audioBlob.type);
        return audioBlob;
      }
      
      // Create an audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create a new audio buffer with WAV format
      const wavBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      
      // Copy audio data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        wavBuffer.copyToChannel(channelData, channel);
      }
      
      // Convert to WAV format
      const wavBlob = await audioBufferToWav(wavBuffer);
      
      console.log('✅ Audio converted to WAV format');
      console.log('🔍 Original format:', audioBlob.type);
      console.log('🔍 Converted format: audio/wav');
      console.log('🔍 Original size:', audioBlob.size, 'bytes');
      console.log('🔍 Converted size:', wavBlob.size, 'bytes');
      
      return wavBlob;
      
    } catch (error) {
      console.error('❌ Error converting audio to WAV:', error);
      console.log('⚠️ Falling back to original audio format');
      return audioBlob;
    }
  };

  const audioBufferToWav = (buffer) => {
    return new Promise((resolve) => {
      const length = buffer.length;
      const numberOfChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
      const view = new DataView(arrayBuffer);
      
      // WAV header
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
      
      // Convert audio data
      let offset = 44;
      for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
          offset += 2;
        }
      }
      
      const wavBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
      resolve(wavBlob);
    });
  };

  const getSupportedAudioFormat = () => {
    // Check for best audio format support
    const formats = [
      'audio/wav',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        console.log(`✅ Supported audio format: ${format}`);
        return format;
      }
    }
    
    console.log('⚠️ No specific audio format supported, using default');
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get the best supported audio format
      const mimeType = getSupportedAudioFormat();
      
      // Configure MediaRecorder with optimal settings
      const options = {
        audioBitsPerSecond: 16000
      };
      
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        // Create blob with the recorded format
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        
        // Add visual feedback
        console.log('✅ Recording stopped successfully');
        console.log('🔍 Audio format:', mimeType || 'default');
        console.log('🔍 Audio size:', blob.size, 'bytes');
        console.log('🔍 Audio type:', blob.type);
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('❌ Recording error:', event.error);
        alert('Recording failed. Please try again.');
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop after 5 minutes (300 seconds)
          if (newTime >= 300) {
            stopRecording();
            alert(t('max_recording_time_reached'));
          }
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Add a small confirmation to prevent accidental stops
      if (recordingTime < 2) {
        if (window.confirm(t('recording_very_short_confirm'))) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          setIsPaused(false);
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }
        }
      } else {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsPaused(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pauseStartTimeRef.current = Date.now();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      if (pauseStartTimeRef.current) {
        const pauseDuration = Date.now() - pauseStartTimeRef.current;
        setPausedTime(prev => prev + pauseDuration);
      }
      // Restart timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop after 5 minutes (300 seconds)
          if (newTime >= 300) {
            stopRecording();
            alert(t('max_recording_time_reached'));
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPaused(false);
    setPausedTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (file) => {
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setHasImage(true);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setHasImage(false);
  };

  const getLanguage = () => {
    // Default to English, can be enhanced with user preferences
    return 'en';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Clear audio state when switching to text tab to avoid confusion
    if (tab === 'text' && audioBlob) {
      console.log('🔄 Switching to text tab - clearing audio state');
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    }
  };

  const handleSubmit = async () => {
    // Validate that query type matches active tab
    if (activeTab === 'voice' && !audioBlob) {
      alert(t('please_record_voice_first'));
      return;
    }
    
    if (activeTab === 'text' && !query.trim()) {
      alert(t('please_type_question'));
      return;
    }
    
    if (!query.trim() && !audioBlob && !selectedImage) {
      alert(t('please_provide_query'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Determine query type based on active tab and content
      let queryType = activeTab; // Use active tab as the primary indicator
      
      // Override if there's a mismatch
      if (activeTab === 'voice' && !audioBlob) {
        queryType = 'text'; // Fallback to text if no audio
      } else if (activeTab === 'text' && audioBlob && !query.trim()) {
        queryType = 'voice'; // Use voice if audio exists but no text
      }
      
      // Add query type
      formData.append('type', queryType);
      
      if (queryType === 'voice') {
        // Convert audio to WAV format for backend compatibility
        console.log('🔄 Converting audio to WAV format...');
        const wavBlob = await convertAudioToWav(audioBlob);
        
        formData.append('audio_file', wavBlob, 'voice_query.wav');
        formData.append('transcription', query.trim());
        if (selectedImage) {
          formData.append('image', selectedImage);
          formData.append('metadata', JSON.stringify({ 
            hasImage: true, 
            imageDescription: 'Image uploaded with voice query' 
          }));
        }
      } else if (queryType === 'image') {
        formData.append('file', selectedImage);
        formData.append('query', 'Analyze this plant image');
      } else {
        // Text query (with or without image)
        formData.append('text', query.trim());
        if (selectedImage) {
          formData.append('file', selectedImage);
          formData.append('query', query.trim() + ' (with image)');
        }
      }

      console.log('🔍 Submitting query:', {
        type: queryType,
        activeTab,
        hasAudio: !!audioBlob,
        hasImage: !!selectedImage,
        hasText: !!query.trim()
      });

      await onSubmit(formData);
      
      // Reset form
      setQuery('');
      setAudioBlob(null);
      setAudioUrl(null);
      setSelectedImage(null);
      setImagePreview(null);
      setHasImage(false);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error submitting query:', error);
      alert(t('failed_to_submit_query'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-6">
      {/* Header with Home Button */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
                     <h1 className="text-4xl font-bold text-gray-800">
             {t('ask_your_farming_questions')}
           </h1>
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <Home className="w-5 h-5" />
                         {t('back_to_guide')}
          </button>
        </div>

        {/* Main Query Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Query Input */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/30">
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 rounded-2xl p-1">
                <button
                  onClick={() => handleTabChange('text')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === 'text' 
                      ? 'bg-white text-gray-800 shadow-lg' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                                       <div className="flex items-center justify-center gap-2">
                       <FileText className="w-5 h-5" />
                       {t('text_query')}
                     </div>
                </button>
                <button
                  onClick={() => handleTabChange('voice')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === 'voice' 
                      ? 'bg-white text-gray-800 shadow-lg' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                                       <div className="flex items-center justify-center gap-2">
                       <Mic className="w-5 h-5" />
                       {t('voice_query')}
                     </div>
                </button>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'text' && (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                                             <label className="block text-gray-700 font-medium mb-3">
                         {t('type_farming_question')}:
                       </label>
                      <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('query_placeholder')}
                        className="w-full h-32 p-4 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            handleSubmit();
                          }
                        }}
                      />
                      <p className="text-gray-500 text-sm mt-2">
                                                 💡 {t('tip_ctrl_enter')}
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'voice' && (
                  <motion.div
                    key="voice"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Audio Format Support Indicator */}
                    <div className={`p-3 rounded-xl text-sm ${
                      audioFormatSupported 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          audioFormatSupported ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="font-medium">
                          {audioFormatSupported 
                                                      ? t('audio_format_wav_compatibility')
                          : t('audio_format_browser_default')
                          }
                        </span>
                      </div>
                      <p className="mt-1 text-xs opacity-80">
                        {audioFormatSupported 
                          ? t('audio_wav_conversion_info')
                          : t('audio_conversion_not_supported')
                        }
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="mb-4">
                        {!audioBlob ? (
                          <div className="space-y-4">
                            {!isRecording ? (
                              <button
                                onClick={startRecording}
                                className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 bg-green-500 hover:bg-green-600 hover:scale-110"
                              >
                                <Mic className="w-8 h-8 text-white" />
                              </button>
                            ) : (
                              <div className="space-y-4">
                                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-red-500 animate-pulse mx-auto">
                                  <Mic className="w-8 h-8 text-white" />
                                </div>
                                <div className="flex gap-2 justify-center">
                                  {!isPaused ? (
                                    <button
                                      onClick={pauseRecording}
                                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-300"
                                    >
                                      <Pause className="w-4 h-4 inline mr-2" />
                                      {t('pause')}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={resumeRecording}
                                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300"
                                    >
                                      <Play className="w-4 h-4 inline mr-2" />
                                      {t('resume')}
                                    </button>
                                  )}
                                  <button
                                    onClick={stopRecording}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-300"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 bg-white rounded-full"></div>
                                      {t('stop')}
                                    </div>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <audio controls className="w-full" src={audioUrl} />
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={startRecording}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                              >
                                <RotateCcw className="w-4 h-4 inline mr-2" />
                                {t('re_record')}
                              </button>
                              <button
                                onClick={() => {
                                  setAudioBlob(null);
                                  setAudioUrl(null);
                                  setRecordingTime(0);
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                              >
                                <X className="w-4 h-4 inline mr-2" />
                                {t('clear')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {isRecording && (
                        <div className={`font-medium ${isPaused ? 'text-yellow-600' : 'text-red-600'}`}>
                          {isPaused ? t('paused') : t('recording')}... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                      
                      {isRecording && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-1000 ease-linear ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min((recordingTime / 300) * 100, 100)}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {isRecording && (
                        <div className="text-gray-500 text-sm bg-gray-100 px-3 py-2 rounded-lg">
                          {isPaused ? (
                            '💡 Click Resume to continue recording'
                          ) : (
                            <>
                              💡 Press <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Esc</kbd> to stop recording
                            </>
                          )}
                        </div>
                      )}
                      
                      <p className="text-gray-600 text-sm">
                        {!audioBlob && !isRecording ? 'Click to start recording your question' : 
                         isRecording ? 'Recording in progress...' : 'Your voice query is ready'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Image Upload Section - Always visible */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-gray-700 font-medium mb-3">
                                     📸 {t('add_image_optional')}:
                </label>
                <div className="space-y-4">
                  {!hasImage ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-green-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files[0])}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center gap-3"
                      >
                        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                          <Upload className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                                                     <p className="text-gray-700 font-medium">{t('click_upload_image')}</p>
                           <p className="text-gray-500 text-sm">{t('or_drag_drop')}</p>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-2xl"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  {t('upload_crop_images_description')}
                </p>
              </div>

              {/* Submit Button */}
              <div className="mt-8">
                {/* Query Type Indicator */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">
                      {activeTab === 'voice' && audioBlob ? t('voice_query_indicator') :
                       activeTab === 'text' && query.trim() ? t('text_query_indicator') :
                       selectedImage ? t('image_query_indicator') :
                       t('no_query_content')}
                    </span>
                  </div>
                  <p className="text-blue-600 text-xs mt-1">
                    {activeTab === 'voice' && audioBlob ? 
                      t('ready_submit_voice_recording') :
                     activeTab === 'text' && query.trim() ? t('ready_submit_text_question') :
                     selectedImage ? t('ready_submit_image_analysis') :
                     t('please_provide_query_first')}
                  </p>
                  {activeTab === 'voice' && audioBlob && (
                    <div className="mt-2 p-2 bg-blue-100 rounded-lg">
                      <p className="text-blue-700 text-xs">
                        <strong>{t('audio_details')}:</strong> {audioBlob.size} bytes, {audioBlob.type || t('unknown_format')}
                        {audioFormatSupported && t('will_convert_to_wav')}
                      </p>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!query.trim() && !audioBlob && !selectedImage)}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('processing')}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Send className="w-5 h-5" />
                      {t('submit')} {activeTab === 'voice' ? t('voice') : activeTab === 'text' ? t('text') : t('image')} {t('query')}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions & Tips */}
          <div className="space-y-6">
            
            {/* Quick Queries */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/30"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                {t('quick_questions')}
              </h3>
              <div className="space-y-3">
                {quickQueries.slice(0, 4).map((quickQuery, index) => (
                  <motion.button
                    key={index}
                    onClick={() => {
                      setQuery(quickQuery.text[getLanguage()] || quickQuery.text.en);
                      setActiveTab('text');
                    }}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    whileHover={{ x: 5 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 bg-gradient-to-r ${quickQuery.color} rounded-lg flex items-center justify-center`}>
                        <quickQuery.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {quickQuery.text[getLanguage()] || quickQuery.text.en}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Farming Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/30"
            >
                               <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <BookOpen className="w-6 h-6 text-green-500" />
                   {t('farming_tips')}
                 </h3>
              <div className="space-y-4">
                {farmingTips.map((tip, index) => (
                  <motion.div
                    key={index}
                    className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100 cursor-pointer hover:from-green-100 hover:to-blue-100 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    onClick={() => {
                      // Add the tip title as a query suggestion
                      setQuery(tip.title[getLanguage()] || tip.title.en);
                      setActiveTab('text');
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <tip.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm mb-1">
                          {tip.title[getLanguage()] || tip.title.en}
                        </h4>
                        <p className="text-gray-600 text-xs">
                          {tip.tip[getLanguage()] || tip.tip.en}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* User Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-green-500 to-blue-500 rounded-3xl p-6 text-white shadow-xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg mb-2">
                  Welcome back, {getDisplayName()}!
                </h3>
                                 <p className="text-green-100 text-sm">
                   {t('ready_expert_advice')}
                 </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuerySubmissionInterface;
