#!/usr/bin/env python3
"""
💰 Real Market Price Agent - LLM + Web Scraping Hybrid

A true autonomous agent that:
- Uses LLM for reasoning and decision making
- Keeps web scraping for market data
- Has memory and learning capabilities
- Makes autonomous decisions about market analysis
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, field
import json
import aiohttp
from bs4 import BeautifulSoup

from services.llm_service import LLMService
from agents.market_tools.tier1_direct_scrape import DirectScrapeTool
from agents.market_tools.tier2_gpt_location_search import GPTLocationSearchTool
from agents.market_tools.tier3_gpt_global_search import GPTGlobalSearchTool

logger = logging.getLogger(__name__)

@dataclass
class MarketAgentState:
    """State management for the Market Price Agent"""
    # Core state
    user_id: str
    session_id: str
    current_goal: str = "get_market_prices"
    
    # Memory and learning
    conversation_history: List[Dict] = field(default_factory=list)
    user_preferences: Dict[str, Any] = field(default_factory=dict)
    learning_insights: Dict[str, Any] = field(default_factory=dict)
    
    # Market data
    commodity: str = ""
    location: str = ""
    market_data: List[Dict] = field(default_factory=list)
    price_trends: Dict[str, Any] = field(default_factory=dict)
    
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

class RealMarketAgent:
    """
    Autonomous Market Price Agent with LLM reasoning + Web scraping
    """
    
    def __init__(self):
        self.llm_service = LLMService()
        self.learning_threshold = 0.7
        self.adaptation_count = 0
        
        # Initialize market tools (keeping original functionality)
        self.tier1_tool = DirectScrapeTool()
        self.tier2_tool = GPTLocationSearchTool()
        self.tier3_tool = GPTGlobalSearchTool()
        
        logger.info("💰 Real Market Agent initialized with LLM + Web scraping capabilities")
    
    async def _gather_market_data(self, commodity: str, location: str, language: str = "en") -> List[Dict[str, Any]]:
        """Use web scraping tools to gather market data"""
        try:
            market_data = []
            
            # Try Tier 1: Direct scraping
            try:
                tier1_data = await self.tier1_tool.execute(commodity, location, language)
                if tier1_data:
                    market_data.extend(tier1_data)
                    logger.info(f"💰 Market Agent: Tier 1 data gathered for {commodity} in {language}")
            except Exception as e:
                logger.warning(f"Tier 1 scraping failed: {e}")
            
            # Try Tier 2: GPT location search if Tier 1 didn't provide enough data
            if len(market_data) < 3:
                try:
                    tier2_data = await self.tier2_tool.execute(commodity, location, language)
                    if tier2_data:
                        market_data.extend(tier2_data)
                        logger.info(f"💰 Market Agent: Tier 2 data gathered for {commodity} in {language}")
                except Exception as e:
                    logger.warning(f"Tier 2 scraping failed: {e}")
            
            # Try Tier 3: Global search if still need more data
            if len(market_data) < 5:
                try:
                    tier3_data = await self.tier3_tool.execute(commodity, location, language)
                    if tier3_data:
                        market_data.extend(tier3_data)
                        logger.info(f"💰 Market Agent: Tier 3 data gathered for {commodity} in {language}")
                except Exception as e:
                    logger.warning(f"Tier 3 scraping failed: {e}")
            
            return market_data
            
        except Exception as e:
            logger.error(f"Market data gathering error: {e}")
            return []
    
    async def _analyze_market_trends(self, market_data: List[Dict]) -> Dict[str, Any]:
        """Use LLM to analyze market trends and patterns"""
        
        prompt = f"""
        You are an expert agricultural market analyst. Analyze the following market data and identify trends:

        MARKET DATA:
        {json.dumps(market_data, indent=2)}

        Provide your analysis in the following JSON format:
        {{
            "price_trend": "rising/falling/stable",
            "trend_strength": "weak/moderate/strong",
            "price_range": {{"min": 0, "max": 0, "avg": 0}},
            "market_volatility": "low/medium/high",
            "seasonal_factors": ["factor1", "factor2"],
            "demand_supply": "demand_high/supply_high/balanced",
            "forecast": "optimistic/neutral/pessimistic",
            "recommendations": ["rec1", "rec2"],
            "reasoning": "detailed explanation of your analysis"
        }}

        Focus on practical insights for farmers.
        """
        
        try:
            response = await self.llm_service.get_completion(prompt)
            
            # Handle empty or invalid responses
            if not response or response.strip() == "":
                logger.warning("LLM returned empty response for market analysis")
                return self._get_fallback_market_analysis(market_data)
            
            # Clean the response - remove markdown code blocks if present
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]  # Remove ```
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # Remove trailing ```
            
            # Try to parse JSON
            try:
                analysis = json.loads(cleaned_response)
                return analysis
            except json.JSONDecodeError as json_error:
                logger.error(f"Failed to parse LLM response as JSON: {response}")
                logger.error(f"Cleaned response: {cleaned_response}")
                logger.error(f"JSON error: {json_error}")
                return self._get_fallback_market_analysis(market_data)
                
        except Exception as e:
            logger.error(f"LLM market analysis error: {e}")
            return self._get_fallback_market_analysis(market_data)
    
    async def _make_autonomous_decisions(self, state: MarketAgentState) -> MarketAgentState:
        """Use LLM to make autonomous decisions about market analysis"""
        
        decision_prompt = f"""
        As an autonomous market price agent, analyze the current situation and make decisions:

        CURRENT STATE:
        - User ID: {state.user_id}
        - Location: {state.location}
        - Commodity: {state.commodity}
        - Market Data Available: {len(state.market_data)} records
        - User Preferences: {state.user_preferences}

        MARKET DATA:
        {json.dumps(state.market_data[:3], indent=2) if state.market_data else "No market data"}

        Make autonomous decisions about:
        1. Response priority (high/medium/low)
        2. Detail level (summary/comprehensive)
        3. Trend analysis depth
        4. Recommendation specificity
        5. Follow-up monitoring needs

        Provide decisions in JSON format:
        {{
            "response_priority": "high/medium/low",
            "detail_level": "summary/comprehensive",
            "trend_analysis_depth": "basic/detailed",
            "recommendation_specificity": "general/specific",
            "monitoring_frequency": "daily/weekly/monthly",
            "reasoning": "explanation of decisions"
        }}
        """
        
        try:
            response = await self.llm_service.get_completion(decision_prompt)
            
            # Handle empty or invalid responses
            if not response or response.strip() == "":
                logger.warning("LLM returned empty response for decision making")
                # Use default decisions
                decisions = {
                    "response_priority": "medium",
                    "detail_level": "summary",
                    "trend_analysis_depth": "basic",
                    "recommendation_specificity": "general",
                    "monitoring_frequency": "weekly",
                    "reasoning": "Default decisions due to LLM response failure"
                }
            else:
                # Try to parse JSON
                try:
                    # Clean the response - remove markdown code blocks if present
                    cleaned_response = response.strip()
                    if cleaned_response.startswith("```json"):
                        cleaned_response = cleaned_response[7:]  # Remove ```json
                    if cleaned_response.startswith("```"):
                        cleaned_response = cleaned_response[3:]  # Remove ```
                    if cleaned_response.endswith("```"):
                        cleaned_response = cleaned_response[:-3]  # Remove trailing ```
                    
                    decisions = json.loads(cleaned_response)
                except json.JSONDecodeError as json_error:
                    logger.error(f"Failed to parse LLM response as JSON: {response}")
                    logger.error(f"Cleaned response: {cleaned_response}")
                    logger.error(f"JSON error: {json_error}")
                    # Use default decisions
                    decisions = {
                        "response_priority": "medium",
                        "detail_level": "summary",
                        "trend_analysis_depth": "basic",
                        "recommendation_specificity": "general",
                        "monitoring_frequency": "weekly",
                        "reasoning": "Default decisions due to JSON parsing failure"
                    }
            
            state.llm_decisions.append(decisions)
            state.decisions_made.append({
                "timestamp": datetime.now().isoformat(),
                "type": "llm_decision",
                "decisions": decisions
            })
            return state
            
        except Exception as e:
            logger.error(f"LLM decision making error: {e}")
            # Use default decisions on error
            decisions = {
                "response_priority": "medium",
                "detail_level": "summary",
                "trend_analysis_depth": "basic",
                "recommendation_specificity": "general",
                "monitoring_frequency": "weekly",
                "reasoning": "Default decisions due to LLM error"
            }
            state.llm_decisions.append(decisions)
            state.decisions_made.append({
                "timestamp": datetime.now().isoformat(),
                "type": "llm_decision",
                "decisions": decisions
            })
            return state
    
    async def _generate_personalized_response(self, state: MarketAgentState, language: str = "en") -> str:
        """Use LLM to generate personalized market analysis response"""
        
        # Get user context for personalization
        user_profile = state.user_preferences.get('user_profile', {})
        user_name = user_profile.get('firstName', 'Farmer')
        
        # Set language-specific instructions
        if language == "hi":
            language_instruction = "RESPOND IN HINDI ONLY. Use simple Hindi that farmers can understand easily."
        else:
            language_instruction = "RESPOND IN ENGLISH ONLY. Use simple English that farmers can understand easily."
        
        response_prompt = f"""
        You are a friendly market assistant for farmers. Create a natural, conversational market response for {user_name}:

        {language_instruction}

        USER CONTEXT:
        - Name: {user_name}
        - Location: {state.location}
        - Commodity: {state.commodity}

        MARKET DATA:
        {json.dumps(state.market_data, indent=2) if state.market_data else "No market data available"}

        MARKET TRENDS:
        {json.dumps(state.price_trends, indent=2) if state.price_trends else "No trend data available"}

        Create a NATURAL response (under 150 words) that:
        1. **Talks directly to {user_name} like a helpful friend** (no formal language)
        2. **Directly answers their market question** in 1-2 sentences
        3. **Provides current prices briefly** (if available)
        4. **Gives 2-3 key actionable recommendations**
        5. **Uses simple, everyday language**
        6. **Ends naturally** (no formal closings)
        7. **Focuses on practical advice for farmers**

        Format: Direct answer → Current prices → Key recommendations
        Tone: Friendly and helpful - like talking to a farming buddy.
        DO NOT use formal business language or signatures.
        """
        
        try:
            response = await self.llm_service.get_completion(response_prompt)
            return response
        except Exception as e:
            logger.error(f"LLM response generation error: {e}")
            return self._get_fallback_response(state)
    
    async def _learn_from_interaction(self, state: MarketAgentState) -> MarketAgentState:
        """Use LLM to learn from the interaction"""
        
        learning_prompt = f"""
        As an autonomous market price agent, analyze this interaction for learning:

        INTERACTION SUMMARY:
        - User Query: {state.conversation_history[-1].get('query', '') if state.conversation_history else 'N/A'}
        - Market Data Gathered: {len(state.market_data)} records
        - Response Generated: {state.market_data[0].get('response', 'N/A') if state.market_data else 'N/A'}
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
            
            # Handle empty or invalid responses
            if not response or response.strip() == "":
                logger.warning("LLM returned empty response for learning")
                return state
            
            # Try to parse JSON
            try:
                # Clean the response - remove markdown code blocks if present
                cleaned_response = response.strip()
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]  # Remove ```json
                if cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response[3:]  # Remove ```
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]  # Remove trailing ```
                
                learning_data = json.loads(cleaned_response)
            except json.JSONDecodeError as json_error:
                logger.error(f"Failed to parse LLM response as JSON: {response}")
                logger.error(f"Cleaned response: {cleaned_response}")
                logger.error(f"JSON error: {json_error}")
                return state
            
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
    
    def _get_fallback_market_analysis(self, market_data: List[Dict]) -> Dict[str, Any]:
        """Fallback market analysis when LLM fails"""
        if not market_data:
            return {
                "price_trend": "unknown",
                "trend_strength": "unknown",
                "price_range": {"min": 0, "max": 0, "avg": 0},
                "market_volatility": "unknown",
                "seasonal_factors": [],
                "demand_supply": "unknown",
                "forecast": "neutral",
                "recommendations": ["Check local markets", "Monitor price trends"],
                "reasoning": "Limited data available for analysis"
            }
        
        # Basic analysis from available data
        prices = [item.get('price', 0) for item in market_data if item.get('price')]
        if prices:
            avg_price = sum(prices) / len(prices)
            min_price = min(prices)
            max_price = max(prices)
            
            if max_price > avg_price * 1.1:
                trend = "rising"
            elif min_price < avg_price * 0.9:
                trend = "falling"
            else:
                trend = "stable"
        else:
            trend = "unknown"
            avg_price = min_price = max_price = 0
        
        return {
            "price_trend": trend,
            "trend_strength": "moderate",
            "price_range": {"min": min_price, "max": max_price, "avg": avg_price},
            "market_volatility": "medium",
            "seasonal_factors": ["Basic analysis"],
            "demand_supply": "balanced",
            "forecast": "neutral",
            "recommendations": ["Monitor local prices", "Check market trends"],
            "reasoning": "Basic analysis based on available price data"
        }
    
    def _get_fallback_response(self, state: MarketAgentState) -> str:
        """Fallback response when LLM fails"""
        if not state.market_data:
            return """
💰 **Market Price Information**

**Current Status:**
• Market data unavailable for the requested commodity
• Please check local markets or try again later

**Recommendations:**
• Visit local mandi or market
• Check government price portals
• Contact local traders

*Note: This is a basic response. For detailed analysis, please try again.*
            """.strip()
        
        # Basic response with available data
        prices = [item.get('price', 0) for item in state.market_data if item.get('price')]
        if prices:
            avg_price = sum(prices) / len(prices)
            return f"""
💰 **Market Price Information for {state.commodity}**

**Current Prices:**
• Average Price: ₹{avg_price:.2f} per unit
• Price Range: ₹{min(prices):.2f} - ₹{max(prices):.2f}
• Data Sources: {len(state.market_data)} locations

**Recommendations:**
• Monitor price trends regularly
• Check local market conditions
• Consider timing for sales/purchases

*Note: This is a basic analysis. For detailed insights, please try again.*
            """.strip()
        
        return """
💰 **Market Price Information**

**Current Status:**
• Limited market data available
• Further analysis recommended

**Recommendations:**
• Check local markets
• Monitor price trends
• Consult local traders

*Note: This is a basic response. For detailed analysis, please try again.*
        """.strip()
    
    # Main interface method (maintains compatibility)
    async def get_market_prices(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main interface method - uses LLM + Web scraping hybrid approach
        """
        try:
            # Create initial state
            state = MarketAgentState(
                user_id=context.get('user_id', 'unknown'),
                session_id=f"session_{int(asyncio.get_event_loop().time())}",
                commodity=context.get('commodity', ''),
                location=context.get('location', ''),
                conversation_history=context.get('conversation_history', [])
            )
            
            # Step 1: Gather market data using web scraping
            language = context.get('language', 'en')
            if state.commodity and state.location:
                market_data = await self._gather_market_data(state.commodity, state.location, language)
                state.market_data = market_data
            else:
                market_data = []
            
            # Step 2: Analyze market trends with LLM
            if market_data:
                price_trends = await self._analyze_market_trends(market_data)
                state.price_trends = price_trends
                state.llm_reasoning = price_trends.get('reasoning', '')
                state.confidence_level = 0.8 if len(market_data) > 3 else 0.6
            else:
                state.confidence_level = 0.3
            
            # Step 3: Make autonomous decisions
            state = await self._make_autonomous_decisions(state)
            
            # Step 4: Generate personalized response
            response = await self._generate_personalized_response(state, language)
            
            # Step 5: Learn from interaction
            state = await self._learn_from_interaction(state)
            
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
                "market_data": state.market_data,
                "price_trends": state.price_trends,
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
            logger.error(f"Real Market Agent error: {e}")
            return {
                "market_data": [],
                "price_trends": {},
                "response": "Market price agent encountered an error. Please try again.",
                "confidence": 0.0,
                "error": str(e)
            }

# Global real market agent instance
real_market_agent = RealMarketAgent()
