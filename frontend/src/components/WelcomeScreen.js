import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   Sprout, 
   Sun, 
   ArrowRight, 
   Star,
   Shield,
   Globe,
   User,
   TrendingUp,
   DollarSign,
   CheckCircle
 } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLanguage } from '../contexts/LanguageContext';

const WelcomeScreen = ({ onGetStarted, user, onShowLogin, onShowSignup }) => {
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('WelcomeScreen props:', { onGetStarted, user, onShowLogin, onShowSignup });
  }
  
  const { isDarkMode } = useDarkMode();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸', greeting: 'Welcome to Krishi Bandhu' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳', greeting: 'कृषि बंधु में आपका स्वागत है' },
    { code: 'hinglish', name: 'Hinglish', flag: '🇮🇳', greeting: 'Krishi Bandhu mein aapka swagat hai' }
  ];

  const trustIndicators = [
    {
      icon: Star,
      textKey: 'trusted_by_farmers',
      color: 'text-yellow-500'
    },
    {
      icon: CheckCircle,
      textKey: 'ai_support',
      color: 'text-green-500'
    },
    {
      icon: Shield,
      textKey: 'secure_private',
      color: 'text-blue-500'
    }
  ];



           const features = [
      {
        icon: Sun,
        titleKey: 'weather_intelligence',
        descKey: 'weather_intelligence_desc',
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'from-blue-50 to-cyan-50'
      },
      {
        icon: Shield,
        titleKey: 'plant_health_analysis',
        descKey: 'plant_health_analysis_desc',
        color: 'from-green-500 to-emerald-500',
        bgColor: 'from-green-50 to-emerald-50'
      },
      {
        icon: TrendingUp,
        titleKey: 'market_insights',
        descKey: 'market_insights_desc',
        color: 'from-orange-500 to-amber-500',
        bgColor: 'from-orange-50 to-amber-50'
      },
      {
        icon: DollarSign,
        titleKey: 'financial_guidance',
        descKey: 'financial_guidance_desc',
        color: 'from-purple-500 to-pink-500',
        bgColor: 'from-purple-50 to-pink-50'
      }
    ];

  

  

  

       useEffect(() => {
      const interval = setInterval(() => {
        setCurrentFeature((prev) => (prev + 1) % features.length);
      }, 5000);
      return () => clearInterval(interval);
    }, [features.length]);

  const handleStart = () => {
    setIsVisible(false);
    setTimeout(() => onGetStarted(), 500);
  };

  const handleLanguageChange = async (newLanguage) => {
    try {
      await changeLanguage(newLanguage);
      console.log(`Language changed to: ${newLanguage}`);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

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
            <motion.div
              className="absolute top-1/2 left-1/2 w-24 h-24 bg-green-200/20 dark:bg-green-800/10 rounded-full blur-2xl"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            />
          </div>

          {/* Enhanced Language Selector */}
          <motion.div 
             className="absolute top-6 right-6 z-50"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
                          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-xl border border-green-200 hover:shadow-2xl transition-all duration-300 cursor-pointer">
               <Globe className="w-5 h-5 text-green-600" />
              <select
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                 className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer hover:text-green-700 dark:hover:text-green-400 transition-colors duration-200 min-w-[120px]"
                 style={{ pointerEvents: 'auto' }}
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-8">
            {/* Enhanced Logo and Title */}
            <motion.div
              className="text-center mb-8"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="relative mx-auto mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                 {/* Improved KrishiBandhuMark Logo */}
                 <div className="inline-flex flex-col items-center gap-2 sm:gap-3 select-none">
                   {/* Icon tile */}
                   <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                     {/* Background gradient */}
                     <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800" />

                     {/* Subtle gloss */}
                     <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

                                           {/* Logo Image */}
                                             <img
                         src="/logo.png"
                         alt="Krishi Bandhu Logo"
                         className="absolute inset-0 w-full h-full object-contain p-1"
                       />
                   </div>

                   {/* Wordmark + Tagline */}
                   <div className="text-center">
                     <div className="font-semibold tracking-tight text-zinc-900 text-lg sm:text-xl">
                       Krishi <span className="text-emerald-600">Bandhu</span>
                     </div>
                     <div className="text-xs sm:text-sm text-zinc-600">
                       {t('tagline')}
                     </div>
                   </div>
                 </div>
              </motion.div>
              
                             <motion.h1 
                 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4 leading-tight"
                 initial={{ y: 30, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.8, delay: 0.2 }}
               >
                 <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                   {t('welcome_to_krishi_bandhu')}
                 </span>
               </motion.h1>
              
              <motion.p 
                className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {t('ai_powered_farming_assistant')}
              </motion.p>
            </motion.div>

                         {/* Single Feature Card with Sliding Animation */}
                           <motion.div 
                className="mb-8 max-w-2xl w-full mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-500 h-[200px] w-full flex flex-col justify-center">
                     <AnimatePresence mode="wait">
                       <motion.div
                         key={currentFeature}
                         className="text-center"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         transition={{ 
                                 duration: 0.8,
                           ease: "easeInOut"
                         }}
                       >
                         <div className={`w-20 h-20 bg-gradient-to-r ${features[currentFeature].color} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                           {(() => {
                             const Icon = features[currentFeature].icon;
                             return <Icon className="w-10 h-10 text-white" />;
                           })()}
                         </div>
                         <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                           {t(features[currentFeature].titleKey)}
                         </h3>
                         <p className="text-gray-600 dark:text-gray-300 leading-tight text-sm px-2">
                           {t(features[currentFeature].descKey)}
                         </p>
                       </motion.div>
                     </AnimatePresence>
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/40 to-white/40 rounded-2xl opacity-100 transition-opacity duration-500 -z-10" />
                   </div>
             </motion.div>

            

            {/* Authentication Buttons */}
            {!user ? (
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <motion.button
                  onClick={() => {
                    if (onShowLogin && typeof onShowLogin === 'function') {
                      onShowLogin();
                    } else {
                      console.error('onShowLogin is not a function:', onShowLogin);
                    }
                  }}
                  className="w-full sm:w-48 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>
                      {t('log_in')}
                    </span>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => {
                    if (onShowSignup && typeof onShowSignup === 'function') {
                      onShowSignup();
                    } else {
                      console.error('onShowSignup is not a function:', onShowSignup);
                    }
                  }}
                  className="w-full sm:w-48 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                >
                  <div className="flex items-center gap-2">
                    <Sprout className="w-4 h-4" />
                    <span>
                      {t('sign_up')}
                    </span>
                  </div>
                </motion.button>
              </div>
            ) : (
              /* Enhanced Start Button for logged-in users - More Compact */
                             <motion.button
                 onClick={handleStart}
                 className="group relative px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 mb-6"
                 whileHover={{ y: -2 }}
                 whileTap={{ scale: 0.98 }}
                 initial={{ y: 30, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.8, delay: 1.2 }}
               >
                 <div className="flex items-center gap-3">
                   <span>
                     {t('start_journey')}
                   </span>
                   <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
               </motion.button>
            )}

            

            {/* Enhanced Trust Indicators - More Compact */}
            <motion.div 
                className="mt-2 text-center"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <div className="flex items-center justify-center gap-6 text-gray-500">
                 {trustIndicators.map((indicator, index) => {
                   const Icon = indicator.icon;
                   return (
                     <div key={index} className="flex items-center gap-2">
                       <Icon className={`w-5 h-5 ${indicator.color}`} />
                       <span className="text-base font-medium">
                         {t(indicator.textKey)}
                       </span>
                </div>
                   );
                 })}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeScreen;
