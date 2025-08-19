import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, setDoc, getDoc, collection, query, where, orderBy, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

const useChatStore = create(
  persist(
    (set, get) => ({
      // Chat state
      chatHistory: [],
      currentChat: null,
      isLoading: false,
      messages: {}, // Initialize messages object to store messages by chatId
      
      // Initialize messages structure if it doesn't exist
      initializeMessages: () => set(state => ({
        messages: state.messages || {}
      })),

      // Chat actions
      addChatMessage: async (chatId, messageData) => {
        try {
          const user = auth.currentUser;
          if (!user) {
            console.error('No authenticated user found');
            return null;
          }

          const messageRef = doc(collection(db, 'messages'));
          // Handle both message structures (from App.js and direct calls)
          const message = {
            id: messageRef.id,
            chat_id: chatId,
            user_id: messageData.user_id || user.uid,
            content: messageData.content,
            type: messageData.type || 'text',
            audio_url: messageData.audio_url || null,
            image_url: messageData.image_url || null,
            timestamp: serverTimestamp(),
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            // Preserve any additional metadata from App.js
            ...(messageData.metadata && { metadata: messageData.metadata }),
            // Add a flag to identify AI responses
            is_ai_response: messageData.metadata?.is_ai_response || false
          };

          // Try to save to Firestore first
          try {
            await setDoc(messageRef, message);
            console.log('✅ Message saved to Firestore successfully');
          } catch (firestoreError) {
            console.warn('⚠️ Firestore save failed, falling back to local storage:', firestoreError.message);
            
            // Fallback: Save to local storage
            const localMessage = {
              ...message,
              timestamp: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            // Update local state
            set(state => ({
              messages: {
                ...(state.messages || {}),
                [chatId]: [...((state.messages && state.messages[chatId]) || []), localMessage]
              }
            }));
            
            return localMessage;
          }

          // Update local state
          set(state => ({
            messages: {
              ...(state.messages || {}),
              [chatId]: [...((state.messages && state.messages[chatId]) || []), message]
            }
          }));

          return message;
        } catch (error) {
          console.error('Error adding chat message:', error);
          return null;
        }
      },
      
      setCurrentChat: (chatId) => set({ currentChat: chatId }),
      
      updateChatMessage: (messageId, updates) => set((state) => ({
        chatHistory: state.chatHistory.map(chat => ({
          ...chat,
          messages: chat.messages?.map(msg => 
            msg.id === messageId ? { ...msg, ...updates } : msg
          ) || []
        }))
      })),
      
      deleteChatMessage: (chatId) => set((state) => ({
        chatHistory: state.chatHistory.filter(chat => chat.id !== chatId),
        currentChat: state.currentChat === chatId ? null : state.currentChat
      })),
      
      clearChatHistory: () => set({ chatHistory: [], currentChat: null }),
      
      // Chat session management
      startNewChat: () => {
        // Initialize messages structure if needed
        const { messages } = get();
        if (!messages) {
          set({ messages: {} });
        }
        
        const chatId = `chat_${Date.now()}`;
        const newChat = {
          id: chatId,
          timestamp: new Date().toISOString(),
          messages: [],
          type: 'new'
        };
        
        set((state) => ({
          chatHistory: [...state.chatHistory, newChat],
          currentChat: chatId
        }));
        
        return chatId;
      },
      
      addMessageToCurrentChat: (message) => {
        const { currentChat, chatHistory } = get();
        if (!currentChat) return;
        
        const updatedHistory = chatHistory.map(chat => {
          if (chat.id === currentChat) {
            return {
              ...chat,
              messages: [...(chat.messages || []), message]
            };
          }
          return chat;
        });
        
        set({ chatHistory: updatedHistory });
      },
      
      // Helper methods
      getCurrentChat: () => {
        const { currentChat, chatHistory } = get();
        return chatHistory.find(chat => chat.id === currentChat);
      },
      
      getChatById: (chatId) => {
        const { chatHistory } = get();
        return chatHistory.find(chat => chat.id === chatId);
      },
      
      getRecentChats: (limit = 10) => {
        const { chatHistory } = get();
        return chatHistory
          .filter(chat => chat.messages && chat.messages.length > 0)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, limit);
      },

      // Get all chats (for ChatHistory component)
      getChats: () => {
        const { chatHistory } = get();
        return chatHistory;
      },

      // Get chats for a specific user
      getUserChats: (userId) => {
        const { chatHistory } = get();
        return chatHistory.filter(chat => chat.user_id === userId);
      },

      // Get messages for a specific chat
      getChatMessages: (chatId) => {
        const { messages } = get();
        return (messages && messages[chatId]) || [];
      },

      // Get messages for a specific chat with filtering
      getChatMessagesFiltered: (chatId, options = {}) => {
        const { messages } = get();
        let chatMessages = (messages && messages[chatId]) || [];
        
        // Filter by type if specified
        if (options.type) {
          chatMessages = chatMessages.filter(msg => msg.type === options.type);
        }
        
        // Filter by user if specified
        if (options.user_id) {
          chatMessages = chatMessages.filter(msg => msg.user_id === options.user_id);
        }
        
        // Sort by timestamp (newest first)
        chatMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return chatMessages;
      },

      // Delete a specific chat
      deleteChat: (chatId) => {
        // Use the Firestore method
        get().deleteChatFromFirestore(chatId);
      },

      // Clear all chats
      clearChats: () => {
        set({ chatHistory: [], currentChat: null, messages: {} });
      },

      // Clear messages for a specific chat
      clearChatMessages: (chatId) => set(state => ({
        messages: {
          ...(state.messages || {}),
          [chatId]: []
        }
      })),
      
      // Message types
      createMessage: (type, content, metadata = {}) => ({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type, // 'text', 'voice', 'image', 'response'
        content,
        timestamp: new Date().toISOString(),
        metadata,
        status: 'sent'
      }),
      
      // Loading states
      setLoading: (loading) => set({ isLoading: loading }),
      
      // Load chats from Firestore
      loadUserChats: async (userId) => {
        if (!userId) return;
        
        try {
          const chatsQuery = query(
            collection(db, 'chats'),
            where('user_id', '==', userId),
            where('deleted', '!=', true),
            orderBy('updatedAt', 'desc')
          );
          
          const querySnapshot = await getDocs(chatsQuery);
          const chats = [];
          
          querySnapshot.forEach((doc) => {
            chats.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          set({ chatHistory: chats });
        } catch (error) {
          console.error('Error loading user chats:', error);
        }
      },
      
      // Delete chat from Firestore
      deleteChatFromFirestore: async (chatId) => {
        try {
          await updateDoc(doc(db, 'chats', chatId), {
            deleted: true,
            deletedAt: serverTimestamp()
          });
          
          // Update local state
          const { chatHistory, currentChat } = get();
          const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
          const newCurrentChat = currentChat === chatId ? null : currentChat;
          
          set({ 
            chatHistory: updatedHistory,
            currentChat: newCurrentChat
          });
        } catch (error) {
          console.error('Error deleting chat from Firestore:', error);
          // Fallback to local deletion
          const { chatHistory, currentChat } = get();
          const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
          const newCurrentChat = currentChat === chatId ? null : currentChat;
          
          set({ 
            chatHistory: updatedHistory,
            currentChat: newCurrentChat
          });
        }
      }
    }),
    {
      name: 'krishi-bandhu-chat-storage',
      partialize: (state) => ({ 
        chatHistory: state.chatHistory,
        currentChat: state.currentChat,
        messages: state.messages
      }),
    }
  )
);

export default useChatStore;
