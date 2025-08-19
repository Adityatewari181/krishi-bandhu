#!/usr/bin/env python3
"""
🦗 Real Pest Detection Agent - LLM + ML Hybrid

A true autonomous agent that:
- Uses LLM for reasoning and decision making
- Keeps ML models for image classification
- Has memory and learning capabilities
- Makes autonomous decisions about pest detection
"""

import asyncio
import logging
import base64
import io
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
import json
from PIL import Image
import torch
import torch.nn.functional as F
from transformers import AutoImageProcessor, AutoModelForImageClassification

from services.llm_service import LLMService
from config import Config

logger = logging.getLogger(__name__)

@dataclass
class PestAgentState:
    """State management for the Pest Detection Agent"""
    # Core state
    user_id: str
    session_id: str
    current_goal: str = "detect_pests_and_diseases"
    
    # Memory and learning
    conversation_history: List[Dict] = field(default_factory=list)
    user_preferences: Dict[str, Any] = field(default_factory=dict)
    learning_insights: Dict[str, Any] = field(default_factory=dict)
    
    # Image and detection data
    image_data: Optional[str] = None
    detected_pests: List[Dict] = field(default_factory=list)
    crop_type: str = ""
    location: str = ""
    
    # Agent decisions and reasoning
    decisions_made: List[Dict] = field(default_factory=list)
    confidence_level: float = 0.8
    adaptation_needed: bool = False
    
    # LLM reasoning
    llm_reasoning: str = ""
    llm_decisions: List[str] = field(default_factory=list)
    
    # Performance tracking
    response_quality: float = 0.0
    user_satisfaction: Optional[float] = None
    improvement_areas: List[str] = field(default_factory=list)

class RealPestAgent:
    """
    Autonomous Pest Detection Agent with LLM reasoning + ML models
    """
    
    def __init__(self):
        self.llm_service = LLMService()
        self.learning_threshold = 0.7
        self.adaptation_count = 0
        
        # Load ML models (keeping original functionality)
        self.models = {}
        self.processors = {}
        self._load_models()
        
        logger.info("🦗 Real Pest Agent initialized with LLM + ML capabilities")
    
    def _load_models(self):
        """Load simplified crop-specific ML models for pest detection"""
        try:
            # Use model configurations from config.py
            self.model_configs = Config.PEST_MODELS
            logger.info(f"🦗 Model configs: {self.model_configs}")
            
            # Use crop mapping from config.py and extend with Hindi support
            self.crop_mapping = Config.CROP_MODEL_MAPPING.copy()
            
            # Add Hindi translations to the mapping
            hindi_mappings = {
                "chawal": "rice",
                "dhan": "rice", 
                "चावल": "rice",
                "धान": "rice",
                "atta": "wheat",
                "gehun": "wheat",
                "gandum": "wheat",
                "गेहूं": "wheat",
                "गेंहू": "wheat",
                "tamatar": "general",
                "टमाटर": "general",
                "aloo": "general",
                "आलू": "general",
                "makka": "general",
                "bhutta": "general",
                "मक्का": "general",
                "भुट्टा": "general",
                "seb": "general",
                "सेब": "general",
                "angur": "general",
                "अंगूर": "general",
                "aadu": "general",
                "आड़ू": "general",
                "shimla mirch": "general",
                "शिमला मिर्च": "general",
                "कैप्सिकम": "general",
                "kapas": "general",
                "कपास": "general",
                "ganna": "general",
                "गन्ना": "general"
            }
            self.crop_mapping.update(hindi_mappings)
            
            # Initialize models cache
            self.models = {}
            self.processors = {}
            
            # Load models
            self._initialize_models()
            
            logger.info(f"🦗 Pest Agent: Models loaded successfully. Available models: {list(self.models.keys())}")
            
        except Exception as e:
            logger.error(f"🦗 Pest Agent: Model configuration error: {e}")
            import traceback
            traceback.print_exc()
    
    def _initialize_models(self):
        """Initialize all crop-specific models (same as old pest agent)"""
        try:
            # Load the general model first (most commonly used)
            general_model = self.model_configs["general"]
            self._load_model("general", general_model)
            logger.info(f"🦗 General model loaded: {general_model}")
            
            # Load crop-specific models
            for crop_type, model_name in self.model_configs.items():
                if crop_type != "general":
                    try:
                        self._load_model(crop_type, model_name)
                        logger.info(f"🦗 {crop_type.capitalize()} model loaded: {model_name}")
                    except Exception as e:
                        logger.warning(f"🦗 Failed to load {crop_type} model: {e}")
                        # Fallback to general model
                        self.models[crop_type] = self.models["general"]
                        self.processors[crop_type] = self.processors["general"]
            
        except Exception as e:
            logger.error(f"🦗 Failed to initialize pest detection models: {e}")
            raise
    
    def _load_model(self, model_key: str, model_name: str):
        """Load a specific model and processor (same as old pest agent)"""
        try:
            # Standard loading for all models
            processor = AutoImageProcessor.from_pretrained(
                model_name, 
                use_fast=True
            )
            
            # Load model
            model = AutoModelForImageClassification.from_pretrained(model_name)
            model.eval()  # Set to evaluation mode
            
            # Store in cache
            self.processors[model_key] = processor
            self.models[model_key] = model
            
            logger.info(f"🦗 Model {model_key} loaded successfully: {model_name}")
            
        except Exception as e:
            logger.error(f"🦗 Failed to load model {model_key} ({model_name}): {e}")
            raise
    
    def _determine_crop_type(self, context: Dict[str, Any] = None) -> str:
        """
        Simplified crop detection: Query → User Profile → Default
        """
        if not context:
            return "general"
        
        # Priority 1: Explicit crop from context
        if context.get('crop'):
            crop = context['crop'].lower().strip()
            logger.info(f"🦗 Using explicit crop from context: {crop}")
            return self._map_crop_to_model(crop)
        
        # Priority 2: Query analysis for crop mentions
        if context.get('query'):
            query = context['query'].lower()
            detected_crop = self._extract_crop_from_query(query)
            if detected_crop:
                logger.info(f"🦗 Detected crop from query '{query}': {detected_crop}")
                return self._map_crop_to_model(detected_crop)
        
        # Priority 3: User profile current crops
        if context.get('user_profile'):
            user_profile = context['user_profile']
            current_crops = user_profile.get('agricultureSpecific', {}).get('currentCrops', [])
            if current_crops:
                # Use the first crop as default
                crop = current_crops[0].lower().strip()
                logger.info(f"🦗 Using crop from user profile: {crop}")
                return self._map_crop_to_model(crop)
        
        # Default to general model
        logger.info("🦗 No crop detected, using general model")
        return "general"
    
    def _map_crop_to_model(self, crop: str) -> str:
        """Simplified crop to model mapping"""
        # Clean crop name
        crop = crop.lower().strip()
        
        # Direct mapping
        if crop in self.crop_mapping:
            return self.crop_mapping[crop]
        
        # Simple fuzzy matching
        if any(rice_word in crop for rice_word in ['rice', 'paddy', 'basmati', 'aromatic', 'chawal', 'dhan']):
            return "rice"
        elif any(wheat_word in crop for wheat_word in ['wheat', 'atta', 'gehun', 'gandum']):
            return "wheat"
        else:
            return "general"  # All other crops use general model
    
    def _extract_crop_from_query(self, query: str) -> Optional[str]:
        """
        Enhanced crop extraction from query with Hindi support
        """
        query_lower = query.lower()
        
        # Hindi to English crop mappings (highest priority)
        hindi_to_crop = {
            "चावल": "rice",      # chawal
            "धान": "rice",        # dhan
            "गेहूं": "wheat",     # gehun
            "गेंहू": "wheat",     # gehun (alternative spelling)
            "आलू": "potato",      # aloo
            "टमाटर": "tomato",    # tamatar
            "सेब": "apple",       # seb
            "अंगूर": "grape",     # angur
            "आड़ू": "peach",      # aadu
            "कपास": "cotton",     # kapas
            "गन्ना": "sugarcane", # ganna
            "मक्का": "corn",      # makka
            "भुट्टा": "corn",     # bhutta
            "शिमला मिर्च": "pepper",  # shimla mirch
            "कैप्सिकम": "pepper"      # capsicum
        }
        
        # Check Hindi mappings first (highest priority)
        for hindi_word, crop in hindi_to_crop.items():
            if hindi_word in query:
                logger.info(f"🦗 Found crop '{crop}' in query using Hindi word '{hindi_word}'")
                return crop
        
        # Enhanced crop keywords with Hindi and English
        crop_keywords = {
            'rice': ['rice', 'paddy', 'basmati', 'aromatic rice', 'chawal', 'dhan'],
            'wheat': ['wheat', 'atta', 'gehun', 'wheat crop', 'gandum'],
            'tomato': ['tomato', 'tamatar', 'tomato plant'],
            'potato': ['potato', 'aloo', 'potato crop', 'batata'],
            'corn': ['corn', 'maize', 'makka', 'corn crop', 'bhutta'],
            'apple': ['apple', 'seb', 'apple tree', 'apple plant'],
            'grape': ['grape', 'angur', 'grape vine', 'grape plant'],
            'peach': ['peach', 'aadu', 'peach tree', 'peach plant'],
            'strawberry': ['strawberry', 'strawberry plant'],
            'cherry': ['cherry', 'cherry tree', 'cherry plant'],
            'pepper': ['pepper', 'bell pepper', 'capsicum', 'shimla mirch'],
            'cotton': ['cotton', 'kapas', 'cotton plant'],
            'sugarcane': ['sugarcane', 'ganna', 'sugarcane crop']
        }
        
        # Check for crop keywords
        for crop, keywords in crop_keywords.items():
            for keyword in keywords:
                if keyword in query_lower:
                    logger.info(f"🦗 Found crop '{crop}' in query using keyword '{keyword}'")
                    return crop
        
        logger.info(f"🦗 No crop detected in query: '{query}'")
        return None
    

    
    async def _analyze_image_with_ml(self, image_data: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Use enhanced crop-specific ML models to analyze image for pests/diseases (same as old pest agent)"""
        try:
            logger.info("🦗 Starting ML image analysis...")
            
            # Check if models are loaded
            if not self.models:
                logger.error("🦗 No ML models loaded!")
                return {
                    'crop_detection': {
                        'detected': False, 
                        'confidence': 0.0, 
                        'class_id': 0,
                        'crop_type': 'unknown',
                        'error': 'No ML models loaded'
                    }
                }
            
            # Handle image data - could be base64 string or raw bytes
            if isinstance(image_data, str):
                # If it's a string, assume it's base64 encoded
                image_bytes = base64.b64decode(image_data)
            else:
                # If it's already bytes, use directly
                image_bytes = image_data
            
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            logger.info(f"🦗 Image loaded: {image.size}")
            
            # Resize image if too large (for performance) - same as old pest agent
            if max(image.size) > 1024:
                image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                logger.info(f"🦗 Image resized to: {image.size}")
            
            # Determine which crop model to use (same as old pest agent)
            crop_type = self._determine_crop_type(context)
            logger.info(f"🦗 Using {crop_type} model for analysis")
            
            # Check if the model is available
            if crop_type not in self.models:
                logger.warning(f"🦗 {crop_type} model not available, using general model")
                crop_type = "general"
            
            # Get prediction using crop-specific model (same as old pest agent)
            prediction_result = await self._predict_disease(image, crop_type)
            logger.info(f"🦗 Prediction result: {prediction_result}")
            
            # Parse prediction results (same as old pest agent)
            analysis = self._parse_prediction(prediction_result, crop_type)
            logger.info(f"🦗 Parsed analysis: {analysis}")
            
            # Convert to the format expected by real pest agent
            results = {
                'crop_detection': {
                    'detected': analysis.get('condition', '').lower() != 'healthy',
                    'confidence': analysis.get('confidence', 0.0),
                    'class_id': prediction_result.get('top_prediction', {}).get('class_id', 0),
                    'crop_type': crop_type,
                    'model_used': self.model_configs.get(crop_type, "Unknown"),
                    'analysis_type': 'crop_specific',
                    'predicted_class': analysis.get('predicted_class', ''),
                    'raw_label': analysis.get('raw_label', ''),
                    'crop': analysis.get('crop', ''),
                    'condition': analysis.get('condition', ''),
                    'top_predictions': analysis.get('top_predictions', [])
                }
            }
            
            logger.info(f"🦗 ML analysis completed successfully: {results}")
            return results
            
        except Exception as e:
            logger.error(f"🦗 ML analysis error: {e}")
            import traceback
            traceback.print_exc()
            return {
                'crop_detection': {
                    'detected': False, 
                    'confidence': 0.0, 
                    'class_id': 0,
                    'crop_type': 'unknown',
                    'error': str(e)
                }
            }
    
    async def _predict_disease(self, image: Image.Image, crop_type: str) -> Dict[str, Any]:
        """Run inference on the image using crop-specific model (same as old pest agent)"""
        try:
            # Get the appropriate model and processor
            model = self.models.get(crop_type, self.models["general"])
            processor = self.processors.get(crop_type, self.processors["general"])
            
            # Preprocess image
            inputs = processor(images=image, return_tensors="pt")
            
            # Run inference
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits
                probabilities = F.softmax(logits, dim=1)
            
            # Get label mappings
            id2label = model.config.id2label
            label2id = model.config.label2id
            
            # Get top 3 predictions
            top_k = min(3, len(id2label))
            top_probs, top_indices = torch.topk(probabilities[0], k=top_k)
            
            predictions = []
            for i in range(top_k):
                class_id = top_indices[i].item()
                confidence = top_probs[i].item()
                label = id2label[class_id]
                
                predictions.append({
                    "class_id": class_id,
                    "label": label,
                    "confidence": confidence
                })
            
            return {
                "top_prediction": predictions[0],
                "all_predictions": predictions,
                "model_output": {
                    "logits": logits.tolist(),
                    "probabilities": probabilities.tolist()
                },
                "model_type": crop_type
            }
            
        except Exception as e:
            logger.error(f"🦗 Model inference error for {crop_type}: {e}")
            raise
    
    def _parse_prediction(self, prediction_result: Dict[str, Any], crop_type: str) -> Dict[str, Any]:
        """Parse model prediction into structured format (same as old pest agent)"""
        top_pred = prediction_result["top_prediction"]
        label = top_pred["label"]
        confidence = top_pred["confidence"]
        
        # Parse label based on crop type
        crop, condition = self._parse_class_label(label, crop_type)
        
        # Build a friendly predicted class for logging/UX, keep raw label for reference
        if crop and condition and crop != "Unknown" and condition != "":
            friendly_label = f"{crop} - {condition}"
        else:
            friendly_label = label
        
        return {
            "predicted_class": friendly_label,
            "raw_label": label,
            "confidence": confidence,
            "crop": crop,
            "condition": condition,
            "top_predictions": prediction_result["all_predictions"],
            "model_type": crop_type
        }
    
    def _parse_class_label(self, label: str, crop_type: str) -> tuple[str, str]:
        """Parse class label into crop and condition based on model type (same as old pest agent)"""
        # Handle different label formats based on model
        label = label.replace("___", "__").replace("  ", " ").strip()
        
        if crop_type == "rice":
            # Rice model specific parsing
            return self._parse_rice_label(label)
        elif crop_type == "wheat":
            # Wheat model specific parsing
            return self._parse_wheat_label(label)
        else:
            # General model parsing
            return self._parse_general_label(label)
    
    def _parse_rice_label(self, label: str) -> tuple[str, str]:
        """Parse rice-specific labels (same as old pest agent)"""
        # Rice model typically has labels like "Rice_Healthy", "Rice_Bacterial_Blight", etc.
        if "_" in label:
            parts = label.split("_")
            if parts[0].lower() in ['rice', 'paddy']:
                crop = "Rice"
                condition = " ".join(parts[1:]).title()
            else:
                crop = "Rice"
                condition = label.title()
        else:
            crop = "Rice"
            condition = label.title()
        
        return crop, condition
    
    def _parse_wheat_label(self, label: str) -> tuple[str, str]:
        """Parse wheat-specific labels with enhanced logic (from old pest agent)"""
        # Parsing labels for wheat using a multi-crop model.
        # This method helps us interpret predictions from a model trained on several crops,
        # not just wheat. It tries to map the model's output to the most likely wheat disease,
        # and also handles cases where the model might confuse wheat with similar crops like rice or corn.
        # This is a temporary workaround until we have a dedicated wheat disease model.

        logger.info(f"🦗 Parsing wheat label: '{label}'")
        
        # First, check if it's a valid wheat class
        if "Wheat" in label:
            # Extract the disease/condition part after "Wheat"
            parts = label.split("Wheat")
            if len(parts) > 1:
                condition_part = parts[1].strip("_").replace("_", " ").strip()
                condition = condition_part.title()
                logger.info(f"🦗 ✅ Valid wheat prediction: '{label}' -> Wheat, {condition}")
                return ("Wheat", condition)
        
        # Handle cereal crop misclassifications (rice and corn)
        if "Rice" in label:
            # Extract disease from rice label and map to wheat
            parts = label.split("Rice")
            if len(parts) > 1:
                condition_part = parts[1].strip("_").replace("_", " ").strip()
                # Map rice diseases to wheat equivalents
                rice_to_wheat_mapping = {
                    "brown spot": "Brown Spot Disease",
                    "healthy": "Healthy",
                    "leaf blast": "Leaf Blast Disease"
                }
                condition = rice_to_wheat_mapping.get(condition_part.lower(), f"{condition_part.title()} Disease")
                logger.info(f"🦗 🔄 Rice misclassification: '{label}' -> Wheat, {condition}")
                return ("Wheat", condition)
        
        if "Corn" in label:
            # Extract disease from corn label and map to wheat
            parts = label.split("Corn")
            if len(parts) > 1:
                condition_part = parts[1].strip("_").replace("_", " ").strip()
                # Map corn diseases to wheat equivalents
                corn_to_wheat_mapping = {
                    "common rust": "Rust Disease",
                    "gray leaf spot": "Leaf Spot Disease",
                    "healthy": "Healthy",
                    "leaf blight": "Leaf Blight Disease"
                }
                condition = corn_to_wheat_mapping.get(condition_part.lower(), f"{condition_part.title()} Disease")
                logger.info(f"🦗 🔄 Corn misclassification: '{label}' -> Wheat, {condition}")
                return ("Wheat", condition)
        
        # For potato and other non-cereal crops, suggest expert consultation
        if "Potato" in label:
            logger.warning(f"🦗 ⚠️ Wheat model predicted potato class: '{label}' - unlikely misclassification")
            logger.warning(f"🦗    Potato has distinct leaves, this suggests wrong crop in image")
            return ("Wheat", "Needs Expert Diagnosis - Possible Wrong Crop")
        
        # For other unknown classes, try to extract any disease information
        logger.warning(f"🦗 ⚠️ Wheat model predicted unknown class: '{label}'")
        # Try to extract any disease-like terms
        import re
        disease_terms = re.findall(r'[A-Z][a-z]+(?:_[A-Z][a-z]+)*', label)
        if disease_terms:
            # Remove crop names and join remaining terms
            filtered_terms = [term for term in disease_terms if term.lower() not in ['wheat', 'rice', 'corn', 'potato']]
            if filtered_terms:
                condition = " ".join(filtered_terms).replace("_", " ")
                logger.info(f"🦗 🔍 Extracted condition from unknown class: '{label}' -> Wheat, {condition}")
                return ("Wheat", condition)
        
        return ("Wheat", "Needs Expert Diagnosis")
    
    def _parse_general_label(self, label: str) -> tuple[str, str]:
        """Parse general model labels (same as old pest agent)"""
        # General model parsing logic
        if "_" in label:
            parts = label.split("_")
            if len(parts) >= 2:
                crop = parts[0].title()
                condition = " ".join(parts[1:]).title()
            else:
                crop = "Unknown"
                condition = label.title()
        else:
            crop = "Unknown"
            condition = label.title()
        
        return crop, condition
    
    async def _analyze_with_llm(self, context: str, ml_results: Dict, user_context: Dict) -> Dict[str, Any]:
        """Use LLM to analyze ML results and provide insights"""
        
        prompt = f"""
        You are an expert agricultural pest and disease analyst. Analyze the following ML detection results and provide comprehensive insights:

        ML DETECTION RESULTS:
        {json.dumps(ml_results, indent=2)}

        USER CONTEXT:
        {json.dumps(user_context, indent=2)}

        USER QUERY:
        {context}

        Provide your analysis in the following JSON format:
        {{
            "risk_assessment": "low/medium/high",
            "detection_confidence": 0.0-1.0,
            "identified_issues": ["list", "of", "specific", "issues"],
            "treatment_recommendations": ["list", "of", "treatments"],
            "prevention_measures": ["list", "of", "prevention", "steps"],
            "crop_impact": "minimal/moderate/severe",
            "urgency_level": "low/medium/high",
            "reasoning": "detailed explanation of your analysis",
            "follow_up_actions": ["immediate", "actions", "needed"]
        }}

        Focus on practical farming advice and treatment options.
        """
        
        try:
            response = await self.llm_service.get_completion(prompt)
            # Clean the response to extract JSON (same pattern as other agents)
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()
            
            analysis = json.loads(response)
            return analysis
        except Exception as e:
            logger.error(f"LLM analysis error: {e}")
            logger.error(f"Raw LLM response: {response[:200]}...")
            return self._get_fallback_analysis(ml_results)
    
    async def _make_autonomous_decisions(self, state: PestAgentState) -> PestAgentState:
        """Use LLM to make autonomous decisions about pest detection"""
        
        decision_prompt = f"""
        As an autonomous pest detection agent, analyze the current situation and make decisions:

        CURRENT STATE:
        - User ID: {state.user_id}
        - Location: {state.location}
        - Crop Type: {state.crop_type}
        - Image Available: {bool(state.image_data)}
        - Detected Issues: {len(state.detected_pests)}
        - User Preferences: {state.user_preferences}

        DETECTION RESULTS:
        {json.dumps(state.detected_pests, indent=2) if state.detected_pests else "No detections"}

        Make autonomous decisions about:
        1. Response priority (high/medium/low)
        2. Detail level (summary/comprehensive)
        3. Treatment urgency
        4. Follow-up monitoring needs
        5. User education requirements

        Provide decisions in JSON format:
        {{
            "response_priority": "high/medium/low",
            "detail_level": "summary/comprehensive",
            "treatment_urgency": "immediate/soon/monitor",
            "monitoring_frequency": "daily/weekly/monthly",
            "education_needed": true/false,
            "reasoning": "explanation of decisions"
        }}
        """
        
        try:
            response = await self.llm_service.get_completion(decision_prompt)
            # Clean the response to extract JSON (same pattern as other agents)
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()
            
            decisions = json.loads(response)
            state.llm_decisions.append(decisions)
            state.decisions_made.append({
                "timestamp": datetime.now().isoformat(),
                "type": "llm_decision",
                "decisions": decisions
            })
            return state
        except Exception as e:
            logger.error(f"LLM decision making error: {e}")
            logger.error(f"Raw LLM response: {response[:200]}...")
            return state
    
    async def _generate_personalized_response(self, state: PestAgentState, language: str = "en") -> str:
        """Use LLM to generate personalized pest detection response"""
        
        # Set language-specific instructions
        if language == "hi":
            language_instruction = "RESPOND IN HINDI ONLY. Use simple Hindi that farmers can understand easily."
        else:
            language_instruction = "RESPOND IN ENGLISH ONLY. Use simple English that farmers can understand easily."
        
        response_prompt = f"""
        Generate a personalized pest detection response for a farmer in a single, conversational paragraph.

        {language_instruction}

        USER CONTEXT:
        - Location: {state.location}
        - Crop: {state.crop_type}
        - User Preferences: {state.user_preferences}

        DETECTION RESULTS:
        {json.dumps(state.detected_pests, indent=2) if state.detected_pests else "No pests detected"}

        LLM ANALYSIS:
        {state.llm_reasoning}

        DECISIONS MADE:
        {json.dumps(state.llm_decisions[-1] if state.llm_decisions else {}, indent=2)}

        Based on the data above, generate a helpful, personalized response. Your response must clearly explain what was detected, provide specific treatment recommendations, include prevention measures, use an appropriate urgency level, and offer practical next steps.

        IMPORTANT INSTRUCTION: Do NOT use bullet points, numbered lists, bolding, sections, or any special formatting. The entire response must be a single block of simple text that is easy for a farmer to understand.
        """
        try:
            response = await self.llm_service.get_completion(response_prompt)
            return response
        except Exception as e:
            logger.error(f"LLM response generation error: {e}")
            return self._get_fallback_response(state)
    
    async def _learn_from_interaction(self, state: PestAgentState) -> PestAgentState:
        """Use LLM to learn from the interaction"""
        
        learning_prompt = f"""
        As an autonomous pest detection agent, analyze this interaction for learning:

        INTERACTION SUMMARY:
        - User Query: {state.conversation_history[-1].get('query', '') if state.conversation_history else 'N/A'}
        - Detection Results: {len(state.detected_pests)} issues found
        - Response Generated: {state.detected_pests[0].get('response', 'N/A') if state.detected_pests else 'N/A'}
        - Confidence Level: {state.confidence_level}

        What should the agent learn from this interaction?
        Provide insights in JSON format:
        {{
            "user_preferences_update": {{"key": "value"}},
            "improvement_areas": ["area1", "area2"],
            "success_factors": ["factor1", "factor2"],
            "adaptation_needed": true/false,
            "learning_insights": "detailed insights"
        }}
        """
        
        try:
            response = await self.llm_service.get_completion(learning_prompt)
            # Clean the response to extract JSON (same pattern as other agents)
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()
            
            learning_data = json.loads(response)
            
            # Update user preferences
            if "user_preferences_update" in learning_data:
                state.user_preferences.update(learning_data["user_preferences_update"])
            
            # Update improvement areas
            if "improvement_areas" in learning_data:
                state.improvement_areas.extend(learning_data["improvement_areas"])
            
            # Update learning insights
            state.learning_insights.update({
                "last_learning": datetime.now().isoformat(),
                "insights": learning_data.get("learning_insights", ""),
                "success_factors": learning_data.get("success_factors", [])
            })
            
            return state
        except Exception as e:
            logger.error(f"LLM learning error: {e}")
            return state
    
    def _get_fallback_analysis(self, ml_results: Dict) -> Dict[str, Any]:
        """Fallback analysis when LLM fails"""
        has_detection = any(
            result.get('detected', False) 
            for result in ml_results.values()
        )
        
        return {
            "risk_assessment": "high" if has_detection else "low",
            "detection_confidence": 0.5,
            "identified_issues": ["Basic analysis due to limited data"],
            "treatment_recommendations": ["Consult local agricultural expert"],
            "prevention_measures": ["Regular monitoring", "Good agricultural practices"],
            "crop_impact": "unknown",
            "urgency_level": "medium" if has_detection else "low",
            "reasoning": "Basic analysis due to limited data",
            "follow_up_actions": ["Get expert consultation"]
        }
    
    def _get_fallback_response(self, state: PestAgentState) -> str:
        """Fallback response when LLM fails"""
        if not state.detected_pests:
            return """
🦗 **Pest Detection Results**

**Analysis Complete:**
• No pests or diseases detected in the image
• Your crop appears to be healthy

**Recommendations:**
• Continue regular monitoring
• Maintain good agricultural practices
• Check again if you notice any changes

*Note: This is a basic analysis. For detailed insights, please try again.*
            """.strip()
        
        # Generate response based on detected pests
        response_parts = ["🦗 **Pest Detection Results**\n"]
        response_parts.append("**Analysis Complete:**")
        
        for pest in state.detected_pests:
            crop = pest.get('crop', 'Crop')
            condition = pest.get('condition', 'Issue detected')
            confidence = pest.get('confidence', 0.0)
            
            response_parts.append(f"• **{crop}**: {condition} (Confidence: {confidence:.1%})")
        
        response_parts.append("\n**Recommendations:**")
        response_parts.append("• Consult with local agricultural expert")
        response_parts.append("• Monitor crop health regularly")
        response_parts.append("• Consider preventive measures")
        response_parts.append("\n*Note: This is a basic analysis. For detailed treatment advice, please try again.*")
        
        return "\n".join(response_parts)
    
    # Main interface method (maintains compatibility)
    async def detect_pests(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main interface method - uses LLM + ML hybrid approach
        """
        try:
            # Create initial state
            state = PestAgentState(
                user_id=context.get('user_id', 'unknown'),
                session_id=f"session_{int(asyncio.get_event_loop().time())}",
                image_data=context.get('image', ''),
                crop_type=context.get('crop', ''),
                location=context.get('location', ''),
                conversation_history=context.get('conversation_history', [])
            )
            
            # Step 1: Analyze image with ML models (same as old pest agent)
            ml_results = {}
            if state.image_data:
                logger.info("🦗 Image data found, starting ML analysis...")
                # Create context for crop detection
                analysis_context = {
                    'crop': state.crop_type,
                    'query': context.get('query', ''),
                    'user_profile': context.get('user_profile', {})
                }
                
                try:
                    ml_results = await self._analyze_image_with_ml(state.image_data, analysis_context)
                    logger.info(f"🦗 ML analysis completed: {ml_results}")
                    
                    # Convert ML results to detected pests format
                    detected_issues = []
                    
                    if ml_results.get('crop_detection', {}).get('detected', False):
                        detected_issues.append({
                            'type': 'disease' if 'disease' in ml_results['crop_detection'].get('condition', '').lower() else 'pest',
                            'confidence': ml_results['crop_detection']['confidence'],
                            'class_id': ml_results['crop_detection']['class_id'],
                            'crop': ml_results['crop_detection'].get('crop', ''),
                            'condition': ml_results['crop_detection'].get('condition', ''),
                            'predicted_class': ml_results['crop_detection'].get('predicted_class', ''),
                            'model_used': ml_results['crop_detection'].get('model_used', '')
                        })
                    
                    state.detected_pests = detected_issues
                    logger.info(f"🦗 Detected pests: {len(detected_issues)}")
                    
                except Exception as e:
                    logger.error(f"🦗 ML analysis failed: {e}")
                    ml_results = {'error': str(e)}
            else:
                logger.warning("🦗 No image data provided for analysis")
                ml_results = {}
            
            # If no ML results available, still provide basic response
            if not ml_results or ml_results.get('error'):
                logger.info("🦗 Using fallback response due to no ML results")
                state.confidence_level = 0.0
                state.detected_pests = []
            
            # Step 2: Use LLM for analysis (optional - fallback if fails)
            if ml_results and not ml_results.get('error'):
                try:
                    user_context = {
                        "location": state.location,
                        "crop_type": state.crop_type,
                        "user_preferences": state.user_preferences,
                        "conversation_history": state.conversation_history[-3:]
                    }
                    
                    llm_analysis = await self._analyze_with_llm(
                        context.get('query', ''),
                        ml_results,
                        user_context
                    )
                    state.llm_reasoning = llm_analysis.get('reasoning', '')
                    state.confidence_level = llm_analysis.get('detection_confidence', 0.5)
                    
                    # Update detected pests with LLM insights
                    for pest in state.detected_pests:
                        pest.update({
                            'risk_assessment': llm_analysis.get('risk_assessment', 'medium'),
                            'treatment_recommendations': llm_analysis.get('treatment_recommendations', []),
                            'prevention_measures': llm_analysis.get('prevention_measures', [])
                        })
                except Exception as e:
                    logger.warning(f"LLM analysis failed, using ML-only results: {e}")
                    # Use ML results directly without LLM enhancement
                    if ml_results.get('crop_detection'):
                        state.confidence_level = ml_results['crop_detection'].get('confidence', 0.5)
                        for pest in state.detected_pests:
                            pest.update({
                                'risk_assessment': 'medium',
                                'treatment_recommendations': ['Consult local agricultural expert'],
                                'prevention_measures': ['Regular monitoring', 'Good agricultural practices']
                            })
                    else:
                        # No ML results available
                        state.confidence_level = 0.0
                        state.detected_pests = []
            
            # Step 3: Make autonomous decisions (optional)
            try:
                state = await self._make_autonomous_decisions(state)
            except Exception as e:
                logger.warning(f"Autonomous decisions failed: {e}")
                # Continue without autonomous decisions
            
            # Step 4: Generate personalized response
            language = context.get('language', 'en')
            try:
                response = await self._generate_personalized_response(state, language)
            except Exception as e:
                logger.warning(f"Personalized response generation failed: {e}")
                response = self._get_fallback_response(state)
            
            # Step 5: Learn from interaction (optional)
            try:
                state = await self._learn_from_interaction(state)
            except Exception as e:
                logger.warning(f"Learning from interaction failed: {e}")
                # Continue without learning
            
            # Update conversation history
            state.conversation_history.append({
                "timestamp": datetime.now().isoformat(),
                "type": "agent_response",
                "content": response,
                "decisions": state.decisions_made,
                "confidence": state.confidence_level
            })
            
            # Return response in expected format
            return {
                "detected_pests": state.detected_pests,
                "response": response,
                "confidence": state.confidence_level,
                "agent_insights": {
                    "decisions_made": len(state.decisions_made),
                    "llm_reasoning": state.llm_reasoning,
                    "adaptation_count": self.adaptation_count,
                    "learning_insights": state.learning_insights
                }
            }
            
        except Exception as e:
            logger.error(f"Real Pest Agent error: {e}")
            return {
                "detected_pests": [],
                "response": "Pest detection agent encountered an error. Please try again.",
                "confidence": 0.0,
                "error": str(e)
            }

# Global real pest agent instance
real_pest_agent = RealPestAgent()
