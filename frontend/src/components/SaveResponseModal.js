import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  X, 
  Tag, 
  BookOpen, 
  Plus, 
  Check,
  Star
} from 'lucide-react';

const SaveResponseModal = ({ isOpen, onClose, responseContent, userQuery, queryType, onSave }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [rating, setRating] = useState(5);
  const [customCategory, setCustomCategory] = useState('');

  // Predefined categories
  const predefinedCategories = [
    'Plant Disease',
    'Planting',
    'Pest Control',
    'Weather',
    'Soil',
    'Harvesting',
    'Irrigation',
    'Fertilizer',
    'Crop Management',
    'General'
  ];

  // Auto-generate title and category based on content
  useEffect(() => {
    if (responseContent && !title) {
      // Generate title from first sentence
      const firstSentence = responseContent.split('.')[0];
      if (firstSentence.length > 10) {
        setTitle(firstSentence.substring(0, 50) + (firstSentence.length > 50 ? '...' : ''));
      } else {
        setTitle('Farming Response');
      }
    }

    // Auto-detect category based on content
    if (responseContent && !category) {
      const content = responseContent.toLowerCase();
      if (content.includes('disease') || content.includes('sick') || content.includes('fungus')) {
        setCategory('Plant Disease');
      } else if (content.includes('plant') || content.includes('seed') || content.includes('grow')) {
        setCategory('Planting');
      } else if (content.includes('pest') || content.includes('insect') || content.includes('bug')) {
        setCategory('Pest Control');
      } else if (content.includes('weather') || content.includes('rain') || content.includes('sun')) {
        setCategory('Weather');
      } else if (content.includes('soil') || content.includes('dirt') || content.includes('ph')) {
        setCategory('Soil');
      } else if (content.includes('harvest') || content.includes('pick') || content.includes('collect')) {
        setCategory('Harvesting');
      } else if (content.includes('water') || content.includes('irrigate') || content.includes('moisture')) {
        setCategory('Irrigation');
      } else if (content.includes('fertilizer') || content.includes('nutrient') || content.includes('feed')) {
        setCategory('Fertilizer');
      } else {
        setCategory('General');
      }
    }

    // Auto-generate tags based on content
    if (responseContent && tags.length === 0) {
      const content = responseContent.toLowerCase();
      const autoTags = [];
      
      // Common farming terms
      const farmingTerms = [
        'wheat', 'rice', 'corn', 'tomato', 'potato', 'onion', 'garlic',
        'organic', 'natural', 'chemical', 'pesticide', 'fungicide',
        'spring', 'summer', 'autumn', 'winter', 'seasonal',
        'drainage', 'spacing', 'rotation', 'companion', 'mulch'
      ];
      
      farmingTerms.forEach(term => {
        if (content.includes(term)) {
          autoTags.push(term);
        }
      });
      
      // Add user query terms as tags
      if (userQuery) {
        const queryWords = userQuery.toLowerCase().split(' ').filter(word => word.length > 3);
        queryWords.forEach(word => {
          if (!autoTags.includes(word) && autoTags.length < 5) {
            autoTags.push(word);
          }
        });
      }
      
      setTags(autoTags);
    }
  }, [responseContent, userQuery, title, category, tags]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (!title.trim() || !category.trim()) {
      alert(t('please_provide_title_category'));
      return;
    }

    const responseData = {
      title: title.trim(),
      category: category === 'Custom' ? customCategory.trim() : category,
      content: responseContent,
      type: queryType || 'text',
      tags: tags,
      rating: rating,
      queryType: queryType || 'text',
      userQuery: userQuery || ''
    };

    onSave(responseData);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (e.target.name === 'newTag') {
        handleAddTag();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('save_response')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('response_preview')}</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
              <p className="text-gray-700 text-sm">
                {responseContent?.substring(0, 200)}
                {responseContent && responseContent.length > 200 ? '...' : ''}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('title')} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                placeholder={t('enter_descriptive_title')}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('category')} *
              </label>
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                >
                  <option value="">{t('select_category')}</option>
                  {predefinedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Custom">{t('custom_category')}</option>
                </select>
              </div>
              
              {category === 'Custom' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  placeholder={t('enter_custom_category')}
                />
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tags')}
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  name="newTag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  placeholder={t('add_tag')}
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* Display tags */}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                  >
                    <Tag className="w-4 h-4" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-green-600 hover:text-green-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('rating')}
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-2 rounded-lg transition-colors ${
                      star <= rating 
                        ? 'text-yellow-500 bg-yellow-50' 
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Check className="w-5 h-5 inline mr-2" />
              {t('save_response')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SaveResponseModal;
