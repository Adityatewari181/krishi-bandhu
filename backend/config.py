import os
import logging
from dotenv import load_dotenv
from typing import List

load_dotenv()

logger = logging.getLogger(__name__)

class Config:
    # Azure OpenAI Configuration
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
    AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
    
    # External APIs
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
    
    # Server Configuration
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # File Upload Configuration
    MAX_FILE_SIZE_MB = 10
    ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"]
    ALLOWED_AUDIO_TYPES = ["audio/wav", "audio/mpeg", "audio/webm"]
    
    # Model Configuration
    PEST_MODEL_NAME = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"

    # Crop-specific pest detection models
    PEST_MODELS = {
        # Rice-specific model
        "rice": "prithivMLmods/Rice-Leaf-Disease",
            # Wheat-specific model  
    "wheat": "wambugu71/crop_leaf_diseases_vit",
        # General model for other crops
        "general": "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
    }

    # Crop to model mapping
    CROP_MODEL_MAPPING = {
        # Rice crops
        "rice": "rice",
        "paddy": "rice",
        
        # Wheat crops
        "wheat": "wheat",
        
        # Crops using general model
        "apple": "general",
        "bell pepper": "general", 
        "cherry": "general",
        "corn": "general",
        "maize": "general",
        "grape": "general",
        "peach": "general",
        "potato": "general",
        "strawberry": "general",
        "tomato": "general",
        "pepper": "general",
        "cotton": "general",
        "sugarcane": "general"
    }
    
    # Supported Languages
    SUPPORTED_LANGUAGES = {
        "en": "English",
        "hi": "Hindi",
        "hinglish": "Hinglish (Hindi-English mix)"
    }

    @classmethod
    def validate_config(cls):
        """Validate essential configuration"""
        missing = []
        
        # Make these optional for development
        if not cls.AZURE_OPENAI_API_KEY:
            logger.warning("AZURE_OPENAI_API_KEY not set - some features may not work")
        if not cls.AZURE_OPENAI_ENDPOINT:
            logger.warning("AZURE_OPENAI_ENDPOINT not set - some features may not work")
        if not cls.OPENWEATHER_API_KEY:
            logger.warning("OPENWEATHER_API_KEY not set - some features may not work")
            
        # Only require essential variables for basic functionality
        if not cls.AZURE_OPENAI_API_KEY and not cls.AZURE_OPENAI_ENDPOINT:
            missing.append("Either AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT")
            
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        return True