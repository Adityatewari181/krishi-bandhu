import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import useUserStore from '../../stores/userStore';
import { 
  Home, 
  MessageCircle, 
  Image as ImageIcon, 
  Mic, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown, 
  ChevronRight, 
  History, 
  BookOpen, 
  Droplets,
  Sun,
  Shield,
  Leaf,
  BarChart3,
  Zap
} from 'lucide-react';

const Sidebar = ({ currentView, onViewChange, isOpen = false, onClose, user }) => {
  const { t } = useLanguage();
  const { getDisplayName } = useUserStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Debug logging
  console.log('Sidebar render - isOpen:', isOpen, 'currentView:', currentView);

  // Don't render anything if not open
  if (!isOpen) {
    console.log('Sidebar not open, not rendering');
    return null;
  }

  const navigationItems = [
    {
      id: 'welcome',
      label: t('home'),
      icon: Home,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      description: t('welcome_description')
    },
    {
      id: 'query',
      label: t('ask_query'),
      icon: MessageCircle,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      description: t('query_description')
    },
    {
      id: 'chat',
      label: t('chat_history'),
      icon: BookOpen,
      color: 'from-teal-500 to-green-600',
      bgColor: 'bg-teal-50',
      description: t('chat_history_description')
    }
  ];

  const handleViewChange = (viewId) => {
    console.log('Sidebar: Changing view to:', viewId);
    onViewChange(viewId);
    
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleLogout = () => {
    // This will be handled by the user store
    console.log('Logout requested');
    // You can add logout logic here or call a function from the parent
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={onClose} // Close sidebar when overlay is clicked
            />
            
            {/* Mobile Sidebar */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="md:hidden fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl z-50 border-r border-green-200"
              style={{ display: isOpen ? 'block' : 'none' }} // Additional safety
            >
              <div className="p-6"> {/* Removed pt-20 since we're positioning below header */}
                                 {/* Greeting Section */}
                 <div className="mb-8 text-center">
                   <h2 className="text-3xl font-bold text-gray-800 mb-2">{t('hello')}</h2>
                   <h3 className="text-xl text-gray-600">{getDisplayName().split(' ')[0] || 'Farmer'}</h3>
                 </div>
                
                <nav className="space-y-4">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => {
                          handleViewChange(item.id);
                          onClose(); // Close sidebar after navigation
                        }}
                        className={`w-full p-4 rounded-2xl text-left transition-all duration-300 ${
                          isActive 
                            ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg' 
                            : 'bg-green-50 hover:bg-green-100 text-gray-700'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isActive ? 'bg-white/20' : item.bgColor
                          }`}>
                            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{item.label}</h3>
                            <p className={`text-sm ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`hidden md:flex flex-col bg-gradient-to-br from-green-50/95 to-emerald-50/95 backdrop-blur-sm border-r border-green-200 shadow-xl transition-all duration-300 ${
              isCollapsed ? 'w-20' : 'w-80'
            }`}
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.5 }}
            style={{ display: isOpen ? 'flex' : 'none' }} // Additional safety
          >
            {/* Header */}
            <div className="p-6 border-b border-green-200"> {/* Removed pt-20 since we're positioning below header */}
              <div className="flex items-center justify-between">
                {!isCollapsed && (
                                     <div className="text-center flex-1">
                     <motion.h2 
                       className="text-3xl font-bold text-gray-800 mb-2"
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       transition={{ delay: 0.2 }}
                     >
                       {t('hello')}
                     </motion.h2>
                     <motion.h3 
                       className="text-xl text-gray-600"
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       transition={{ delay: 0.3 }}
                     >
                       {getDisplayName().split(' ')[0] || 'Farmer'}
                     </motion.h3>
                   </div>
                )}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center hover:bg-green-200 transition-colors"
                >
                  {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-6 space-y-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleViewChange(item.id)}
                                            className={`w-full p-4 rounded-2xl text-left transition-all duration-300 ${
                          isActive 
                            ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg' 
                            : 'bg-green-50 hover:bg-green-100 text-gray-700'
                        }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + navigationItems.indexOf(item) * 0.1 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-white/20' : item.bgColor
                      }`}>
                        <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      {!isCollapsed && (
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.label}</h3>
                          <p className={`text-sm ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                            {item.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-green-200">
              <div className="space-y-4">
                <button
                  onClick={() => handleViewChange('profile')}
                  className="w-full p-3 bg-green-100 rounded-xl flex items-center gap-3 hover:bg-green-200 transition-colors text-green-700"
                >
                  <User className="w-5 h-5" />
                  {!isCollapsed && <span>Profile</span>}
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full p-3 bg-red-50 rounded-xl flex items-center gap-3 hover:bg-red-100 transition-colors text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                  {!isCollapsed && <span>Logout</span>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
