# Fixed main.py for Krishi Bandhu Backend

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import logging
import asyncio
import os
from dotenv import load_dotenv
from datetime import datetime

# Import services
from services.llm_service import llm_service
from services.voice_service import voice_service
from services.firebase_service import firebase_service
from services.tts_service import tts_service

# Import agents
from agents.real_orchestrator import real_orchestrator

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Krishi Bandhu API",
    description="AI-powered farming assistant with multimodal capabilities",
    version="1.0.0"
)

# Mount static files for audio responses
# Use absolute path to ensure correct directory regardless of startup location
import os
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BACKEND_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)  # Ensure static directory exists

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Important: Allow specific headers for audio content
    expose_headers=["Content-Length", "Content-Type", "Accept-Ranges"],
)

# Pydantic models
class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
    error: Optional[str] = None

class QueryRequest(BaseModel):
    query: str
    language: str = "en"
    user_id: Optional[str] = None
    location: Optional[str] = None
    crop_type: Optional[str] = None

class ChatMessage(BaseModel):
    type: str
    content: str
    metadata: Optional[dict] = None

class ChatHistoryRequest(BaseModel):
    user_id: str
    limit: int = 50

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    location: Optional[str] = None
    crop_type: Optional[str] = None
    language: Optional[str] = None
    notifications: Optional[bool] = None

# Helper function to extract user preferences from enhanced signup profile
def extract_user_preferences(current_user: dict) -> tuple[str, str, list, str]:
    """
    Extract location, crop type, all crop types, and language from user profile.
    Handles both old and new enhanced signup structures.
    """
    # Extract location
    location = ''
    if current_user.get('location', {}).get('fullAddress'):
        location = current_user.get('location', {}).get('fullAddress')
    elif current_user.get('location', {}).get('village') and current_user.get('location', {}).get('district'):
        # Construct location from individual fields (new enhanced signup structure)
        loc_data = current_user.get('location', {})
        location = f"{loc_data.get('village', '')}, {loc_data.get('district', '')}, {loc_data.get('state', '')}"
    elif current_user.get('location', {}).get('village') and current_user.get('location', {}).get('city'):
        # Construct location from individual fields (old structure)
        loc_data = current_user.get('location', {})
        location = f"{loc_data.get('village', '')}, {loc_data.get('city', '')}, {loc_data.get('district', '')}, {loc_data.get('state', '')}"
    elif current_user.get('preferences', {}).get('location'):
        # Fallback to old preferences structure
        location = current_user.get('preferences', {}).get('location', '')
    
    # Extract crop type
    crop_type = ''
    if current_user.get('agricultureSpecific', {}).get('primaryCrop'):
        crop_type = current_user.get('agricultureSpecific', {}).get('primaryCrop')
    elif current_user.get('farmingProfile', {}).get('primaryCrop'):
        crop_type = current_user.get('farmingProfile', {}).get('primaryCrop')
    elif current_user.get('preferences', {}).get('cropType'):
        # Fallback to old preferences structure
        crop_type = current_user.get('preferences', {}).get('cropType', '')
    
    # Get all crop types for better context
    all_crop_types = []
    if current_user.get('agricultureSpecific', {}).get('currentCrops'):
        all_crop_types = current_user.get('agricultureSpecific', {}).get('currentCrops')
    elif current_user.get('farmingProfile', {}).get('cropTypes'):
        all_crop_types = current_user.get('farmingProfile', {}).get('cropTypes')
    elif current_user.get('farmingProfile', {}).get('allCropTypes'):
        all_crop_types = current_user.get('farmingProfile', {}).get('allCropTypes')
    
    # Extract language
    language = current_user.get('preferredLanguage', 'en') or current_user.get('preferences', {}).get('language', 'en')
    
    return location, crop_type, all_crop_types, language

# Authentication dependency
async def get_current_user(authorization: str = Header(None)):
    """Extract and verify user token from Authorization header"""
    logger.info(f"Authentication request - Authorization header: {authorization}")
    
    if not authorization:
        logger.error("No authorization header provided")
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        # Extract token from "Bearer <token>" format
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
        
        logger.info(f"Extracted token: {token[:50]}...")
        logger.info(f"Token length: {len(token)}")
        logger.info(f"Token starts with 'mock-token-': {token.startswith('mock-token-')}")
        
        # Verify token with Firebase
        user_info = await firebase_service.verify_user_token(token)
        if not user_info:
            logger.error(f"Token verification failed for token: {token[:50]}...")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        logger.info(f"Token verified successfully for user: {user_info.get('uid', 'unknown')}")
        return user_info
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Krishi Bandhu API is running"}

