from langchain_openai import AzureChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from config import Config
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class LLMService:
    """
    Service for handling LLM interactions using Azure OpenAI GPT-4.
    Handles intent classification and response generation.
    """
    
    def __init__(self):
        self.llm = None
        self.initialized = False
        
        try:
            # Check if required config is available
            if not Config.AZURE_OPENAI_API_KEY or not Config.AZURE_OPENAI_ENDPOINT:
                logger.warning("Azure OpenAI credentials not configured - LLM features will use fallbacks")
                return
            
            self.llm = AzureChatOpenAI(
                azure_endpoint=Config.AZURE_OPENAI_ENDPOINT,
                api_key=Config.AZURE_OPENAI_API_KEY,
                api_version=Config.AZURE_OPENAI_API_VERSION,
                deployment_name=Config.AZURE_OPENAI_DEPLOYMENT_NAME,
                temperature=0.1,
                max_tokens=2000,  # Increased for comprehensive responses
                model_name="gpt-4",
                request_timeout=300  # 5 minutes timeout for long-running operations
            )
            self.initialized = True
            logger.info("LLM Service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize LLM Service: {e}")
            logger.info("LLM Service will use fallback methods")
    
    async def classify_intent(self, query: str, language: str = "en", input_type: str = "text") -> Dict[str, Any]:
        """
        Classify user intent using Azure OpenAI GPT-4.
        Determines whether query is about weather, pest detection, or general farming.
        """
        
        # For image inputs, automatically classify as pest detection
        if input_type == "image":
            return {
                "intent": "pest",
                "confidence": 0.95,
                "entities": {"detected_from": "image_input"},
                "reasoning": "Image input automatically classified as pest detection query"
            }
        
        # Try LLM classification if available
        if self.initialized and self.llm:
            try:
                system_prompt = """You are an agricultural AI assistant specializing in intent classification. 

Classify the user query into one of these categories:
- weather: Questions about weather, climate, rainfall, temperature, farming conditions, harvest timing
- pest: Questions about plant diseases, pests, crop health, plant problems, leaf issues, disease identification
- finance_policy: Questions about government schemes, subsidies, loans, crop insurance, financial policies
- market_price: Questions about mandi prices, market rates, selling/buying advice, price trends
- general_agriculture: General farming questions, soil health, irrigation, crop management, farming methods, equipment
- non_agricultural: Queries completely unrelated to agriculture (e.g., politics, entertainment, sports, personal life, cooking, travel, health, education, business)
- greeting: Simple greetings, introductions, or casual conversation starters

IMPORTANT GUIDELINES:
1. Consider CONTEXT, not just keywords. A word like "cricket" could be about cricket farming (agricultural) or cricket sports (non-agricultural)
2. Look for farming/agricultural context in the query
3. If the query mentions crops, farming, soil, weather, or agricultural activities, classify as agricultural
4. If the query is about completely unrelated topics (politics, entertainment, sports, etc.), classify as non_agricultural
5. If it's a simple greeting without agricultural context, classify as greeting

Extract relevant entities:
- crop: Any crop/plant names mentioned (rice, wheat, tomato, etc.)
- location: Any location/place names mentioned
- problem: Specific problems mentioned (spots, yellowing, etc.)

Return ONLY a valid JSON with this exact structure:
{
    "intent": "category",
    "confidence": 0.0-1.0,
    "entities": {
        "crop": "crop_name or null",
        "location": "location or null", 
        "problem": "problem_description or null"
    },
    "reasoning": "brief explanation of classification"
}"""
                
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"Query: {query}\nLanguage: {language}")
                ]
                
                response = await self.llm.ainvoke(messages)
                
                # Parse JSON response
                result = json.loads(response.content.strip())
                
                # Validate response structure
                required_keys = ["intent", "confidence", "entities", "reasoning"]
                if all(key in result for key in required_keys):
                    logger.info(f"Intent classified: {result['intent']} (confidence: {result['confidence']})")
                    return result
                    
            except Exception as e:
                logger.warning(f"LLM intent classification failed: {e}, using fallback")
        
        # Use fallback classification
        return self._get_fallback_intent(query)
    
    async def generate_response(self, context: Dict[str, Any], language: str = "en") -> str:
        """
        Generate natural language response from agent outputs.
        Combines information from weather and pest detection agents.
        """
        
        # Try LLM response generation if available
        if self.initialized and self.llm:
            try:
                # Create context summary
                context_parts = []
                
                if context.get("weather"):
                    weather = context["weather"]
                    context_parts.append(f"Weather Information: {weather}")
                    
                if context.get("pest"):
                    pest = context["pest"]
                    context_parts.append(f"Pest/Disease Analysis: {pest}")
                    
                if context.get("error"):
                    context_parts.append(f"Error encountered: {context['error']}")
                
                context_summary = "\n".join(context_parts) if context_parts else "No specific analysis available"
                
                system_prompt = f"""You are Krishi Bandhu, a helpful and knowledgeable agricultural advisor. 
                
Generate a natural, conversational response in {language} based on the provided context.

Guidelines:
- Keep responses practical, actionable, and farmer-friendly
- Use simple, clear language appropriate for farmers
- Include confidence levels when available
- Keep responses CONCISE (max 2-3  for simple queries, max 8-12 sentences for very complex queries)
- Provide specific recommendations when possible
- For pest detection: Include short treatment suggestions and prevention tips
- For weather advice: Include short farming recommendations based on conditions
- Always be encouraging and supportive
- If you don't have enough information, be honest about limitations
- Keep responses CONCISE (max 2-3  for simple queries, max 8-12 sentences for very complex queries)
- Focus on the most important information first
- Avoid unnecessary repetition or verbose explanations

Context provided: {context_summary}

Generate a helpful response addressing the farmer's query."""
                
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"Please provide advice based on the context above. Intent: {context.get('intent', 'general')}")
                ]
                
                response = await self.llm.ainvoke(messages)
                return response.content.strip()
                
            except Exception as e:
                logger.warning(f"LLM response generation failed: {e}, using fallback")
        
        # Use fallback response generation
        return self._generate_fallback_response(context, language)
    
    async def get_completion(self, prompt: str, language: str = "en") -> str:
        """
        Get completion for a given prompt using Azure OpenAI GPT-4.
        This method maintains compatibility with market tools.
        """
        if self.initialized and self.llm:
            try:
                messages = [
                    SystemMessage(content="You are an agricultural market data analyst. Provide accurate and helpful information."),
                    HumanMessage(content=prompt)
                ]
                
                response = await self.llm.ainvoke(messages)
                return response.content.strip()
                
            except Exception as e:
                logger.warning(f"LLM completion failed: {e}, using fallback")
        
        # Fallback response
        if language == "hi":
            return "कीमत जानकारी उपलब्ध नहीं है। कृपया स्थानीय मंडी से संपर्क करें।"
        else:
            return "Price information not available. Please contact local mandi for current rates."
    
    def _generate_fallback_response(self, context: Dict[str, Any], language: str = "en") -> str:
        """Generate fallback response when LLM is not available"""
        intent = context.get("intent", "general")
        
        if language == "hi":
            if intent == "weather" and context.get("weather"):
                weather = context["weather"]
                return f"""🌤️ मौसम की जानकारी: {weather.get('location', 'आपके क्षेत्र')} में वर्तमान तापमान {weather.get('current_weather', {}).get('temperature', 'N/A')}°C है।

💡 कृषि सलाह:
{chr(10).join(weather.get('agricultural_advice', ['सामान्य कृषि गतिविधियां जारी रखें']))}

📋 सिफारिशें:
{chr(10).join(weather.get('recommendations', ['स्थानीय मौसम की जानकारी के लिए संपर्क करें']))}"""
            
            elif intent == "pest" and context.get("pest"):
                pest = context["pest"]
                analysis = pest.get("image_analysis", {})
                disease_info = pest.get("disease_info", {})
                
                return f"""🔍 पौधे का विश्लेषण: {analysis.get('prediction', 'N/A')} (विश्वास: {analysis.get('confidence', 0):.1%})

🌱 फसल: {disease_info.get('crop', 'N/A')}
🦠 स्थिति: {disease_info.get('condition', 'N/A')}

💊 उपचार सिफारिशें:
{chr(10).join(pest.get('treatment_recommendations', ['स्थानीय कृषि विशेषज्ञ से सलाह लें']))}

🛡️ निवारक उपाय:
{chr(10).join(pest.get('preventive_measures', ['सामान्य स्वच्छता बनाए रखें']))}"""
            
            else:
                return "आपकी क्वेरी का जवाब तैयार है। कृपया किसी भी अतिरिक्त सहायता के लिए संपर्क करें।"
        
        else:  # English
            if intent == "weather" and context.get("weather"):
                weather = context["weather"]
                return f"""🌤️ Weather Information: Current temperature in {weather.get('location', 'your area')} is {weather.get('current_weather', {}).get('temperature', 'N/A')}°C.

💡 Agricultural Advice:
{chr(10).join(weather.get('agricultural_advice', ['Continue normal farming activities']))}

📋 Recommendations:
{chr(10).join(weather.get('recommendations', ['Contact local weather services for updates']))}"""
            
            elif intent == "pest" and context.get("pest"):
                pest = context["pest"]
                analysis = pest.get("image_analysis", {})
                disease_info = pest.get("disease_info", {})
                
                return f"""🔍 Plant Analysis: {analysis.get('prediction', 'N/A')} (Confidence: {analysis.get('confidence', 0):.1%})

🌱 Crop: {disease_info.get('crop', 'N/A')}
🦠 Condition: {disease_info.get('condition', 'N/A')}

💊 Treatment Recommendations:
{chr(10).join(pest.get('treatment_recommendations', ['Consult local agricultural expert']))}

🛡️ Preventive Measures:
{chr(10).join(pest.get('preventive_measures', ['Maintain general hygiene']))}"""
            
            else:
                return "Your query has been processed. Please contact us for any additional assistance."
    
    def _get_fallback_intent(self, query: str) -> Dict[str, Any]:
        """Fallback intent classification using simple keyword matching"""
        query_lower = query.lower()
        
        # Greeting keywords (check first)
        greeting_keywords = [
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening", "namaste", "namaskar",
            "how are you", "कैसे हो", "कैसा है", "नमस्ते", "नमस्कार", "सुप्रभात"
        ]
        if any(keyword in query_lower for keyword in greeting_keywords):
            return {
                "intent": "greeting",
                "confidence": 0.9,
                "entities": {},
                "reasoning": "Greeting detected (fallback)"
            }
        
        # Agricultural keywords (high priority)
        agricultural_keywords = [
            "crop", "farm", "soil", "irrigation", "planting", "harvesting", "फसल", "खेत", "मिट्टी", "सिंचाई",
            "weather", "rain", "temperature", "climate", "forecast", "मौसम", "बारिश",
            "disease", "pest", "spots", "yellow", "brown", "infection", "बीमारी", "कीट",
            "scheme", "subsidy", "loan", "credit", "insurance", "योजना", "सब्सिडी", "ऋण",
            "price", "mandi", "market", "selling", "buying", "मूल्य", "मंडी", "बाजार"
        ]
        
        # Check if query contains agricultural context
        if any(keyword in query_lower for keyword in agricultural_keywords):
            # Further classify agricultural queries
            weather_keywords = ["weather", "rain", "temperature", "climate", "forecast", "मौसम", "बारिश"]
            pest_keywords = ["disease", "pest", "spots", "yellow", "brown", "infection", "बीमारी", "कीट"]
            finance_keywords = ["scheme", "subsidy", "loan", "credit", "insurance", "योजना", "सब्सिडी", "ऋण"]
            market_keywords = ["price", "mandi", "market", "selling", "buying", "मूल्य", "मंडी", "बाजार"]
            
            if any(keyword in query_lower for keyword in weather_keywords):
                return {
                    "intent": "weather",
                    "confidence": 0.7,
                    "entities": {},
                    "reasoning": "Weather-related agricultural query (fallback)"
                }
            elif any(keyword in query_lower for keyword in pest_keywords):
                return {
                    "intent": "pest", 
                    "confidence": 0.7,
                    "entities": {},
                    "reasoning": "Pest/disease-related agricultural query (fallback)"
                }
            elif any(keyword in query_lower for keyword in finance_keywords):
                return {
                    "intent": "finance_policy",
                    "confidence": 0.7,
                    "entities": {},
                    "reasoning": "Finance/policy-related agricultural query (fallback)"
                }
            elif any(keyword in query_lower for keyword in market_keywords):
                return {
                    "intent": "market_price",
                    "confidence": 0.7,
                    "entities": {},
                    "reasoning": "Market price-related agricultural query (fallback)"
                }
            else:
                return {
                    "intent": "general_agriculture",
                    "confidence": 0.6,
                    "entities": {},
                    "reasoning": "General agricultural query (fallback)"
                }
        
        # If no agricultural context found, likely non-agricultural
        return {
            "intent": "non_agricultural",
            "confidence": 0.8,
            "entities": {},
            "reasoning": "No agricultural context detected, likely non-agricultural (fallback)"
        }

    async def analyze_agent_requirements(self, query: str, language: str = "en", input_type: str = "text") -> Dict[str, Any]:
        """
        Analyze query to determine which agents are needed.
        A single query can require multiple agents working together.
        """
        
        # For image inputs, always need pest detection and avoid general agriculture
        if input_type in ["image", "text_image"]:
            return {
                "pest_needed": True,
                "pest_priority": "high",
                "pest_reason": "Image analysis required for plant health assessment",
                "weather_needed": False,
                "weather_priority": "low",
                "weather_reason": "No weather context in image",
                "finance_policy_needed": False,
                "finance_policy_priority": "low",
                "finance_policy_reason": "No financial context in image",
                "market_price_needed": False,
                "market_price_priority": "low",
                "market_price_reason": "No market context in image",
                "general_agriculture_needed": False,
                "general_agriculture_priority": "low",
                "general_agriculture_reason": "Pest agent sufficient for image analysis, avoid unnecessary general advice"
            }
        
        # Try LLM analysis if available
        if self.initialized and self.llm:
            try:
                system_prompt = """You are an agricultural AI assistant specializing in multi-agent requirement analysis. 

Analyze the user query to determine which specialized agents are needed:

AGENTS AVAILABLE:
- weather: For weather, climate, rainfall, temperature, farming conditions, harvest timing
- pest: For plant diseases, pests, crop health, plant problems, disease identification
- finance_policy: For government schemes, subsidies, loans, crop insurance, financial policies
- market_price: For mandi prices, market rates, selling/buying advice, price trends
- general_agriculture: For general farming advice, soil health, irrigation, crop management, farming methods, equipment, seasonal advice, organic farming

IMPORTANT GUIDELINES:
1. Be PRECISE and MINIMAL - only call agents that are specifically needed
2. If specific agents (pest, weather, finance, market) can handle the query, DO NOT call general_agriculture
3. Only call general_agriculture for queries that need general farming advice not covered by specific agents
4. For pest/disease only queries with images, pest agent is sufficient
5. For weather only queries, weather agent is sufficient
6. For financial only queries, finance_policy agent is sufficient
7. For market queries, market_price agent is sufficient
8. Only call multiple agents if the query explicitly asks for multiple types of information

ANALYSIS REQUIREMENTS:
1. Determine if weather agent is needed (weather_needed: true/false)
2. Determine if pest agent is needed (pest_needed: true/false)
3. Determine if finance_policy agent is needed (finance_policy_needed: true/false)
4. Determine if market_price agent is needed (market_price_needed: true/false)
5. Determine if general_agriculture agent is needed (general_agriculture_needed: true/false)
6. Assign priority levels (high/medium/low) for each needed agent
7. Provide reasoning for each agent requirement

Return ONLY a valid JSON with this exact structure:
{
    "weather_needed": true/false,
    "weather_priority": "high/medium/low",
    "weather_reason": "explanation",
    "pest_needed": true/false,
    "pest_priority": "high/medium/low", 
    "pest_reason": "explanation",
    "finance_policy_needed": true/false,
    "finance_policy_priority": "high/medium/low",
    "finance_policy_reason": "explanation",
    "market_price_needed": true/false,
    "market_price_priority": "high/medium/low",
    "market_price_reason": "explanation",
    "general_agriculture_needed": true/false,
    "general_agriculture_priority": "high/medium/low",
    "general_agriculture_reason": "explanation"
}"""
                
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"Query: {query}\nLanguage: {language}")
                ]
                
                response = await self.llm.ainvoke(messages)
                
                # Parse JSON response
                result = json.loads(response.content.strip())
                
                # Validate response structure
                required_keys = ["weather_needed", "weather_priority", "weather_reason", "pest_needed", "pest_priority", "pest_reason", "finance_policy_needed", "finance_policy_priority", "finance_policy_reason", "market_price_needed", "market_price_priority", "market_price_reason", "general_agriculture_needed", "general_agriculture_priority", "general_agriculture_reason"]
                if all(key in result for key in required_keys):
                    logger.info(f"Agent requirements analyzed: weather={result['weather_needed']}, pest={result['pest_needed']}, finance_policy={result['finance_policy_needed']}, market_price={result['market_price_needed']}, general_agriculture={result['general_agriculture_needed']}")
                    return result
                    
            except Exception as e:
                logger.warning(f"LLM agent requirement analysis failed: {e}, using fallback")
        
        # Fallback analysis using keyword matching
        return self._fallback_agent_requirement_analysis(query)
    
    def _fallback_agent_requirement_analysis(self, query: str) -> Dict[str, Any]:
        """Fallback agent requirement analysis using keyword matching"""
        query_lower = query.lower()
        
        # Weather-related keywords
        weather_keywords = [
            "weather", "rain", "sunny", "temperature", "humidity", "forecast", "harvest", "tomorrow",
            "मौसम", "बारिश", "धूप", "तापमान", "आर्द्रता", "पूर्वानुमान", "कटाई", "कल"
        ]
        
        # Pest/disease-related keywords
        pest_keywords = [
            "disease", "pest", "fungus", "infection", "leaf", "plant", "sick", "yellow", "spots",
            "रोग", "कीट", "फंगस", "संक्रमण", "पत्ती", "पौधा", "बीमार", "पीला", "धब्बे"
        ]
        
        # Finance policy-related keywords
        finance_policy_keywords = [
            "scheme", "subsidy", "loan", "credit", "insurance", "pm-kisan", "kcc", "policy", "government",
            "योजना", "सब्सिडी", "ऋण", "क्रेडिट", "बीमा", "पीएम-किसान", "नीति", "सरकार"
        ]
        
        # Market price-related keywords
        market_price_keywords = [
            "price", "mandi", "market", "selling", "buying", "cost", "profit", "rate", "trading",
            "मूल्य", "मंडी", "बाजार", "बिक्री", "खरीद", "लागत", "लाभ", "दर", "व्यापार"
        ]
        
        # General agriculture-related keywords
        general_agriculture_keywords = [
            "soil", "irrigation", "planting", "harvesting", "organic", "farming", "crop management", "equipment", "tools",
            "मिट्टी", "सिंचाई", "बुवाई", "कटाई", "जैविक", "खेती", "फसल प्रबंधन", "उपकरण"
        ]
        
        # Analyze requirements
        weather_needed = any(keyword in query_lower for keyword in weather_keywords)
        pest_needed = any(keyword in query_lower for keyword in pest_keywords)
        finance_policy_needed = any(keyword in query_lower for keyword in finance_policy_keywords)
        market_price_needed = any(keyword in query_lower for keyword in market_price_keywords)
        general_agriculture_needed = any(keyword in query_lower for keyword in general_agriculture_keywords)
        
        # If no specific requirements detected, assume general agriculture for general farming queries
        if not weather_needed and not pest_needed and not finance_policy_needed and not market_price_needed and not general_agriculture_needed:
            general_agriculture_needed = True
            weather_needed = False
            pest_needed = False
            finance_policy_needed = False
            market_price_needed = False
        
        return {
            "weather_needed": weather_needed,
            "weather_priority": "high" if weather_needed else "low",
            "weather_reason": "Weather information relevant to farming query" if weather_needed else "No weather context detected",
            "pest_needed": pest_needed,
            "pest_priority": "high" if pest_needed else "low",
            "pest_reason": "Plant health assessment needed" if pest_needed else "No pest/disease context detected",
            "finance_policy_needed": finance_policy_needed,
            "finance_policy_priority": "high" if finance_policy_needed else "low",
            "finance_policy_reason": "Financial/policy information needed" if finance_policy_needed else "No financial policy context detected",
            "market_price_needed": market_price_needed,
            "market_price_priority": "high" if market_price_needed else "low",
            "market_price_reason": "Market price information needed" if market_price_needed else "No market price context detected",
            "general_agriculture_needed": general_agriculture_needed,
            "general_agriculture_priority": "high" if general_agriculture_needed else "low",
            "general_agriculture_reason": "General agricultural advice needed" if general_agriculture_needed else "No general agriculture context detected"
        }
    
    async def synthesize_multi_agent_response(self, context: Dict[str, Any], language: str = "en") -> str:
        """
        Synthesize responses from multiple agents into a unified, coherent answer.
        This combines insights from weather, pest, and other agents.
        """
        
        # Try LLM synthesis if available
        if self.initialized and self.llm:
            try:
                system_prompt = """You are an agricultural AI assistant specializing in multi-agent response synthesis.

Your task is to combine insights from multiple specialized agents into a unified, coherent answer.

AGENT TYPES:
- weather: Provides weather forecasts, climate information, harvest timing advice
- pest: Provides plant disease analysis, pest identification, crop health assessment
- finance_policy: Provides government schemes, subsidies, loans, crop insurance information
- market_price: Provides mandi prices, market rates, selling/buying advice

SYNTHESIS REQUIREMENTS:
1. Combine information from all available agents
2. Create a coherent, natural response that addresses the user's query
3. Connect insights between agents (e.g., how weather affects pest control timing, how prices affect selling decisions)
4. Provide actionable farming advice based on combined insights
5. Use the specified language (en/hi)

RESPONSE FORMAT:
- Natural, conversational tone
- Logical flow connecting different agent insights
- Specific, actionable recommendations
- Consider crop type and location if provided"""
                
                # Prepare context for LLM
                context_text = f"""
User Query: {context.get('user_query', '')}
Input Type: {context.get('input_type', '')}
Crop Type: {context.get('crop', '')}
Location: {context.get('location', '')}
Language: {language}

Agents Used: {', '.join(context.get('agents_used', []))}

Agent Results:
"""
                
                # Add weather results
                if 'weather' in context.get('agent_results', {}):
                    context_text += f"\nWeather Information:\n{context['agent_results']['weather']}\n"
                
                # Add pest results
                if 'pest' in context.get('agent_results', {}):
                    context_text += f"\nPlant Health Analysis:\n{context['agent_results']['pest']}\n"
                
                # Add finance policy results
                if 'finance_policy' in context.get('agent_results', {}):
                    context_text += f"\nFinancial & Policy Information:\n{context['agent_results']['finance_policy']}\n"
                
                # Add market price results
                if 'market_price' in context.get('agent_results', {}):
                    context_text += f"\nMarket Price Information:\n{context['agent_results']['market_price']}\n"
                
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=context_text)
                ]
                
                response = await self.llm.ainvoke(messages)
                
                logger.info("Multi-agent response synthesis completed using LLM")
                return response.content.strip()
                
            except Exception as e:
                logger.warning(f"LLM multi-agent synthesis failed: {e}, using fallback")
        
        # Fallback synthesis
        fallback_response = self._fallback_multi_agent_synthesis(context, language)
        
        # Add note about market price processing if it's taking time
        if 'market_price' in context.get('agents_used', []) and not context.get('agent_results', {}).get('market_price'):
            if language == "hi":
                fallback_response += "\n\n💡 बाजार मूल्य जानकारी प्राप्त करने में कुछ समय लग रहा है। कृपया कुछ देर प्रतीक्षा करें।"
            else:
                fallback_response += "\n\n💡 Market price information is being retrieved. Please wait a moment."
        
        return fallback_response
    
    def _fallback_multi_agent_synthesis(self, context: Dict[str, Any], language: str = "en") -> str:
        """Fallback multi-agent response synthesis"""
        try:
            response_parts = []
            
            # Add weather information if available
            if 'weather' in context.get('agent_results', {}) and context['agent_results']['weather']:
                if language == "hi":
                    response_parts.append("मौसम की जानकारी के अनुसार:")
                else:
                    response_parts.append("Based on weather information:")
                
                weather_data = context['agent_results']['weather']
                if isinstance(weather_data, dict):
                    if language == "hi":
                        response_parts.append(f"तापमान {weather_data.get('temperature', 'N/A')}°C, आर्द्रता {weather_data.get('humidity', 'N/A')}%")
                    else:
                        response_parts.append(f"Temperature {weather_data.get('temperature', 'N/A')}°C, Humidity {weather_data.get('humidity', 'N/A')}%")
                else:
                    response_parts.append(str(weather_data))
            
            # Add pest information if available
            if 'pest' in context.get('agent_results', {}) and context['agent_results']['pest']:
                if response_parts:
                    response_parts.append("\n")
                
                if language == "hi":
                    response_parts.append("पौधे की स्वास्थ्य स्थिति:")
                else:
                    response_parts.append("Plant health assessment:")
                
                pest_data = context['agent_results']['pest']
                if isinstance(pest_data, dict):
                    if language == "hi":
                        response_parts.append(f"रोग: {pest_data.get('disease', 'N/A')}, सिफारिश: {pest_data.get('recommendation', 'N/A')}")
                    else:
                        response_parts.append(f"Disease: {pest_data.get('disease', 'N/A')}, Recommendation: {pest_data.get('recommendation', 'N/A')}")
                else:
                    response_parts.append(str(pest_data))
            
            # Add finance information if available
            if 'finance' in context.get('agent_results', {}) and context['agent_results']['finance']:
                if response_parts:
                    response_parts.append("\n")
                
                if language == "hi":
                    response_parts.append("वित्तीय और नीति जानकारी:")
                else:
                    response_parts.append("Financial & Policy Information:")
                
                finance_data = context['agent_results']['finance']
                if isinstance(finance_data, dict):
                    if language == "hi":
                        if 'formatted_response' in finance_data:
                            response_parts.append(finance_data['formatted_response'])
                        else:
                            response_parts.append(f"सलाह: {finance_data.get('message', 'N/A')}")
                    else:
                        if 'formatted_response' in finance_data:
                            response_parts.append(finance_data['formatted_response'])
                        else:
                            response_parts.append(f"Advice: {finance_data.get('message', 'N/A')}")
                else:
                    response_parts.append(str(finance_data))
            
            # Add market price information if available
            if 'market_price' in context.get('agent_results', {}) and context['agent_results']['market_price']:
                if response_parts:
                    response_parts.append("\n")
                
                if language == "hi":
                    response_parts.append("बाजार मूल्य जानकारी:")
                else:
                    response_parts.append("Market Price Information:")
                
                market_data = context['agent_results']['market_price']
                if isinstance(market_data, dict):
                    if market_data.get('success'):
                        # Extract price data
                        price_data = market_data.get('data', [])
                        if price_data:
                            if language == "hi":
                                response_parts.append(f"{market_data.get('commodity', 'फसल')} के वर्तमान बाजार मूल्य:")
                            else:
                                response_parts.append(f"Current market prices for {market_data.get('commodity', 'crop')}:")
                            
                            for i, price_record in enumerate(price_data[:3]):  # Show first 3 prices
                                mandi = price_record.get('mandi', 'Unknown')
                                price = price_record.get('price', 'N/A')
                                if language == "hi":
                                    response_parts.append(f"• {mandi}: {price}")
                                else:
                                    response_parts.append(f"• {mandi}: {price}")
                        
                        # Add personalized analysis if available
                        if 'personalized_analysis' in market_data:
                            if response_parts:
                                response_parts.append("\n")
                            response_parts.append(market_data['personalized_analysis'])
                    else:
                        # If market data failed, show error message
                        if language == "hi":
                            response_parts.append(f"बाजार मूल्य जानकारी उपलब्ध नहीं है: {market_data.get('message', '')}")
                        else:
                            response_parts.append(f"Market price information not available: {market_data.get('message', '')}")
                else:
                    response_parts.append(str(market_data))
            
            # Add crop-specific advice
            if context.get('crop'):
                if response_parts:
                    response_parts.append("\n")
                
                if language == "hi":
                    response_parts.append(f"{context['crop']} की फसल के लिए विशेष सलाह:")
                else:
                    response_parts.append(f"Specific advice for {context['crop']} crop:")
                
                if language == "hi":
                    response_parts.append("कृपया स्थानीय कृषि विशेषज्ञ से भी सलाह लें।")
                else:
                    response_parts.append("Please also consult with a local agricultural expert.")
            
            # Combine all parts
            if response_parts:
                return " ".join(response_parts)
            else:
                if language == "hi":
                    return "आपकी क्वेरी का जवाब तैयार है। कृपया किसी भी अतिरिक्त सहायता के लिए संपर्क करें।"
                else:
                    return "Your query has been processed. Please contact us for any additional assistance."
                    
        except Exception as e:
            logger.error(f"Fallback multi-agent synthesis error: {e}")
            if language == "hi":
                return "माफ करें, एक समस्या आई है। कृपया दोबारा कोशिश करें।"
            else:
                return "I apologize, there was an issue. Please try again."

# Global LLM service instance
llm_service = LLMService()