import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sprout, 
  Sun, 
  Leaf, 
  ArrowRight, 
  Star,
  Shield,
  Users,
  Clock,
  Globe,
  CheckCircle,
  MessageCircle,
  Mic,
  Image as ImageIcon,
  FileText,
  Zap,
  Lightbulb,
  BookOpen,
  TrendingUp,
  BarChart3,
  Droplets,
  Wind,
  MapPin,
  Calendar,
  Smartphone,
  Upload,
  Search,
  User,
  Bookmark,
  History,
  Share,
  Volume2,
  Play,
  Pause
} from 'lucide-react';
import useUserStore from '../stores/userStore';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLanguage } from '../contexts/LanguageContext';

const WelcomeGuide = ({ onStartJourney, user, onGoToMainApp }) => {
  const { userProfile, getDisplayName } = useUserStore();
  const { isDarkMode } = useDarkMode();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const guideSteps = [
    {
      icon: Sprout,
      title: t('guide_title'),
      description: t('guide_description'),
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50"
    },
    {
      icon: MessageCircle,
      title: t('start_conversation_title'),
      description: t('start_conversation_description'),
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50",
      features: [
        { icon: FileText, text: t('type_question_text'), color: "text-green-600 dark:text-green-400" },
        { icon: ArrowRight, text: t('press_enter_text'), color: "text-emerald-600 dark:text-emerald-400" },
        { icon: Clock, text: t('wait_ai_response_text'), color: "text-teal-600 dark:text-teal-400" }
      ]
    },
    {
      icon: Mic,
      title: t('voice_commands_title'),
      description: t('voice_commands_description'),
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50",
      features: [
        { icon: Mic, text: t('click_microphone_text'), color: "text-green-600 dark:text-green-400" },
        { icon: MessageCircle, text: t('speak_question_text'), color: "text-emerald-600 dark:text-emerald-400" },
        { icon: CheckCircle, text: t('ai_transcribe_text'), color: "text-teal-600 dark:text-teal-400" }
      ]
    },
         {
       icon: ImageIcon,
       title: t('upload_images_title'),
       description: t('upload_images_description'),
       color: "from-green-500 to-emerald-500",
       bgColor: "from-green-50 to-emerald-50",
      features: [
         { icon: ImageIcon, text: t('click_camera_text'), color: "text-green-600 dark:text-green-400" },
         { icon: Upload, text: t('select_photo_text'), color: "text-emerald-600 dark:text-emerald-400" },
         { icon: Search, text: t('instant_analysis_text'), color: "text-teal-600 dark:text-teal-400" }
       ]
     },
     {
       icon: Volume2,
       title: t('listen_audio_title'),
       description: t('listen_audio_description'),
       color: "from-green-500 to-emerald-500",
       bgColor: "from-green-50 to-emerald-50",
      features: [
         { icon: Volume2, text: t('click_speaker_text'), color: "text-green-600 dark:text-green-400" },
         { icon: Play, text: t('ai_audio_plays_text'), color: "text-emerald-600 dark:text-emerald-400" },
         { icon: Pause, text: t('pause_replay_text'), color: "text-teal-600 dark:text-teal-400" }
       ]
     },
     {
       icon: BookOpen,
       title: t('save_important_advice_title'),
       description: t('save_important_advice_description'),
       color: "from-green-500 to-emerald-500",
       bgColor: "from-green-50 to-emerald-50",
      features: [
         { icon: Bookmark, text: t('click_bookmark_text'), color: "text-green-600 dark:text-green-400" },
         { icon: History, text: t('view_saved_text'), color: "text-emerald-600 dark:text-emerald-400" },
         { icon: Share, text: t('share_tips_text'), color: "text-teal-600 dark:text-teal-400" }
       ]
     },
     {
       icon: CheckCircle,
       title: t('ready_to_go_title'),
       description: t('ready_to_go_description'),
       color: "from-green-500 to-emerald-500",
       bgColor: "from-green-50 to-emerald-50",
      features: [
         { icon: CheckCircle, text: t('click_logo_text'), color: "text-green-600 dark:text-green-400" },
         { icon: MessageCircle, text: t('need_help_text'), color: "text-emerald-600 dark:text-emerald-400" },
         { icon: Star, text: t('start_farming_text'), color: "text-teal-600 dark:text-green-400" }
      ]
    }
  ];

  const handleStart = () => {
    setIsVisible(false);
    setTimeout(() => onStartJourney(), 500);
  };

  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    } else {
      // Mark last step as completed and start the app
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      handleStart(); // Start the app when next is clicked on last step
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    // If going to a step that's already completed, keep it completed
    // If going to current step or future step, no change needed
    setCurrentStep(step);
  };

  const skipStep = () => {
    // Mark all steps as completed and directly start the app
    const allSteps = new Set(Array.from({ length: guideSteps.length }, (_, i) => i));
    setCompletedSteps(allSteps);
    handleStart(); // Directly start the app
  };

  const completeAllSteps = () => {
    // Mark all steps as completed
    const allSteps = new Set(Array.from({ length: guideSteps.length }, (_, i) => i));
    setCompletedSteps(allSteps);
    setCurrentStep(guideSteps.length - 1); // Go to last step
  };

  // Check if all steps are completed
  const allStepsCompleted = completedSteps.size === guideSteps.length;

  // Get the current icon component
  const CurrentIcon = guideSteps[currentStep].icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden"
        >
           {/* Enhanced Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-20 left-10 w-40 h-40 bg-green-200/30 dark:bg-green-800/20 rounded-full blur-3xl"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
                x: [0, 20, 0]
              }}
              transition={{ duration: 6, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-40 right-20 w-32 h-32 bg-emerald-200/40 dark:bg-emerald-800/30 rounded-full blur-3xl"
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.4, 0.7, 0.4],
                y: [0, -20, 0]
              }}
              transition={{ duration: 8, repeat: Infinity, delay: 2 }}
            />
            <motion.div
              className="absolute bottom-20 left-1/4 w-36 h-36 bg-teal-200/30 dark:bg-teal-800/20 rounded-full blur-3xl"
              animate={{ 
                scale: [1, 1.4, 1],
                opacity: [0.3, 0.5, 0.3],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 10, repeat: Infinity, delay: 4 }}
            />
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
            
            {/* Welcome Header */}
            <motion.div
              className="text-center mb-8"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              
              <motion.h1 
                className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4 leading-tight"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                  {t('hello')}, {getDisplayName()}! 
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                 {t('follow_steps_to_learn')}
              </motion.p>
            </motion.div>

            {/* Guide Steps */}
            <motion.div 
              className="mb-8 max-w-4xl w-full"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {/* Step Content */}
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-green-200/30 dark:border-slate-600/30 mb-6 relative min-h-[350px]">
                 {/* Step Number Badge */}
                 <div className="absolute top-4 right-4">
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
                     Step {currentStep + 1} of {guideSteps.length}
                   </span>
                 </div>
                
                  {/* Navigation Buttons on Card Ends */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <button
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="w-12 h-12 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg hover:scale-110"
                      title={t('previous_step')}
                    >
                      <ArrowRight className="w-5 h-5 rotate-180" />
                    </button>
                  </div>

                                     <div className="absolute right-4 top-1/2 -translate-y-1/2">
                     <button
                       onClick={nextStep}
                       className="w-12 h-12 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all duration-300 flex items-center justify-center shadow-lg hover:scale-110"
                       title={currentStep === guideSteps.length - 1 ? t('start_app') : t('next_step')}
                     >
                       {currentStep === guideSteps.length - 1 ? (
                         <CheckCircle className="w-5 h-5" />
                       ) : (
                         <ArrowRight className="w-5 h-5" />
                       )}
                     </button>
                   </div>
                
                                 <div className="text-center mb-4 px-16 flex-1 flex flex-col justify-center">
                   <div className={`w-16 h-16 bg-gradient-to-r ${guideSteps[currentStep].color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl`}>
                    <CurrentIcon className="w-8 h-8 text-white" />
                  </div>
                   <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {guideSteps[currentStep].title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base max-w-2xl mx-auto">
                    {guideSteps[currentStep].description}
                  </p>
                </div>

                {/* Features for current step */}
                {guideSteps[currentStep].features && (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 px-16">
                    {guideSteps[currentStep].features.map((feature, index) => (
                      <motion.div
                        key={index}
                         className="text-center p-3 bg-green-50 dark:bg-slate-700 rounded-xl border border-green-200/50 dark:border-slate-600/50"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                      >
                        <feature.icon className={`w-6 h-6 mx-auto mb-2 ${feature.color}`} />
                        <p className="text-gray-700 dark:text-gray-200 font-medium text-sm">{feature.text}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
                 
                                   {/* Empty space for steps without features to maintain consistent height */}
                  {!guideSteps[currentStep].features && (
                    <div className="flex-1"></div>
                  )}
                  
                                     {/* Skip to Start Link - Always at bottom center */}
                   <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                       onClick={skipStep}
                       className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm underline hover:no-underline transition-all duration-300"
                       title={t('skip_guide_tooltip')}
                     >
                       {t('skip_guide')}
                </button>
                   </div>
                </div>
                
              {/* Step Indicators and Action Buttons */}
              <div className="flex flex-col items-center gap-4 mb-6">
                {/* Step Indicators */}
                <div className="flex gap-2">
                  {guideSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToStep(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentStep 
                          ? 'bg-green-500 dark:bg-green-400 scale-125' 
                          : completedSteps.has(index)
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-green-200 dark:bg-slate-600 hover:bg-green-300 dark:hover:bg-slate-500'
                      }`}
                      title={`Step ${index + 1}${completedSteps.has(index) ? ' (Completed)' : ''}`}
                    />
                  ))}
                </div>
                
                                 {/* Action Buttons */}
                 <div className="flex gap-3">
                   {/* No buttons needed - next button on last step will start the app */}
                </div>
              </div>
            </motion.div>

                         
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeGuide;