# Static files health check endpoint
@app.get("/health/static")
async def static_health_check():
    """Check if static file serving is working correctly"""
    try:
        # Check if static directory exists
        static_exists = os.path.exists(STATIC_DIR)
        audio_dir = os.path.join(STATIC_DIR, "audio")
        audio_exists = os.path.exists(audio_dir)
        
        # Count audio files
        audio_files = []
        if audio_exists:
            audio_files = [f for f in os.listdir(audio_dir) if f.endswith('.mp3')]
        
        return {
            "status": "healthy",
            "static_directory": STATIC_DIR,
            "static_exists": static_exists,
            "audio_directory": audio_dir,
            "audio_exists": audio_exists,
            "audio_files_count": len(audio_files),
            "sample_audio_files": audio_files[:3] if audio_files else [],
            "accessible_url_format": "/static/audio/{filename}",
            "test_urls": [f"/static/audio/{f}" for f in audio_files[:2]]
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "static_directory": STATIC_DIR if 'STATIC_DIR' in locals() else "Not defined"
        }

# Simple audio test endpoint
@app.get("/test/audio")
async def test_audio_generation():
    """Generate a test audio file"""
    try:
        test_text = "This is a test audio file. If you can hear this, audio is working correctly."
        audio_url = await tts_service.generate_audio_response(test_text, "en", "test_user")
        
        return {
            "status": "success" if audio_url else "failed",
            "audio_url": audio_url,
            "full_url": f"http://localhost:8000{audio_url}" if audio_url else None
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

# Finance Policy Agent API connectivity test endpoint
@app.get("/test/finance-policy-agent")
async def test_finance_policy_agent():
    """Test real finance policy agent API connectivity and identify issues"""
    try:
        from agents.real_finance_agent import real_finance_agent
        
        logger.info("🧪 Testing real finance policy agent API connectivity...")
        # Test with sample context
        test_context = {
            "user_id": "test_user",
            "query": "What government schemes are available for farmers?",
            "location": "punjab",
            "crop": "wheat"
        }
        test_results = await real_finance_agent.get_financial_advice(test_context)
        
        return {
            "status": "completed",
            "test_results": test_results,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Real finance policy agent test failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Market Price Agent API connectivity test endpoint
@app.get("/test/market-price-agent")
async def test_market_price_agent():
    """Test real market price agent API connectivity and identify issues"""
    try:
        from agents.real_market_agent import real_market_agent
        
        logger.info("🧪 Testing real market price agent API connectivity...")
        # Test with sample context
        test_context = {
            "user_id": "test_user",
            "query": "What are the current prices for wheat?",
            "location": "delhi",
            "crop": "wheat"
        }
        test_results = await real_market_agent.get_market_prices(test_context)
        
        return {
            "status": "completed",
            "test_results": test_results,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Real market price agent test failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Utility function to clean text for TTS
def clean_text_for_tts(text: str) -> str:
    """Clean text by removing formatting characters that shouldn't be spoken"""
    if not text:
        return text
    
    # Remove asterisks and other formatting characters
    import re
    cleaned = re.sub(r'\*+', '', text)  # Remove asterisks
    cleaned = re.sub(r'#+', '', cleaned)  # Remove hash symbols
    cleaned = re.sub(r'`+', '', cleaned)  # Remove backticks
    cleaned = re.sub(r'_{2,}', '', cleaned)  # Remove double underscores
    cleaned = re.sub(r'\n+', ' ', cleaned)  # Replace multiple newlines with single space
    cleaned = re.sub(r'\s+', ' ', cleaned)  # Replace multiple spaces with single space
    cleaned = cleaned.strip()  # Remove leading/trailing whitespace
    
    return cleaned

# Authentication endpoints
@app.post("/auth/verify")
async def verify_token(authorization: str = Header(None)):
    """Verify Firebase ID token"""
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
        
        user_info = await firebase_service.verify_user_token(token)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return ResponseModel(
            success=True,
            message="Token verified successfully",
            data=user_info
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return ResponseModel(
            success=False,
            message="Token verification failed",
            error=str(e)
        )

# User profile endpoints
@app.get("/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    try:
        return ResponseModel(
            success=True,
            message="Profile retrieved successfully",
            data=current_user
        )
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        return ResponseModel(
            success=False,
            message="Failed to retrieve profile",
            error=str(e)
        )

@app.put("/user/profile")
async def update_user_profile(
    updates: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""
    try:
        # Convert to dict for Firebase update
        update_data = {}
        if updates.display_name is not None:
            update_data['displayName'] = updates.display_name
        if updates.location is not None:
            update_data['preferences.location'] = updates.location
        if updates.crop_type is not None:
            update_data['preferences.cropType'] = updates.crop_type
        if updates.language is not None:
            update_data['preferences.language'] = updates.language
        if updates.notifications is not None:
            update_data['preferences.notifications'] = updates.notifications
        
        success = await firebase_service.update_user_profile(current_user['uid'], update_data)
        
        if success:
            return ResponseModel(
                success=True,
                message="Profile updated successfully"
            )
        else:
            return ResponseModel(
                success=False,
                message="Failed to update profile"
            )
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return ResponseModel(
            success=False,
            message="Profile update failed",
            error=str(e)
        )

# Chat history endpoints
@app.get("/chat/history")
async def get_chat_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get user's chat history"""
    try:
        chats = await firebase_service.get_user_chat_history(current_user['uid'], limit)
        
        return ResponseModel(
            success=True,
            message="Chat history retrieved successfully",
            data={"chats": chats}
        )
    except Exception as e:
        logger.error(f"Chat history retrieval error: {e}")
        return ResponseModel(
            success=False,
            message="Failed to retrieve chat history",
            error=str(e)
        )

@app.get("/chat/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a specific chat"""
    try:
        messages = await firebase_service.get_chat_messages(current_user['uid'], chat_id)
        
        return ResponseModel(
            success=True,
            message="Chat messages retrieved successfully",
            data={"messages": messages}
        )
    except Exception as e:
        logger.error(f"Chat messages retrieval error: {e}")
        return ResponseModel(
            success=False,
            message="Failed to retrieve chat messages",
            error=str(e)
        )

@app.delete("/chat/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific chat"""
    try:
        success = await firebase_service.delete_chat(current_user['uid'], chat_id)
        
        if success:
            return ResponseModel(
                success=True,
                message="Chat deleted successfully"
            )
        else:
            return ResponseModel(
                success=False,
                message="Failed to delete chat"
            )
    except Exception as e:
        logger.error(f"Chat deletion error: {e}")
        return ResponseModel(
            success=False,
            message="Failed to delete chat",
            error=str(e)
        )

@app.delete("/chat/history/clear")
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    """Clear all chat history for the user"""
    try:
        success = await firebase_service.clear_user_chat_history(current_user['uid'])
        
        if success:
            return ResponseModel(
                success=True,
                message="Chat history cleared successfully"
            )
        else:
            return ResponseModel(
                success=False,
                message="Failed to clear chat history"
            )
    except Exception as e:
        logger.error(f"Chat history clearing error: {e}")
        return ResponseModel(
            success=False,
            message="Failed to clear chat history",
            error=str(e)
        )

# Query processing endpoints (updated with authentication)
@app.post("/query/text")
async def process_text_query(
    query: str = Form(...),
    language: str = Form("en"),
    user_id: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    crop_type: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Process text-based farming queries"""
    try:
        logger.info(f"Processing text query for user {current_user['uid']}: {query}")
        logger.info(f"Form data received - query: {query}, language: {language}, user_id: {user_id}, location: {location}, crop_type: {crop_type}")
        
        # Extract user preferences using helper function
        extracted_location, extracted_crop_type, all_crop_types, extracted_language = extract_user_preferences(current_user)
        
        # Use extracted values if not provided in form
        location = location or extracted_location
        crop_type = crop_type or extracted_crop_type
        language = language or extracted_language
        
        # If we have multiple crop types, use them for better context
        if all_crop_types and len(all_crop_types) > 0:
            crop_context = f"Primary: {crop_type}, All: {', '.join(all_crop_types)}"
        else:
            crop_context = crop_type
        
        # Try to extract crop type from query if not in profile
        if not crop_type:
            # Enhanced crop detection from query using all available crops
            query_lower = query.lower()
            
            # Check against user's known crops first
            detected_crop = None
            for crop in all_crop_types:
                if crop.lower() in query_lower:
                    detected_crop = crop
                    break
            
            # If no match found in user's crops, check common crops
            if not detected_crop:
                common_crops = {
                    'tomato': ['tomato', 'tomatoes', 'टमाटर'],
                    'wheat': ['wheat', 'गेहूं', 'गेहूँ'],
                    'rice': ['rice', 'चावल', 'भात'],
                    'onion': ['onion', 'onions', 'प्याज'],
                    'potato': ['potato', 'potatoes', 'आलू'],
                    'cotton': ['cotton', 'कपास', 'रूई'],
                    'sugarcane': ['sugarcane', 'गन्ना', 'ईख'],
                    'corn': ['corn', 'maize', 'मक्का', 'भुट्टा'],
                    'soybean': ['soybean', 'soybeans', 'सोयाबीन'],
                    'pulses': ['pulses', 'दाल', 'dal', 'lentil', 'chickpea', 'chana']
                }
                
                for crop_name, keywords in common_crops.items():
                    if any(keyword in query_lower for keyword in keywords):
                        detected_crop = crop_name
                        break
            
            if detected_crop:
                crop_type = detected_crop
                logger.info(f"Detected crop '{detected_crop}' from query text")
        
        # Log the extracted information for debugging
        logger.info(f"User preferences - Location: '{location}', Primary Crop: '{crop_type}', All Crops: {all_crop_types}, Language: '{language}'")
        logger.info(f"Query text: '{query}'")
        
        # Create KrishiBandhuState object with full user profile
        from models.state import KrishiBandhuState
        state = KrishiBandhuState(
            user_id=current_user['uid'],
            session_id=f"session_{int(asyncio.get_event_loop().time())}",
            input_type="text",
            language=language,
            location=location,
            crop_type=crop_type,
            all_crop_types=all_crop_types,  # Add all crop types for better context
            crop_context=crop_context,  # Add crop context for agents
            user_profile=current_user,  # Pass complete user profile for personalized responses
            query_text=query
        )
        
        logger.info(f"Created state object: {state}")
        
        # Process query through orchestrator
        logger.info("Calling real_orchestrator.process_query...")
        result = await real_orchestrator.process_query(state)
        
        logger.info(f"Orchestrator result: {result}")
        
        # Extract response from orchestrator result
        if isinstance(result, dict):
            # Orchestrator returns a dictionary
            final_response = result.get('response', 'No response available')
            error = result.get('error')
        else:
            # Fallback for object response
            final_response = getattr(result, 'final_response', str(result))
            error = getattr(result, 'error', None)
        
        # Check for errors
        if error:
            return ResponseModel(
                success=False,
                message="Query processing failed",
                error=str(error)
            )
        
        # Generate audio response
        audio_url = None
        if final_response:
            try:
                # Clean text for TTS by removing formatting characters
                cleaned_text = clean_text_for_tts(final_response)
                audio_url = await tts_service.generate_audio_response(
                    cleaned_text, 
                    language, 
                    current_user['uid']
                )
                logger.info(f"Generated audio response for text query: {audio_url}")
            except Exception as e:
                logger.warning(f"TTS generation failed for text query: {e}")
                logger.exception("Full TTS error details for text query:")

        # Save to chat history
        if firebase_service.initialized:
            message = {
                'type': 'text',
                'content': query,
                'metadata': {
                    'location': location,
                    'crop_type': crop_type,
                    'language': language,
                    'audio_url': audio_url
                }
            }
            await firebase_service.save_chat_message(
                current_user['uid'],
                f"chat_{int(asyncio.get_event_loop().time())}",
                message
            )
        
        response_data = {
            "response": final_response
        }
        if audio_url:
            response_data["audio_url"] = audio_url
        
        return ResponseModel(
            success=True,
            message="Text query processed successfully",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Text query error: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return ResponseModel(
            success=False,
            message="Failed to process text query",
            error=str(e)
        )

@app.post("/query/image")
async def process_image_query(
    file: UploadFile = File(...),
    query: str = Form(""),
    language: str = Form("en"),
    current_user: dict = Depends(get_current_user)
):
    """Process image-based farming queries"""
    try:
        logger.info(f"Processing image query for user {current_user['uid']}")
        
        # Validate file
        if not file.content_type.startswith('image/'):
            return ResponseModel(
                success=False,
                message="Invalid file type. Please upload an image.",
                error="File must be an image"
            )
        
        # Read file content
        image_data = await file.read()
        
        # Extract user preferences using helper function
        extracted_location, extracted_crop_type, all_crop_types, extracted_language = extract_user_preferences(current_user)
        
        # Use extracted values if not provided in form
        location = extracted_location
        crop_type = extracted_crop_type
        language = language or extracted_language
        
        # If we have multiple crop types, use them for better context
        if all_crop_types and len(all_crop_types) > 0:
            crop_context = f"Primary: {crop_type}, All: {', '.join(all_crop_types)}"
        else:
            crop_context = crop_type
        
        # Create KrishiBandhuState object with full user profile
        from models.state import KrishiBandhuState
        state = KrishiBandhuState(
            user_id=current_user['uid'],
            session_id=f"session_{int(asyncio.get_event_loop().time())}",
            input_type="image",
            language=language,
            location=location,
            crop_type=crop_type,
            all_crop_types=all_crop_types,  # Add all crop types for better context
            crop_context=crop_context,  # Add crop context for agents
            user_profile=current_user,  # Pass complete user profile for personalized responses
            query_text=query or "Analyze this plant image",
            image_data=image_data
        )
        
        # Process query through orchestrator
        result = await real_orchestrator.process_query(state)
        
        # Extract response from orchestrator result (handle both dict and object responses)
        if isinstance(result, dict):
            final_response = result.get('response', 'No response available')
            error = result.get('error')
        else:
            final_response = getattr(result, 'final_response', str(result))
            error = getattr(result, 'error', None)
        
        # Check for errors
        if error:
            return ResponseModel(
                success=False,
                message="Image processing failed",
                error=error
            )
        
        # Generate audio response
        audio_url = None
        if final_response:
            try:
                # Clean text for TTS by removing formatting characters
                cleaned_text = clean_text_for_tts(final_response)
                audio_url = await tts_service.generate_audio_response(
                    cleaned_text, 
                    language, 
                    current_user['uid']
                )
                logger.info(f"Generated audio response for image query: {audio_url}")
            except Exception as e:
                logger.warning(f"TTS generation failed for image query: {e}")
                logger.exception("Full TTS error details for image query:")
        
        # Save to chat history
        if firebase_service.initialized:
            message = {
                'type': 'image',
                'content': query or "Plant image analysis",
                'metadata': {
                    'filename': file.filename,
                    'file_size': len(image_data),
                    'content_type': file.content_type,
                    'location': location,
                    'crop_type': crop_type,
                    'language': language,
                    'audio_url': audio_url
                }
            }
            await firebase_service.save_chat_message(
                current_user['uid'],
                f"chat_{int(asyncio.get_event_loop().time())}",
                message
            )
        
        response_data = {
            "response": final_response
        }
        if audio_url:
            response_data["audio_url"] = audio_url
        
        return ResponseModel(
            success=True,
            message="Image query processed successfully",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Image query error: {e}")
        return ResponseModel(
            success=False,
            message="Failed to process image query",
            error=str(e)
        )

@app.post("/query/voice")
async def process_voice_query(
    audio_file: UploadFile = File(...),
    language: str = Form("en"),
    transcription: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Process voice-based farming queries"""
    try:
        logger.info(f"Processing voice query for user {current_user['uid']}")
        
        # Validate file
        if not audio_file.content_type.startswith('audio/'):
            return ResponseModel(
                success=False,
                message="Invalid file type. Please upload an audio file.",
                error="File must be an audio file"
            )
        
        # Read file content
        audio_data = await audio_file.read()
        
        # Convert speech to text
        query_text = await voice_service.speech_to_text(audio_data, language)
        
        if not query_text:
            # Check if this is an audio format issue
            error_detail = "Could not understand the audio. This might be due to:"
            error_detail += "\n• Audio format not supported (WebM/MP4 detected)"
            error_detail += "\n• Poor audio quality or background noise"
            error_detail += "\n• Microphone issues"
            error_detail += "\n• Language mismatch"
            error_detail += "\n\nPlease try recording again with clear speech."
            
            raise HTTPException(
                status_code=400,
                detail=error_detail
            )
        
        # Extract user preferences using helper function
        extracted_location, extracted_crop_type, all_crop_types, extracted_language = extract_user_preferences(current_user)
        
        # Use extracted values if not provided in form
        location = extracted_location
        crop_type = extracted_crop_type
        language = language or extracted_language
        
        # If we have multiple crop types, use them for better context
        if all_crop_types and len(all_crop_types) > 0:
            crop_context = f"Primary: {crop_type}, All: {', '.join(all_crop_types)}"
        else:
            crop_context = crop_type
        
        # Try to extract crop type from query if not in profile
        if not crop_type:
            # Enhanced crop detection from query using all available crops
            query_lower = query_text.lower()
            
            # Check against user's known crops first
            detected_crop = None
            for crop in all_crop_types:
                if crop.lower() in query_lower:
                    detected_crop = crop
                    break
            
            # If no match found in user's crops, check common crops
            if not detected_crop:
                common_crops = {
                    'tomato': ['tomato', 'tomatoes', 'टमाटर'],
                    'wheat': ['wheat', 'गेहूं', 'गेहूँ'],
                    'rice': ['rice', 'चावल', 'भात'],
                    'onion': ['onion', 'onions', 'प्याज'],
                    'potato': ['potato', 'potatoes', 'आलू'],
                    'cotton': ['cotton', 'कपास', 'रूई'],
                    'sugarcane': ['sugarcane', 'गन्ना', 'ईख'],
                    'corn': ['corn', 'maize', 'मक्का', 'भुट्टा'],
                    'soybean': ['soybean', 'soybeans', 'सोयाबीन'],
                    'pulses': ['pulses', 'दाल', 'dal', 'lentil', 'chickpea', 'chana']
                }
                
                for crop_name, keywords in common_crops.items():
                    if any(keyword in query_lower for keyword in keywords):
                        detected_crop = crop_name
                        break
            
            if detected_crop:
                crop_type = detected_crop
                logger.info(f"Detected crop '{detected_crop}' from query text")
        
        # Log the extracted information for debugging
        logger.info(f"User preferences - Location: '{location}', Primary Crop: '{crop_type}', All Crops: {all_crop_types}, Language: '{language}'")
        logger.info(f"Query text: '{query_text}'")
        
        # Create KrishiBandhuState object with full user profile
        from models.state import KrishiBandhuState
        logger.info(f"Creating state with user_profile: {current_user}")
        logger.info(f"User profile type: {type(current_user)}")
        state = KrishiBandhuState(
            user_id=current_user['uid'],
            session_id=f"session_{int(asyncio.get_event_loop().time())}",
            input_type="voice",
            language=language,
            location=location,
            crop_type=crop_type,
            all_crop_types=all_crop_types,  # Add all crop types for better context
            crop_context=crop_context,  # Add crop context for agents
            user_profile=current_user,  # Pass complete user profile for personalized responses
            query_text=query_text,
            voice_data=audio_data
        )
        logger.info(f"Created state with user_profile: {state.user_profile}")
        
        # Process query through orchestrator
        result = await real_orchestrator.process_query(state)
        
        # Save to chat history
        if firebase_service.initialized:
            message = {
                'type': 'voice',
                'content': query_text,
                'metadata': {
                    'filename': audio_file.filename,
                    'file_size': len(audio_data),
                    'content_type': audio_file.content_type,
                    'transcription': transcription,
                    'location': location,
                    'crop_type': crop_type,
                    'language': language
                }
            }
            await firebase_service.save_chat_message(
                current_user['uid'],
                f"chat_{int(asyncio.get_event_loop().time())}",
                message
            )
        
        if hasattr(result, 'error') and result.error:
            return ResponseModel(
                success=False,
                message="Voice query processing failed",
                error=result.error
            )
        
        # Generate audio response
        audio_url = None
        
        # Extract response from orchestrator result (handle both dict and object responses)
        if isinstance(result, dict):
            final_response = result.get('response', 'No response available')
            error = result.get('error')
        else:
            final_response = getattr(result, 'final_response', str(result))
            error = getattr(result, 'error', None)
        
        # Check for errors
        if error:
            return ResponseModel(
                success=False,
                message="Voice query processing failed",
                error=error
            )
        
        if final_response:
            try:
                # Clean text for TTS by removing formatting characters
                cleaned_text = clean_text_for_tts(final_response)
                audio_url = await tts_service.generate_audio_response(
                    cleaned_text, 
                    language, 
                    current_user['uid']
                )
                logger.info(f"Generated audio response for voice query: {audio_url}")
            except Exception as e:
                logger.warning(f"TTS generation failed for voice query: {e}")
                logger.exception("Full TTS error details for voice query:")

        response_data = {
            "transcription": query_text,
            "response": final_response
        }
        
        # Add helpful suggestions if location is missing
        if not location or location.strip() == '':
            response_data["suggestion"] = {
                "type": "location_missing",
                "message": "To get accurate, location-specific market prices and farming advice, please set your location in your profile.",
                "action": "Go to Profile → Edit → Add your city/district or PIN code"
            }
        
        if audio_url:
            response_data["audio_url"] = audio_url
        
        return ResponseModel(
            success=True,
            message="Voice query processed successfully",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Voice query error: {e}")
        return ResponseModel(
            success=False,
            message="Failed to process voice query",
            error=str(e)
        )

@app.post("/query/voice-image")
async def process_voice_image_query(
    audio_file: UploadFile = File(...),
    image_file: UploadFile = File(...),
    language: str = Form("en"),
    transcription: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Process combined voice + image farming queries for disease detection"""
    try:
        logger.info(f"Processing voice + image query for user {current_user['uid']}")
        
        # Validate audio file
        if not audio_file.content_type.startswith('audio/'):
            return ResponseModel(
                success=False,
                message="Invalid audio file type. Please upload an audio file.",
                error="Audio file must be an audio file"
            )
        
        # Validate image file
        if not image_file.content_type.startswith('image/'):
            return ResponseModel(
                success=False,
                message="Invalid image file type. Please upload an image file.",
                error="Image file must be an image file"
            )
        
        # Read both files
        audio_data = await audio_file.read()
        image_data = await image_file.read()
        
        logger.info(f"Received audio file: {audio_file.filename} ({len(audio_data)} bytes)")
        logger.info(f"Received image file: {image_file.filename} ({len(image_data)} bytes)")
        
        # Convert speech to text
        query_text = await voice_service.speech_to_text(audio_data, language)
        
        if not query_text:
            error_detail = "Could not understand the audio. This might be due to:"
            error_detail += "\n• Audio format not supported (WebM/MP4 detected)"
            error_detail += "\n• Poor audio quality or background noise"
            error_detail += "\n• Microphone issues"
            error_detail += "\n• Language mismatch"
            error_detail += "\n\nPlease try recording again with clear speech."
            
            raise HTTPException(
                status_code=400,
                detail=error_detail
            )
        
        logger.info(f"Voice transcription: {query_text}")
        
        # Extract user preferences using helper function
        extracted_location, extracted_crop_type, all_crop_types, extracted_language = extract_user_preferences(current_user)
        
        # Use extracted values if not provided in form
        location = extracted_location
        crop_type = extracted_crop_type
        language = language or extracted_language
        
        # If we have multiple crop types, use them for better context
        if all_crop_types and len(all_crop_types) > 0:
            crop_context = f"Primary: {crop_type}, All: {', '.join(all_crop_types)}"
        else:
            crop_context = crop_type
        
        # Try to extract crop type from query if not in profile
        if not crop_type:
            # Enhanced crop detection from query using all available crops
            query_lower = query_text.lower()
            
            # Check against user's known crops first
            detected_crop = None
            for crop in all_crop_types:
                if crop.lower() in query_lower:
                    detected_crop = crop
                    break
            
            # If no match found in user's crops, check common crops
            if not detected_crop:
                common_crops = {
                    'tomato': ['tomato', 'tomatoes', 'टमाटर'],
                    'wheat': ['wheat', 'गेहूं', 'गेहूँ'],
                    'rice': ['rice', 'चावल', 'भात'],
                    'onion': ['onion', 'onions', 'प्याज'],
                    'potato': ['potato', 'potatoes', 'आलू'],
                    'cotton': ['cotton', 'कपास', 'रूई'],
                    'sugarcane': ['sugarcane', 'गन्ना', 'ईख'],
                    'corn': ['corn', 'maize', 'मक्का', 'भुट्टा'],
                    'soybean': ['soybean', 'soybeans', 'सोयाबीन'],
                    'pulses': ['pulses', 'दाल', 'dal', 'lentil', 'chickpea', 'chana']
                }
                
                for crop_name, keywords in common_crops.items():
                    if any(keyword in query_lower for keyword in keywords):
                        detected_crop = crop_name
                        break
            
            if detected_crop:
                crop_type = detected_crop
                logger.info(f"Detected crop '{detected_crop}' from query text")
        
        # Log the extracted information for debugging
        logger.info(f"User preferences - Location: '{location}', Primary Crop: '{crop_type}', All Crops: {all_crop_types}, Language: '{language}'")
        logger.info(f"Query text: '{query_text}'")
        
        # Create KrishiBandhuState object with BOTH voice and image data and full user profile
        from models.state import KrishiBandhuState
        state = KrishiBandhuState(
            user_id=current_user['uid'],
            session_id=f"session_{int(asyncio.get_event_loop().time())}",
            input_type="voice_image",  # New input type for combined queries
            language=language,
            location=location,
            crop_type=crop_type,
            all_crop_types=all_crop_types,  # Add all crop types for better context
            crop_context=crop_context,  # Add crop context for agents
            user_profile=current_user,  # Pass complete user profile for personalized responses
            query_text=query_text,
            voice_data=audio_data,
            image_data=image_data  # Include image data for disease detection
        )
        
        logger.info(f"Created combined voice+image state: {state}")
        logger.info(f"State input_type: {state.input_type}")
        logger.info(f"State has image_data: {hasattr(state, 'image_data') and state.image_data is not None}")
        logger.info(f"State has voice_data: {hasattr(state, 'voice_data') and state.voice_data is not None}")
        
        # Process query through orchestrator
        logger.info("Calling real_orchestrator.process_query for combined voice+image query...")
        result = await real_orchestrator.process_query(state)
        
        logger.info(f"Orchestrator result: {result}")
        
        # Save to chat history
        if firebase_service.initialized:
            message = {
                'type': 'voice_image',
                'content': query_text,
                'metadata': {
                    'audio_filename': audio_file.filename,
                    'audio_size': len(audio_data),
                    'audio_content_type': audio_file.content_type,
                    'image_filename': image_file.filename,
                    'image_size': len(image_data),
                    'image_content_type': image_file.content_type,
                    'transcription': transcription,
                    'location': location,
                    'crop_type': crop_type,
                    'language': language,
                    'query_type': 'voice_image_combined'
                }
            }
            await firebase_service.save_chat_message(
                current_user['uid'],
                f"chat_{int(asyncio.get_event_loop().time())}",
                message
            )
        
        # Extract response from orchestrator result (handle both dict and object responses)
        if isinstance(result, dict):
            final_response = result.get('response', 'No response available')
            error = result.get('error')
        else:
            final_response = getattr(result, 'final_response', str(result))
            error = getattr(result, 'error', None)
        
        # Check for errors
        if error:
            return ResponseModel(
                success=False,
                message="Voice + Image query processing failed",
                error=error
            )
        
        # Generate audio response
        audio_url = None
        if final_response:
            try:
                # Clean text for TTS by removing formatting characters
                cleaned_text = clean_text_for_tts(final_response)
                audio_url = await tts_service.generate_audio_response(
                    cleaned_text, 
                    language, 
                    current_user['uid']
                )
                logger.info(f"Generated audio response for voice+image query: {audio_url}")
            except Exception as e:
                logger.warning(f"TTS generation failed for voice+image query: {e}")
                logger.exception("Full TTS error details for voice+image query:")

        response_data = {
            "transcription": query_text,
            "response": final_response,
            "query_type": "voice_image_combined",
            "image_processed": True,
            "voice_processed": True
        }
        if audio_url:
            response_data["audio_url"] = audio_url
        
        return ResponseModel(
            success=True,
            message="Voice + Image query processed successfully",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Voice + Image query error: {e}")
        logger.exception("Full error details:")
        return ResponseModel(
            success=False,
            message="Failed to process voice + image query",
            error=str(e)
        )

@app.post("/query/text-image")
async def process_text_image_query(
    text: str = Form(...),
    image_file: UploadFile = File(...),
    language: str = Form("en"),
    current_user: dict = Depends(get_current_user)
):
    """Process combined text + image farming queries for comprehensive analysis"""
    try:
        logger.info(f"Processing text + image query for user {current_user['uid']}")
        
        # Validate image file
        if not image_file.content_type.startswith('image/'):
            return ResponseModel(
                success=False,
                message="Invalid image file type. Please upload an image file.",
                error="Image file must be an image file"
            )
        
        # Read image file
        image_data = await image_file.read()
        
        logger.info(f"Received text query: {text}")
        logger.info(f"Received image file: {image_file.filename} ({len(image_data)} bytes)")
        
        # Extract user preferences using helper function
        extracted_location, extracted_crop_type, all_crop_types, extracted_language = extract_user_preferences(current_user)
        
        # Use extracted values if not provided in form
        location = extracted_location
        crop_type = extracted_crop_type
        language = language or extracted_language
        
        # If we have multiple crop types, use them for better context
        if all_crop_types and len(all_crop_types) > 0:
            crop_context = f"Primary: {crop_type}, All: {', '.join(all_crop_types)}"
        else:
            crop_context = crop_type
        
        # Create KrishiBandhuState object with BOTH text and image data and full user profile
        from models.state import KrishiBandhuState
        state = KrishiBandhuState(
            user_id=current_user['uid'],
            session_id=f"session_{int(asyncio.get_event_loop().time())}",
            input_type="text_image",  # New input type for combined queries
            language=language,
            location=location,
            crop_type=crop_type,
            all_crop_types=all_crop_types,  # Add all crop types for better context
            crop_context=crop_context,  # Add crop context for agents
            user_profile=current_user,  # Pass complete user profile for personalized responses
            query_text=text,
            image_data=image_data  # Include image data for analysis
        )
        
        logger.info(f"Created combined text+image state: {state}")
        logger.info(f"State input_type: {state.input_type}")
        logger.info(f"State has image_data: {hasattr(state, 'image_data') and state.image_data is not None}")
        logger.info(f"State query_text: {state.query_text}")
        
        # Process query through orchestrator
        logger.info("Calling real_orchestrator.process_query for combined text+image query...")
        result = await real_orchestrator.process_query(state)
        
        logger.info(f"Orchestrator result: {result}")
        
        # Save to chat history
        if firebase_service.initialized:
            message = {
                'type': 'text_image',
                'content': text,
                'metadata': {
                    'image_filename': image_file.filename,
                    'image_size': len(image_data),
                    'image_content_type': image_file.content_type,
                    'location': location,
                    'crop_type': crop_type,
                    'language': language,
                    'query_type': 'text_image_combined'
                }
            }
            await firebase_service.save_chat_message(
                current_user['uid'],
                f"chat_{int(asyncio.get_event_loop().time())}",
                message
            )
        
        # Extract response from orchestrator result (handle both dict and object responses)
        if isinstance(result, dict):
            final_response = result.get('response', 'No response available')
            error = result.get('error')
        else:
            final_response = getattr(result, 'final_response', str(result))
            error = getattr(result, 'error', None)
        
        # Check for errors
        if error:
            return ResponseModel(
                success=False,
                message="Text + Image query processing failed",
                error=error
            )
        
        # Generate audio response
        audio_url = None
        if final_response:
            try:
                # Clean text for TTS by removing formatting characters
                cleaned_text = clean_text_for_tts(final_response)
                audio_url = await tts_service.generate_audio_response(
                    cleaned_text, 
                    language, 
                    current_user['uid']
                )
                logger.info(f"Generated audio response for text+image query: {audio_url}")
            except Exception as e:
                logger.warning(f"TTS generation failed for text+image query: {e}")
                logger.exception("Full TTS error details for text+image query:")

        response_data = {
            "query": text,
            "response": final_response,
            "query_type": "text_image_combined",
            "image_processed": True,
            "text_processed": True
        }
        if audio_url:
            response_data["audio_url"] = audio_url
        
        return ResponseModel(
            success=True,
            message="Text + Image query processed successfully",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Text + Image query error: {e}")
        logger.exception("Full error details:")
        return ResponseModel(
            success=False,
            message="Failed to process text + image query",
            error=str(e)
        )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        # Initialize services
        services_initialized = []
        
        # Check LLM service
        if llm_service.initialized:
            services_initialized.append("LLM Service")
        else:
            logger.warning("LLM Service not fully initialized (running in fallback mode)")
            services_initialized.append("LLM Service (fallback)")
        
        # Check Voice service
        services_initialized.append("Voice Service")
        
        # Check Firebase service
        if firebase_service.initialized:
            services_initialized.append("Firebase Service")
        else:
            logger.warning("Firebase Service not initialized")
            services_initialized.append("Firebase Service (disabled)")
        
        # Check Orchestrator
        services_initialized.append("Real Orchestrator")
        
        logger.info(f"✅ All services initialized successfully: {', '.join(services_initialized)}")
        
    except Exception as e:
        logger.error(f"❌ Service initialization failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )