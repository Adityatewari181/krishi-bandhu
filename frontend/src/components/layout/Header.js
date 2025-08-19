import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import useUserStore from '../../stores/userStore';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Bell, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X,
  Sun,
  Moon,
  Globe,
  MessageCircle,
  History
} from 'lucide-react';

const Header = ({ user, onProfileClick, onChatHistoryClick, onLogoClick, onSidebarToggle, isSidebarOpen }) => {
  const { logout, getDisplayName, updateUserDarkMode } = useUserStore();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  
  // Debug logging
  console.log('Header render - isSidebarOpen:', isSidebarOpen);
  
  // Refs for dropdown containers
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const languageRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Click outside handler for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close profile dropdown
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
        // Also close language dropdown since it's nested
        setIsLanguageOpen(false);
      }
      
      // Close notifications dropdown
      if (isNotificationsOpen && notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      
      // Close language dropdown
      if (isLanguageOpen && languageRef.current && !languageRef.current.contains(event.target)) {
        setIsLanguageOpen(false);
      }
      
      // Close mobile menu
      if (isMobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen, isNotificationsOpen, isLanguageOpen, isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDarkModeToggle = async () => {
    try {
      await updateUserDarkMode(!isDarkMode);
      toggleDarkMode();
    } catch (error) {
      console.error('Error updating dark mode preference:', error);
      // Still toggle locally even if Firebase update fails
      toggleDarkMode();
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    try {
      await changeLanguage(newLanguage);
      setIsLanguageOpen(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'hinglish', name: 'Hinglish', flag: '🇮🇳' }
  ];

  // Get display name from store
  const displayName = getDisplayName();



  return (
    <header className="bg-gradient-to-r from-green-50 to-emerald-50/95 dark:from-slate-800 dark:to-slate-900 backdrop-blur-sm border-b border-green-200 dark:border-slate-600 shadow-lg sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Side - Hamburger Menu and Logo */}
          <div className="flex items-center gap-4">
            {/* Hamburger Menu Button */}
            <button
              onClick={() => {
                console.log('Hamburger button clicked, current isSidebarOpen:', isSidebarOpen);
                onSidebarToggle();
              }}
              className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors text-green-700 mr-2"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Logo and Brand */}
            <motion.div
              className="w-10 h-10 rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5 relative cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={onLogoClick}
            >
              {/* Background gradient matching welcome screen */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800" />
              
              {/* Logo Image */}
              <img
                src="/logo.png"
                alt="Krishi Bandhu Logo"
                className="absolute inset-0 w-full h-full object-contain p-1"
              />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('app_name')}</h1>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{t('ai_powered_farming_assistant')}</p>
            </div>
          </div>



                     {/* Right Side Actions */}
           <div className="flex items-center gap-4">
             {/* 1. User Name and Email (Not a button) */}
             <div className="hidden sm:block text-right">
               <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{displayName}</p>
               <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
             </div>

             {/* 2. Settings Button */}
             <div className="relative" ref={profileRef}>
               <button
                 onClick={() => setIsProfileOpen(!isProfileOpen)}
                 className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors text-green-700"
                 title="Settings"
               >
                 <Settings className="w-5 h-5" />
               </button>
               
               <AnimatePresence>
                 {isProfileOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: -10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: -10, scale: 0.95 }}
                     className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 py-2 z-50"
                   >
                     <button
                       onClick={() => {
                         onProfileClick();
                         setIsProfileOpen(false);
                       }}
                       className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-200"
                     >
                       <User className="w-4 h-4" />
                       <span className="text-sm font-medium">{t('profile_settings')}</span>
                     </button>
                     
                     <button
                       onClick={() => {
                         onChatHistoryClick();
                         setIsProfileOpen(false);
                       }}
                       className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-200"
                     >
                       <History className="w-4 h-4" />
                       <span className="text-sm font-medium">{t('chat_history')}</span>
                     </button>
                     
                     <button
                       onClick={handleDarkModeToggle}
                       className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-200"
                     >
                       {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                       <span className="text-sm font-medium">{isDarkMode ? t('light_mode') : t('dark_mode')}</span>
                     </button>
                     
                     <div className="relative" ref={languageRef}>
                       <button
                         onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                         className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-200"
                       >
                         <Globe className="w-4 h-4" />
                         <span className="text-sm font-medium">{t('language')}: {languages.find(l => l.code === currentLanguage)?.name}</span>
                       </button>
                       
                       <AnimatePresence>
                         {isLanguageOpen && (
                           <motion.div
                             initial={{ opacity: 0, y: -10, scale: 0.95 }}
                             animate={{ opacity: 1, y: 0, scale: 1 }}
                             exit={{ opacity: 0, y: -10, scale: 0.95 }}
                             className="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 py-2 z-50"
                           >
                             {languages.map((lang) => (
                               <button
                                 key={lang.code}
                                 onClick={() => handleLanguageChange(lang.code)}
                                 className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                                   currentLanguage === lang.code ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-200'
                                 }`}
                               >
                                 <span className="text-lg">{lang.flag}</span>
                                 <span className="text-sm font-medium">{lang.name}</span>
                                 {currentLanguage === lang.code && (
                                   <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                                 )}
                               </button>
                             ))}
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                     
                     <div className="border-t border-gray-200 my-2"></div>
                     
                     <button
                       onClick={handleLogout}
                       className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-red-50 transition-colors text-red-600"
                     >
                       <LogOut className="w-4 h-4" />
                       <span className="text-sm font-medium">{t('logout')}</span>
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             {/* 3. Notifications Button */}
             <div className="relative" ref={notificationsRef}>
               <button
                 onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                 className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors relative text-green-700"
                 title="Notifications"
               >
                 <Bell className="w-5 h-5" />
                 <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
               </button>
               
               <AnimatePresence>
                 {isNotificationsOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: -10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: -10, scale: 0.95 }}
                     className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 py-2 z-50"
                   >
                     <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-600">
                       <h3 className="font-semibold text-gray-800 dark:text-white">{t('notifications')}</h3>
                     </div>
                     <div className="max-h-64 overflow-y-auto">
                       <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                         <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-500" />
                         <p>{t('no_notifications')}</p>
                       </div>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             {/* Mobile Menu Button */}
             <button
               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
               className="md:hidden p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors text-green-700"
             >
               {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
             </button>
           </div>
        </div>

        
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
                                                   className="md:hidden border-t border-green-200 dark:border-slate-600 bg-green-50/90 dark:bg-slate-800/90"
          >
            <div className="px-4 py-4 space-y-3">
                             <button
                 onClick={() => {
                   onProfileClick();
                   setIsMobileMenuOpen(false);
                 }}
                 className="w-full flex items-center gap-3 p-3 bg-green-50 dark:bg-slate-700 hover:bg-green-100 dark:hover:bg-slate-600 rounded-lg transition-colors text-green-700 dark:text-green-300"
               >
                <User className="w-5 h-5" />
                <span className="font-medium">{t('profile_settings')}</span>
              </button>
              
                             <button
                 onClick={() => {
                   onChatHistoryClick();
                   setIsMobileMenuOpen(false);
                 }}
                 className="w-full flex items-center gap-3 p-3 bg-green-50 dark:bg-slate-700 hover:bg-green-100 dark:hover:bg-slate-600 rounded-lg transition-colors text-green-700 dark:text-green-300"
               >
                <History className="w-5 h-5" />
                <span className="font-medium">{t('chat_history')}</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 bg-red-50 dark:bg-red-700 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg transition-colors text-red-600 dark:text-red-300"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{t('logout')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </header>
  );
};

export default Header;
