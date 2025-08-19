import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional, Dict, Any, List
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class FirebaseService:
    """
    Service for handling Firebase operations:
    - User authentication
    - User profile management
    - Chat history storage
    """
    
    def __init__(self):
        self.db = None
        self.initialized = False
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Try to use service account key file
                service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
                if service_account_path and os.path.exists(service_account_path):
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase initialized with service account")
                else:
                    # Try to use environment variables
                    firebase_admin.initialize_app()
                    logger.info("Firebase initialized with default credentials")
                
                self.db = firestore.client()
                self.initialized = True
                logger.info("Firebase service initialized successfully")
            else:
                self.db = firestore.client()
                self.initialized = True
                logger.info("Firebase service already initialized")
                
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            self.initialized = False
    
    async def verify_user_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Firebase ID token and return user info
        
        Args:
            id_token: Firebase ID token from frontend
            
        Returns:
            User information or None if invalid
        """
        logger.info(f"FirebaseService: Verifying token: {id_token[:50]}...")
        logger.info(f"FirebaseService: Token length: {len(id_token)}")
        logger.info(f"FirebaseService: Firebase initialized: {self.initialized}")
        
        # Check if Firebase is initialized
        if not self.initialized:
            logger.error("FirebaseService: Firebase not initialized, cannot verify tokens")
            return None
            
        try:
            logger.info("FirebaseService: Attempting to verify Firebase token")
            decoded_token = auth.verify_id_token(id_token)
            user_id = decoded_token['uid']
            logger.info(f"FirebaseService: Token verified for user: {user_id}")
            
            # Get user profile from Firestore
            user_doc = self.db.collection('users').document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                logger.info(f"FirebaseService: Found user profile: {user_data}")
                
                # Return complete user profile for personalized responses
                complete_profile = {
                    'uid': user_id,
                    'email': decoded_token.get('email'),
                    **user_data  # Include all user data from Firestore
                }
                logger.info(f"FirebaseService: Returning complete user profile with {len(complete_profile)} fields")
                return complete_profile
            else:
                logger.info(f"FirebaseService: No user profile found, creating basic profile")
                # Create basic user profile if doesn't exist
                basic_profile = {
                    'uid': user_id,
                    'email': decoded_token.get('email'),
                    'displayName': decoded_token.get('name', 'Farmer'),
                    'createdAt': datetime.now().isoformat(),
                    'lastLogin': datetime.now().isoformat(),
                    'preferences': {
                        'language': 'en',
                        'notifications': True
                    }
                }
                
                # Save to Firestore
                self.db.collection('users').document(user_id).set(basic_profile)
                
                return {
                    'uid': user_id,
                    'email': decoded_token.get('email'),
                    'display_name': basic_profile['displayName'],
                    'location': {},
                    'farmingProfile': {},
                    'preferences': basic_profile['preferences'],
                    'created_at': basic_profile['createdAt'],
                    'last_login': basic_profile['lastLogin']
                }
                
        except Exception as e:
            logger.error(f"FirebaseService: Token verification failed: {e}")
            return None
    
    async def save_chat_message(self, user_id: str, chat_id: str, message: Dict[str, Any]) -> bool:
        """
        Save a chat message to Firestore
        
        Args:
            user_id: User ID
            chat_id: Chat session ID
            message: Message data
            
        Returns:
            True if saved successfully, False otherwise
        """
        if not self.initialized:
            logger.warning("Firebase not initialized, cannot save message")
            return False
            
        try:
            # Add timestamp if not present
            if 'timestamp' not in message:
                message['timestamp'] = datetime.now().isoformat()
            
            # Save to user's chat history
            chat_ref = self.db.collection('users').document(user_id).collection('chats').document(chat_id)
            
            # Get existing chat or create new one
            chat_doc = chat_ref.get()
            if chat_doc.exists:
                chat_data = chat_doc.to_dict()
                messages = chat_data.get('messages', [])
                messages.append(message)
                
                # Update chat
                chat_ref.update({
                    'messages': messages,
                    'lastUpdated': datetime.now().isoformat(),
                    'messageCount': len(messages)
                })
            else:
                # Create new chat
                chat_ref.set({
                    'chatId': chat_id,
                    'userId': user_id,
                    'createdAt': datetime.now().isoformat(),
                    'lastUpdated': datetime.now().isoformat(),
                    'messages': [message],
                    'messageCount': 1,
                    'type': message.get('type', 'text')
                })
            
            logger.info(f"Saved chat message for user {user_id}, chat {chat_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save chat message: {e}")
            return False
    
    async def get_user_chat_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get user's chat history
        
        Args:
            user_id: User ID
            limit: Maximum number of chats to return
            
        Returns:
            List of chat sessions
        """
        if not self.initialized:
            logger.warning("Firebase not initialized, cannot get chat history")
            return []
            
        try:
            chats_ref = self.db.collection('users').document(user_id).collection('chats')
            chats = chats_ref.order_by('lastUpdated', direction=firestore.Query.DESCENDING).limit(limit).stream()
            
            chat_list = []
            for chat in chats:
                chat_data = chat.to_dict()
                chat_list.append(chat_data)
            
            logger.info(f"Retrieved {len(chat_list)} chats for user {user_id}")
            return chat_list
            
        except Exception as e:
            logger.error(f"Failed to get chat history: {e}")
            return []
    
    async def get_chat_messages(self, user_id: str, chat_id: str) -> List[Dict[str, Any]]:
        """
        Get messages for a specific chat
        
        Args:
            user_id: User ID
            chat_id: Chat session ID
            
        Returns:
            List of messages
        """
        if not self.initialized:
            logger.warning("Firebase not initialized, cannot get chat messages")
            return []
            
        try:
            chat_ref = self.db.collection('users').document(user_id).collection('chats').document(chat_id)
            chat_doc = chat_ref.get()
            
            if chat_doc.exists:
                chat_data = chat_doc.to_dict()
                return chat_data.get('messages', [])
            else:
                return []
                
        except Exception as e:
            logger.error(f"Failed to get chat messages: {e}")
            return []
    
    async def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update user profile
        
        Args:
            user_id: User ID
            updates: Profile updates
            
        Returns:
            True if updated successfully, False otherwise
        """
        if not self.initialized:
            logger.warning("Firebase not initialized, cannot update profile")
            return False
            
        try:
            # Add last updated timestamp
            updates['lastUpdated'] = datetime.now().isoformat()
            
            user_ref = self.db.collection('users').document(user_id)
            user_ref.update(updates)
            
            logger.info(f"Updated profile for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update user profile: {e}")
            return False
    
    async def delete_chat(self, user_id: str, chat_id: str) -> bool:
        """
        Delete a chat session
        
        Args:
            user_id: User ID
            chat_id: Chat session ID
            
        Returns:
            True if deleted successfully, False otherwise
        """
        if not self.initialized:
            logger.warning("Firebase not initialized, cannot delete chat")
            return False
            
        try:
            chat_ref = self.db.collection('users').document(user_id).collection('chats').document(chat_id)
            chat_ref.delete()
            
            logger.info(f"Deleted chat {chat_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete chat: {e}")
            return False
    
    async def clear_user_chat_history(self, user_id: str) -> bool:
        """
        Clear all chat history for a user
        
        Args:
            user_id: User ID
            
        Returns:
            True if cleared successfully, False otherwise
        """
        if not self.initialized:
            logger.warning("Firebase not initialized, cannot clear chat history")
            return False
            
        try:
            chats_ref = self.db.collection('users').document(user_id).collection('chats')
            chats = chats_ref.stream()
            
            # Delete all chat documents
            for chat in chats:
                chat.reference.delete()
            
            logger.info(f"Cleared chat history for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear chat history: {e}")
            return False

# Global Firebase service instance
firebase_service = FirebaseService()
