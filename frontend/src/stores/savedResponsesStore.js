import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSavedResponsesStore = create(
  persist(
    (set, get) => ({
      savedResponses: [],
      
      // Add a new response
      addResponse: (response) => {
        const newResponse = {
          id: Date.now().toString(),
          title: response.title || 'Farming Response',
          category: response.category || 'General',
          content: response.content,
          timestamp: new Date().toISOString(),
          type: response.type || 'text',
          tags: response.tags || [],
          rating: response.rating || 5,
          savedAt: new Date().toISOString(),
          queryType: response.queryType || 'text',
          userQuery: response.userQuery || ''
        };
        
        set((state) => ({
          savedResponses: [newResponse, ...state.savedResponses]
        }));
        
        return newResponse;
      },
      
      // Remove a response
      removeResponse: (id) => {
        set((state) => ({
          savedResponses: state.savedResponses.filter(response => response.id !== id)
        }));
      },
      
      // Update a response
      updateResponse: (id, updates) => {
        set((state) => ({
          savedResponses: state.savedResponses.map(response => 
            response.id === id ? { ...response, ...updates } : response
          )
        }));
      },
      
      // Get all responses
      getAllResponses: () => {
        return get().savedResponses;
      },
      
      // Get responses by category
      getResponsesByCategory: (category) => {
        return get().savedResponses.filter(response => response.category === category);
      },
      
      // Search responses
      searchResponses: (searchTerm) => {
        const responses = get().savedResponses;
        return responses.filter(response => 
          response.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          response.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          response.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
          response.userQuery.toLowerCase().includes(searchTerm.toLowerCase())
        );
      },
      
      // Get unique categories
      getCategories: () => {
        const responses = get().savedResponses;
        const categories = [...new Set(responses.map(response => response.category))];
        return categories.sort();
      },
      
      // Get unique tags
      getTags: () => {
        const responses = get().savedResponses;
        const allTags = responses.flatMap(response => response.tags);
        const uniqueTags = [...new Set(allTags)];
        return uniqueTags.sort();
      },
      
      // Clear all responses
      clearAllResponses: () => {
        set({ savedResponses: [] });
      }
    }),
    {
      name: 'krishi-bandhu-saved-responses',
      partialize: (state) => ({ savedResponses: state.savedResponses })
    }
  )
);

export default useSavedResponsesStore;
