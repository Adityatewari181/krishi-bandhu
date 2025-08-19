from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class KrishiBandhuState(BaseModel):
    """
    Central state management for Krishi Bandhu multi-agent system.
    This state is passed between all agents and contains all conversation context.
    Supports multi-agent collaboration where multiple agents work together.
    """
    # Input information
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    input_type: Literal["text", "image", "voice", "voice_image", "text_image"] = "text"
    language: str = "en"
    location: Optional[str] = None
    crop_type: Optional[str] = None
    all_crop_types: Optional[List[str]] = Field(default_factory=list)  # All crops user grows
    crop_context: Optional[str] = None  # Context about user's crops for agents
    
    # Full user profile information for personalized responses
    user_profile: Optional[Dict[str, Any]] = Field(default_factory=dict)  # Complete user profile data
    
    # Query details
    query_text: Optional[str] = None
    image_data: Optional[bytes] = None
    voice_data: Optional[bytes] = None
    
    # Multi-agent orchestration
    required_agents: List[str] = Field(default_factory=list)
    agent_contexts: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    agent_errors: Optional[Dict[str, str]] = None
    
    # Agent responses (Phase 1: Weather + Pest + Finance Policy + Market Price + General Agriculture)
    weather_response: Optional[Dict[str, Any]] = None
    pest_response: Optional[Dict[str, Any]] = None
    finance_policy_response: Optional[Dict[str, Any]] = None
    market_price_response: Optional[Dict[str, Any]] = None
    general_agriculture_response: Optional[Dict[str, Any]] = None
    
    # Final output
    final_response: Optional[str] = None
    suggestions: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    
    # Metadata
    processing_time: float = 0.0
    agents_used: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # Voice-specific data
    audio_response_url: Optional[str] = None

class ResponseModel(BaseModel):
    """Standard API response model"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    message: str
    error: Optional[str] = None
    processing_time: Optional[float] = None
    agents_used: List[str] = Field(default_factory=list)

class AgentResponse(BaseModel):
    """Base model for agent responses"""
    agent_name: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    confidence: float = 0.0
    processing_time: float = 0.0