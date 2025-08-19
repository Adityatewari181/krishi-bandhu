#!/usr/bin/env python3
"""
🌾 General Agriculture Agent - Comprehensive & Smart

A general agent that:
- Handles greetings and non-agricultural queries
- Provides comprehensive agricultural advice
- Uses LLM for intelligent responses
- Maintains farmer-friendly communication
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from services.llm_service import LLMService

logger = logging.getLogger(__name__)

class GeneralAgent:
    """
    General agricultural advice agent
    """
    
    def __init__(self):
        self.llm_service = LLMService()
        
        logger.info("🌾 General Agriculture Agent initialized")
    
    def _is_greeting(self, query: str) -> bool:
        """Check if query is a greeting"""
        greetings = [
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
            "namaste", "namaskar", "kaise ho", "kya haal hai", "how are you",
            "welcome", "thanks", "thank you", "dhanyawad"
        ]
        query_lower = query.lower()
        return any(greeting in query_lower for greeting in greetings)
    
    def _is_non_agricultural(self, query: str) -> bool:
        """Check if query is non-agricultural"""
        non_agri_keywords = [
            "cricket", "movie", "music", "politics", "sports", "entertainment",
            "technology", "computer", "mobile", "internet", "social media",
            "cooking", "recipe", "food", "restaurant", "travel", "tourism"
        ]
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in non_agri_keywords)
    
    async def _generate_greeting_response(self, query: str, user_profile: Dict, language: str = "en") -> str:
        """Generate personalized greeting response"""
        try:
            # Set language-specific instructions
            if language == "hi":
                language_instruction = "RESPOND IN HINDI ONLY. Use simple Hindi that farmers can understand easily."
            else:
                language_instruction = "RESPOND IN ENGLISH ONLY. Use simple English that farmers can understand easily."
            
            greeting_prompt = f"""
            You are a friendly agricultural AI assistant. Generate a warm, personalized greeting response:

            {language_instruction}

            USER QUERY: {query}
            USER PROFILE: {json.dumps(user_profile, indent=2, default=str)}

            Create a friendly greeting that:
            1. Responds warmly to the user's greeting
            2. Mentions their name if available
            3. Shows interest in their farming activities
            4. Offers help with agricultural queries
            5. Uses simple, friendly language
            6. Is culturally appropriate for Indian farmers

            Keep the response concise and welcoming.
            """
            
            response = await self.llm_service.get_completion(greeting_prompt)
            return response
            
        except Exception as e:
            logger.error(f"Greeting response generation error: {e}")
            return "Hello! I'm your agricultural assistant. How can I help you with farming today?"
    
    async def _generate_non_agricultural_response(self, query: str, language: str = "en") -> str:
        """Generate response for non-agricultural queries"""
        try:
            # Set language-specific instructions
            if language == "hi":
                language_instruction = "RESPOND IN HINDI ONLY. Use simple Hindi that farmers can understand easily."
            else:
                language_instruction = "RESPOND IN ENGLISH ONLY. Use simple English that farmers can understand easily."
            
            non_agri_prompt = f"""
            You are an agricultural AI assistant. The user has asked a non-agricultural question:

            {language_instruction}

            USER QUERY: {query}

            Politely redirect them to agricultural topics. Your response should:
            1. Acknowledge their question politely
            2. Explain that you're specialized in agriculture
            3. Offer to help with farming-related questions
            4. Suggest some agricultural topics they might be interested in
            5. Keep the tone friendly and helpful

            Keep the response concise and encouraging.
            """
            
            response = await self.llm_service.get_completion(non_agri_prompt)
            return response
            
        except Exception as e:
            logger.error(f"Non-agricultural response generation error: {e}")
            return "I'm specialized in agricultural advice. How can I help you with farming, weather, crop management, or government schemes?"
    
    async def _generate_agricultural_advice(self, query: str, context: Dict[str, Any], language: str = "en") -> str:
        """Generate comprehensive agricultural advice using LLM"""
        try:
            # Get user context for personalization
            user_profile = context.get('user_profile', {})
            user_name = user_profile.get('firstName', 'Farmer')
            user_crops = user_profile.get('agricultureSpecific', {}).get('currentCrops', [])
            user_location = context.get('location', '')
            
            # Set language-specific instructions
            if language == "hi":
                language_instruction = "RESPOND IN HINDI ONLY. Use simple Hindi that farmers can understand easily."
            else:
                language_instruction = "RESPOND IN ENGLISH ONLY. Use simple English that farmers can understand easily."
            
            advice_prompt = f"""
            You are a friendly farming assistant talking directly to {user_name}. Provide natural, conversational advice:

            {language_instruction}

            USER QUERY: {query}
            USER CONTEXT: 
            - Name: {user_name}
            - Location: {user_location}
            - Current Crops: {', '.join(user_crops) if user_crops else 'Not specified'}
            - Season: {user_profile.get('agricultureSpecific', {}).get('season', 'Not specified')}

            Create a NATURAL response (under 150 words) that:
            1. **Talks directly to {user_name} like a friend** (no formal language)
            2. **Directly answers the question** in 1-2 sentences
            3. **References their specific crops** if relevant
            4. **Provides 2-3 key actionable points**
            5. **Uses simple, everyday language**
            6. **Ends naturally** (no formal closings)
            7. **Sounds like a helpful farming friend, not a business advisor**

            Format: Direct answer → Key points → Natural ending
            Tone: Friendly, casual, and helpful - like talking to a farming buddy.
            DO NOT use formal business language or signatures.
            """
            
            response = await self.llm_service.get_completion(advice_prompt)
            return response
            
        except Exception as e:
            logger.error(f"Agricultural advice generation error: {e}")
            return "I'm here to help with your farming questions. Could you please provide more details about your specific agricultural concern?"
    
    async def get_agricultural_advice(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main interface method - handles all types of queries
        """
        try:
            start_time = datetime.now()
            
            query = context.get('query', '')
            user_profile = context.get('user_profile', {})
            
            # Determine query type and generate appropriate response
            language = context.get('language', 'en')
            if self._is_greeting(query):
                response = await self._generate_greeting_response(query, user_profile, language)
                query_type = "greeting"
            elif self._is_non_agricultural(query):
                response = await self._generate_non_agricultural_response(query, language)
                query_type = "non_agricultural"
            else:
                language = context.get('language', 'en')
                response = await self._generate_agricultural_advice(query, context, language)
                query_type = "agricultural"
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "agricultural_advice": {
                    "query_type": query_type,
                    "crop_type": context.get('crop', ''),
                    "location": context.get('location', ''),
                    "advice_category": query_type
                },
                "response": response,
                "confidence": 0.9,
                "processing_time": processing_time,
                "query_type": query_type
            }
            
        except Exception as e:
            logger.error(f"General Agriculture Agent error: {e}")
            return {
                "agricultural_advice": {},
                "response": "I'm here to help with your agricultural questions. Please try asking again.",
                "confidence": 0.0,
                "error": str(e),
                "processing_time": 0.0
            }

# Global general agriculture agent instance
real_general_agent = GeneralAgent()
