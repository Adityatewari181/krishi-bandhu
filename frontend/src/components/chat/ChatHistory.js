import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../../stores/chatStore';
import useUserStore from '../../stores/userStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  MessageCircle, 
  Image as ImageIcon, 
  Mic, 
  FileText, 
  Trash2, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  TrendingUp, 
  BarChart3,
  X,
  ArrowRight
} from 'lucide-react';

const ChatHistory = ({ onSelectChat, onClose }) => {
  const { getUserChats, deleteChat, clearChats } = useChatStore();
  const { getUserId } = useUserStore();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Get current user ID
  const currentUserId = getUserId();
  
  // Get only the current user's chats
  const userChats = getUserChats(currentUserId);
  
  // Get recent chats with messages
  const recentChats = userChats
    .filter(chat => chat.messages && chat.messages.length > 0)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);
  
  const filteredChats = recentChats.filter(chat => {
    const matchesSearch = chat.messages?.some(msg => 
      msg.content?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || chat.id.includes(searchTerm);
    
    const matchesFilter = filterType === 'all' || 
      chat.messages?.some(msg => msg.type === filterType);
    
    return matchesSearch && matchesFilter;
  });

  const getChatPreview = (chat) => {
    if (!chat.messages || chat.messages.length === 0) return t('no_messages');
    
    const lastMessage = chat.messages[chat.messages.length - 1];
    const content = lastMessage.content || '';
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  const getChatIcon = (chat) => {
    if (!chat.messages || chat.messages.length === 0) return MessageCircle;
    
    const lastMessage = chat.messages[chat.messages.length - 1];
    switch (lastMessage.type) {
      case 'voice': return Mic;
      case 'image': return ImageIcon;
      case 'text': return FileText;
      case 'response': return MessageCircle;
      default: return MessageCircle;
    }
  };

  const getChatColor = (chat) => {
    if (!chat.messages || chat.messages.length === 0) return 'from-gray-400 to-gray-500';
    
    const lastMessage = chat.messages[chat.messages.length - 1];
    switch (lastMessage.type) {
      case 'voice': return 'from-purple-400 to-purple-500';
      case 'image': return 'from-green-400 to-green-500';
      case 'text': return 'from-blue-400 to-blue-500';
      case 'response': return 'from-orange-400 to-orange-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getChatTypeLabel = (chat) => {
    if (!chat.messages || chat.messages.length === 0) return t('empty');
    
    const types = [...new Set(chat.messages.map(msg => msg.type))];
    if (types.includes('voice')) return t('voice_query');
    if (types.includes('image')) return t('image_query');
    if (types.includes('text')) return t('text_query');
    return t('mixed_query');
  };

  const handleSelectChat = (chatId) => {
    onSelectChat(chatId);
  };

  const handleDeleteChat = (chatId) => {
    if (window.confirm(t('delete_chat_confirm'))) {
      deleteChat(chatId);
    }
  };

  const handleClearHistory = () => {
    clearChats();
    setShowConfirmClear(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -300 }}
             className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl border-r border-green-200 z-40 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t('chat_history')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-sm text-white/80">
          {recentChats.length} conversations
        </div>
      </div>

             {/* Search and Filter */}
       <div className="p-4 border-b border-green-200 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
          >
            <option value="all">All Types</option>
            <option value="text">Text</option>
            <option value="voice">Voice</option>
            <option value="image">Image</option>
            <option value="response">Responses</option>
          </select>
          
          <button
            onClick={() => setShowConfirmClear(true)}
            className="px-3 py-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">{t('no_conversations_found')}</p>
            <p className="text-sm">
              {searchTerm || filterType !== 'all' 
                ? t('try_adjusting_search_filters')
                : t('start_new_conversation_to_see_here')
              }
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredChats.map((chat) => {
              const Icon = getChatIcon(chat);
              const colorClass = getChatColor(chat);
              
              return (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                                     className="group cursor-pointer p-4 bg-green-50 hover:bg-green-100 rounded-2xl border border-green-200 hover:border-green-300 transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${colorClass} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">
                            {getChatTypeLabel(chat)}
                          </span>
                                                     <span className="text-xs text-green-700 bg-green-200 px-2 py-1 rounded-full">
                            {chat.messages?.length || 0} msgs
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(chat.timestamp)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2 group-hover:text-gray-800 transition-colors">
                        {getChatPreview(chat)}
                      </p>
                      
                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleSelectChat(chat.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Chat
                        </button>
                        <span className="text-gray-300">•</span>
                        <button 
                          onClick={() => handleDeleteChat(chat.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Clear Dialog */}
      <AnimatePresence>
        {showConfirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center">
                <Trash2 className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {t('clear_chat_history_question')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('clear_chat_history_warning')}
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChatHistory;
