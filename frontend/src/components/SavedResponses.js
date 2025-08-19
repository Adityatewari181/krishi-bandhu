import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import useSavedResponsesStore from '../stores/savedResponsesStore';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MessageCircle,
  Image as ImageIcon,
  Mic,
  FileText,
  Star,
  Share2,
  Download,
  Trash2,
  Plus,
  ArrowLeft,
  X
} from 'lucide-react';

const SavedResponses = ({ onBackToQuery, user }) => {
  const { t } = useLanguage();
  const { 
    savedResponses, 
    removeResponse, 
    getCategories, 
    searchResponses,
    addResponse,
    clearAllResponses
  } = useSavedResponsesStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showAddResponse, setShowAddResponse] = useState(false);

  // Get categories from store
  const categories = ['all', ...getCategories()];

  const filteredResponses = searchTerm 
    ? searchResponses(searchTerm).filter(response => 
        filterCategory === 'all' || response.category === filterCategory
      )
    : savedResponses.filter(response => 
        filterCategory === 'all' || response.category === filterCategory
      );

  const sortedResponses = [...filteredResponses].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        try {
          const dateA = new Date(a.savedAt);
          const dateB = new Date(b.savedAt);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          return dateB - dateA;
        } catch (error) {
          return 0;
        }
      case 'oldest':
        try {
          const dateA = new Date(a.savedAt);
          const dateB = new Date(b.savedAt);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          return dateA - dateB;
        } catch (error) {
          return 0;
        }
      case 'rating':
        return b.rating - a.rating;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const handleDeleteResponse = (id) => {
    if (window.confirm('Are you sure you want to delete this saved response?')) {
      removeResponse(id);
    }
  };

  const handleAddResponse = () => {
    setShowAddResponse(true);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all saved responses? This action cannot be undone.')) {
      clearAllResponses();
    }
  };

  const formatDate = (date) => {
    try {
      // Handle both string and Date objects
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Plant Disease': 'from-red-500 to-pink-500',
      'Planting': 'from-green-500 to-emerald-500',
      'Pest Control': 'from-purple-500 to-indigo-500',
      'Weather': 'from-blue-500 to-cyan-500',
      'Soil': 'from-amber-500 to-orange-500',
      'Harvesting': 'from-yellow-500 to-amber-500',
      'Irrigation': 'from-teal-500 to-blue-500'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'voice': return Mic;
      case 'image': return ImageIcon;
      case 'text': return FileText;
      default: return MessageCircle;
    }
  };

  if (selectedResponse) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full"
      >
        {/* Response Detail View */}
        <div className="bg-white rounded-2xl shadow-lg p-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedResponse(null)}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Responses
            </button>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Response Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{selectedResponse.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className={`px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(selectedResponse.category)} text-white text-xs font-medium`}>
                  {selectedResponse.category}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(selectedResponse.savedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  {selectedResponse.rating}/5
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
              <p className="text-gray-700 leading-relaxed text-lg">{selectedResponse.content}</p>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedResponse.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Saved Responses</h1>
          <p className="text-gray-600">Your personalized farming knowledge library</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToQuery}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            Ask New Question
          </button>
          <button
            onClick={handleAddResponse}
            className="p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          {savedResponses.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
              title="Clear all responses"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search responses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="rating">Highest Rated</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Responses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedResponses.map((response) => {
          const TypeIcon = getTypeIcon(response.type);
          return (
            <motion.div
              key={response.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-200"
              onClick={() => setSelectedResponse(response)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${getCategoryColor(response.category)} rounded-xl flex items-center justify-center`}>
                  <TypeIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium text-gray-700">{response.rating}</span>
                </div>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                {response.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {response.content}
              </p>

              {/* Footer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(response.category)} text-white text-xs font-medium`}>
                    {response.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(response.savedAt)}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {response.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                  {response.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      +{response.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {sortedResponses.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Saved Responses</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterCategory !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Start asking questions to build your farming knowledge library'
            }
          </p>
          {!searchTerm && filterCategory === 'all' && (
            <button
              onClick={onBackToQuery}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              Ask Your First Question
            </button>
          )}
        </div>
      )}

      {/* Add Response Modal */}
      <AnimatePresence>
        {showAddResponse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Add New Response</h3>
                <button
                  onClick={() => setShowAddResponse(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="newTitle"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                    placeholder="Enter a descriptive title"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    id="newCategory"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  >
                    <option value="">Select a category</option>
                    {categories.filter(cat => cat !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content *
                  </label>
                  <textarea
                    id="newContent"
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 resize-none"
                    placeholder="Enter the farming advice or response content"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="newTags"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                    placeholder="e.g., wheat, disease, organic, spring"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowAddResponse(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const title = document.getElementById('newTitle').value.trim();
                    const category = document.getElementById('newCategory').value;
                    const content = document.getElementById('newContent').value.trim();
                    const tags = document.getElementById('newTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
                    
                    if (!title || !category || !content) {
                      alert('Please fill in all required fields');
                      return;
                    }
                    
                    addResponse({
                      title,
                      category,
                      content,
                      tags,
                      type: 'text',
                      queryType: 'manual'
                    });
                    
                    setShowAddResponse(false);
                    alert('Response added successfully!');
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Add Response
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SavedResponses;
