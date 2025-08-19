#!/usr/bin/env python3
"""
🎯 LangGraph Agent Orchestrator - Smart & Farmer-Friendly

A sophisticated orchestrator that:
- Uses LLM for intelligent query analysis and agent selection
- Coordinates specialized agents (weather, pest, market, finance, general)
- Synthesizes responses in farmer-friendly format
- Maintains speed and reliability
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union, TYPE_CHECKING
from datetime import datetime
from dataclasses import dataclass, field
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
import json
import re

if TYPE_CHECKING:
    from models.state import KrishiBandhuState

from services.llm_service import LLMService
from agents.real_weather_agent import real_weather_agent
from agents.real_pest_agent import real_pest_agent
from agents.real_market_agent import real_market_agent
from agents.real_finance_agent import real_finance_agent
from agents.real_general_agent import real_general_agent

logger = logging.getLogger(__name__)

@dataclass
class OrchestratorState:
    """State management for the Agent Orchestrator"""
    # Core state
    user_id: str
    session_id: str
    query: str = ""
    input_type: str = "text"
    
    # Agent routing and coordination
    selected_agents: List[str] = field(default_factory=list)
    agent_responses: Dict[str, Any] = field(default_factory=dict)
    routing_confidence: float = 0.0
    routing_reasoning: str = ""
    
    # Response synthesis
    final_response: str = ""
    response_components: List[Dict] = field(default_factory=list)
    synthesis_quality: float = 0.0
    
    # Context and metadata
    user_context: Dict[str, Any] = field(default_factory=dict)
    conversation_history: List[Dict] = field(default_factory=list)
    
    # Performance tracking
    processing_time: float = 0.0
    agent_insights: Dict[str, Any] = field(default_factory=dict)

class LangGraphOrchestrator:
    """
    LangGraph-based Agent Orchestrator
    """
    
    def __init__(self):
        self.llm_service = LLMService()
        self.memory_saver = MemorySaver()
        self.agent_graph = self._build_orchestrator_graph()
        
        # Agent registry
        self.agents = {
            "weather": real_weather_agent,
            "pest": real_pest_agent,
            "market": real_market_agent,
            "finance": real_finance_agent,
            "general": real_general_agent
        }
        
        logger.info("🎯 LangGraph Orchestrator initialized")
    
    def _build_orchestrator_graph(self) -> StateGraph:
        """Build the LangGraph workflow for agent orchestration"""
        
        # Create the state graph
        workflow = StateGraph(OrchestratorState)
        
        # Add nodes for orchestration workflow
        workflow.add_node("analyze_query", self._analyze_query)
        workflow.add_node("execute_agents", self._execute_agents)
        workflow.add_node("synthesize_response", self._synthesize_response)
        
        # Define the orchestration workflow with conditional routing
        workflow.set_entry_point("analyze_query")
        
        # Add conditional edge from analyze_query
        def should_execute_agents(state: OrchestratorState) -> str:
            """Determine if we should execute agents or end directly"""
            if not state.selected_agents:  # No agents selected (non-agricultural query)
                return "end"
            return "execute_agents"
        
        workflow.add_conditional_edges(
            "analyze_query",
            should_execute_agents,
            {
                "execute_agents": "execute_agents",
                "end": END
            }
        )
        
        workflow.add_edge("execute_agents", "synthesize_response")
        workflow.add_edge("synthesize_response", END)
        
        return workflow.compile(checkpointer=self.memory_saver)
    
    async def _analyze_query(self, state: OrchestratorState) -> OrchestratorState:
        """Use LLM to analyze query and select appropriate agents"""
        try:
            # Check if image is present in the context
            has_image = state.user_context.get('has_image', False) or state.user_context.get('input_type', '') in ['image', 'text_image', 'voice_image']
            
            # First, check if query is clearly non-agricultural
            non_agri_keywords = [
                "football", "cricket", "soccer", "basketball", "tennis", "sports", "game", "play",
                "movie", "film", "cinema", "entertainment", "music", "song", "dance",
                "politics", "election", "government", "political",
                "technology", "computer", "mobile", "phone", "internet", "social media", "facebook", "instagram",
                "cooking", "recipe", "food", "restaurant", "hotel", "travel", "tourism", "vacation",
                "school", "college", "university", "education", "study", "exam", "test",
                "job", "work", "office", "business", "company", "career",
                "health", "medical", "doctor", "hospital", "medicine", "disease", "sickness",
                "shopping", "buy", "purchase", "store", "market", "mall"
            ]
            
            query_lower = state.query.lower()
            is_clearly_non_agri = any(keyword in query_lower for keyword in non_agri_keywords)
            
            if is_clearly_non_agri:
                # Generate polite non-agricultural response
                user_profile = state.user_context.get('user_profile', {})
                user_name = user_profile.get('firstName', 'Farmer')
                language = state.user_context.get('language', 'en')
                
                if language == "hi":
                    polite_response = f"नमस्ते {user_name}! मैं एक कृषि विशेषज्ञ AI सहायक हूं। मैं खेती, फसल प्रबंधन, मौसम, और सरकारी योजनाओं के बारे में मदद कर सकता हूं। क्या आप कृषि से संबंधित कोई प्रश्न पूछना चाहेंगे?"
                else:
                    polite_response = f"Hello {user_name}! I'm an agricultural AI assistant. I can help you with farming, crop management, weather, and government schemes. Would you like to ask something related to agriculture?"
                
                # Set state to indicate non-agricultural query
                state.selected_agents = []
                state.routing_confidence = 1.0
                state.routing_reasoning = f"Query '{state.query}' is clearly non-agricultural and has been politely redirected"
                state.final_response = polite_response
                state.response_components = []
                state.synthesis_quality = 1.0
                state.processing_time = 0.0
                
                logger.info(f"🎯 Orchestrator: Non-agricultural query detected: '{state.query}' - returning polite redirect")
                return state
            
            analysis_prompt = f"""
            You are an expert query analyzer for an agricultural AI system. Analyze the following query and determine which specialized agents should handle it:

            QUERY: {state.query}
            INPUT TYPE: {state.user_context.get('input_type', 'text')}
            HAS IMAGE: {has_image}
            USER CONTEXT: {json.dumps(state.user_context, indent=2, default=str)}

            Agent capabilities:
            - weather: Weather conditions, forecasts, agricultural weather advice
            - pest: Pest detection, disease identification, treatment recommendations, crop health analysis from images
            - market: Market prices, trends, commodity information
            - finance: Government schemes, financial advice, policy information, eligibility checks
            - general: General agricultural advice, farming practices, crop management, greetings, non-agricultural queries

            Determine which agents should be involved and provide reasoning. Return in JSON format:
            {{
                "primary_agent": "weather/pest/market/finance/general",
                "secondary_agents": ["agent1", "agent2"],
                "routing_confidence": 0.0-1.0,
                "reasoning": "detailed explanation",
                "query_type": "weather/pest/market/finance/general/greeting/non_agricultural"
            }}

            CRITICAL IMAGE ANALYSIS RULES:
            - **WHEN AN IMAGE IS UPLOADED**: ALWAYS prioritize the pest agent for crop disease/pest analysis
            - **Image + crop health questions**: Use pest agent as primary agent
            - **Image + "what's happening to my crop"**: Use pest agent as primary agent
            - **Image + disease/pest keywords**: Use pest agent as primary agent
            - **Image + crop problems**: Use pest agent as primary agent

            IMPORTANT GUIDELINES:
            - For weather + farming questions, include both weather and general agents
            - For pest/disease questions, use ONLY pest agent (DO NOT include general agent)
            - For market price questions, use ONLY market agent (DO NOT include general agent)
            - For government schemes/loans/financial queries, use ONLY finance agent (DO NOT include general agent)
            - For greetings or non-agricultural queries, use general agent
            - For general farming advice (not weather/pest/market/finance specific), use general agent

            CRITICAL RULE: Do NOT combine general agent with finance, market, or pest agents. These specialized agents should work independently.
            
            IMAGE PRIORITY RULE: If the query involves an image and mentions crop health, disease, pests, or "what's happening to my crop", the pest agent MUST be the primary agent.
            
            DECISION LOGIC:
            - If HAS IMAGE = True AND query mentions crop health/disease/pests → pest agent
            - If HAS IMAGE = True AND query is "what's happening to my crop" → pest agent
            - If HAS IMAGE = True AND query is about crop problems → pest agent
            """
            
            response = await self.llm_service.get_completion(analysis_prompt)
            
            # Handle empty or invalid responses
            if not response or response.strip() == "":
                logger.warning("LLM returned empty response for query analysis")
                # Fallback to general agent
                state.selected_agents = ["general"]
                state.routing_confidence = 0.5
                state.routing_reasoning = "Fallback to general agent due to empty LLM response"
                return state
            
            # Clean the response - remove markdown code blocks if present
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]  # Remove ```
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # Remove trailing ```
            
            try:
                analysis = json.loads(cleaned_response)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse analysis response as JSON: {response}")
                logger.error(f"Cleaned response: {cleaned_response}")
                logger.error(f"JSON error: {e}")
                # Fallback to general agent
                state.selected_agents = ["general"]
                state.routing_confidence = 0.5
                state.routing_reasoning = "Fallback to general agent due to JSON parsing error"
                return state
            
            # Update state with analysis
            state.selected_agents = [analysis["primary_agent"]] + analysis.get("secondary_agents", [])
            state.routing_confidence = analysis["routing_confidence"]
            state.routing_reasoning = analysis["reasoning"]
            
            logger.info(f"🎯 Orchestrator: Query analyzed, selected agents: {state.selected_agents}")
            logger.info(f"🎯 Orchestrator: Has image: {has_image}, Input type: {state.user_context.get('input_type', 'text')}")
            logger.info(f"🎯 Orchestrator: Routing reasoning: {state.routing_reasoning}")
            return state
            
        except Exception as e:
            logger.error(f"Query analysis error: {e}")
            # Fallback to general agent
            state.selected_agents = ["general"]
            state.routing_confidence = 0.5
            state.routing_reasoning = "Fallback to general agent due to analysis error"
            return state
    
    async def _execute_agents(self, state: OrchestratorState) -> OrchestratorState:
        """Execute the selected agents in parallel"""
        try:
            start_time = datetime.now()
            
            # Prepare context for agents
            agent_context = {
                'user_id': state.user_id,
                'query': state.query,
                'location': state.user_context.get('location', ''),
                'crop': state.user_context.get('crop', ''),
                'commodity': state.user_context.get('crop', ''),  # Market agent expects 'commodity'
                'user_profile': state.user_context.get('user_profile', {}),
                'conversation_history': state.conversation_history,
                'language': state.user_context.get('language', 'en'),  # Add language support
                'image': state.user_context.get('image', '')  # Add image data for pest agent
            }
            
            # Execute agents in parallel
            agent_tasks = []
            
            # Map agent names to their methods
            method_map = {
                "weather": self.agents["weather"].get_weather_info,
                "pest": self.agents["pest"].detect_pests,
                "market": self.agents["market"].get_market_prices,
                "finance": self.agents["finance"].get_financial_advice,
                "general": self.agents["general"].get_agricultural_advice
            }
            
            for agent_name in state.selected_agents:
                if agent_name in method_map:
                    method = method_map[agent_name]
                    task = method(agent_context)
                    agent_tasks.append((agent_name, task))
                else:
                    logger.error(f"🎯 Orchestrator: No method found for agent {agent_name}")
            
            # Wait for all agents to complete
            agent_responses = {}
            for agent_name, task in agent_tasks:
                try:
                    response = await task
                    agent_responses[agent_name] = response
                    logger.info(f"🎯 Orchestrator: {agent_name} agent completed")
                except Exception as e:
                    logger.error(f"Agent {agent_name} execution error: {e}")
                    agent_responses[agent_name] = {
                        "error": str(e),
                        "response": f"{agent_name} agent encountered an error"
                    }
            
            state.agent_responses = agent_responses
            state.processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"🎯 Orchestrator: All agents executed in {state.processing_time:.2f}s")
            return state
            
        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            state.agent_responses = {"general": {"error": str(e), "response": "System error occurred"}}
            return state
    
    async def _synthesize_response(self, state: OrchestratorState) -> OrchestratorState:
        """Synthesize responses from agents into a farmer-friendly response"""
        try:
            # Get user context for personalization
            user_profile = state.user_context.get('user_profile', {})
            user_name = user_profile.get('firstName', 'Farmer')
            user_crops = user_profile.get('agricultureSpecific', {}).get('currentCrops', [])
            user_location = state.user_context.get('location', '')
            
            synthesis_prompt = f"""
            You are a friendly farming assistant talking directly to {user_name}. Create a natural, conversational response:

            USER QUERY: {state.query}
            USER CONTEXT: 
            - Name: {user_name}
            - Location: {user_location}
            - Current Crops: {', '.join(user_crops) if user_crops else 'Not specified'}
            - Season: {user_profile.get('agricultureSpecific', {}).get('season', 'Not specified')}
            - Language: {state.user_context.get('language', 'en')}

            AGENT RESPONSES:
            {json.dumps(state.agent_responses, indent=2, default=str)}

            LANGUAGE INSTRUCTION: {'RESPOND IN HINDI ONLY. Use simple Hindi that farmers can understand easily.' if state.user_context.get('language') == 'hi' else 'RESPOND IN ENGLISH ONLY. Use simple English that farmers can understand easily.'}

            Create a NATURAL, CONVERSATIONAL response that:
            1. **Talks directly to {user_name} like a friend** (no formal language)
            2. **Directly answers the question** in 1-2 sentences
            3. **References their specific crops** if relevant
            4. **Provides 3-4 key actionable points**
            5. **Uses simple, everyday language**
            6. **Keeps total response under 200 words**
            7. **Ends naturally** (no "Best regards", "Thank you", etc.)
            8. **Sounds like a helpful farming friend, not a business email**

            Format: Direct answer → Key points → Natural ending
            Tone: Friendly, casual, and helpful - like talking to a farming buddy.
            DO NOT use formal business language, signatures, or greetings like "Best regards".
            """
            
            synthesized_response = await self.llm_service.get_completion(synthesis_prompt)
            state.final_response = synthesized_response
            state.response_components = [
                {"agent": name, "response": data} 
                for name, data in state.agent_responses.items()
            ]
            state.synthesis_quality = 0.9
            
            logger.info(f"🎯 Orchestrator: Response synthesized with quality {state.synthesis_quality}")
            return state
            
        except Exception as e:
            logger.error(f"Response synthesis error: {e}")
            # Fallback to first available response with personalization
            if state.agent_responses:
                first_response = list(state.agent_responses.values())[0]
                if isinstance(first_response, dict):
                    original_response = first_response.get("response", "Error synthesizing response")
                    # Create a simple personalized fallback
                    user_name = state.user_context.get('user_profile', {}).get('firstName', 'Farmer')
                    state.final_response = f"Hello {user_name}! {original_response[:100]}..." if len(original_response) > 100 else original_response
                else:
                    state.final_response = str(first_response)
            else:
                state.final_response = "Unable to process your request. Please try again."
            state.synthesis_quality = 0.5
            return state
    
    async def process_query(self, context: Union[Dict[str, Any], 'KrishiBandhuState']) -> Dict[str, Any]:
        """
        Main interface method - processes queries through the LangGraph workflow
        """
        try:
            # Handle both Dict and KrishiBandhuState objects
            if hasattr(context, 'user_id'):  # Pydantic model
                # Extract data from KrishiBandhuState object
                user_id = getattr(context, 'user_id', 'unknown')
                session_id = getattr(context, 'session_id', f"session_{int(asyncio.get_event_loop().time())}")
                query = getattr(context, 'query_text', '')
                input_type = getattr(context, 'input_type', 'text')
                location = getattr(context, 'location', '')
                crop_type = getattr(context, 'crop_type', '')
                user_profile = getattr(context, 'user_profile', {})
                
                # Create user context from state
                user_context = {
                    'location': location,
                    'crop': crop_type,
                    'user_profile': user_profile,
                    'language': getattr(context, 'language', 'en'),
                    'all_crop_types': getattr(context, 'all_crop_types', []),
                    'crop_context': getattr(context, 'crop_context', ''),
                    'input_type': input_type,
                    'has_image': input_type in ['image', 'text_image', 'voice_image'],
                    'image': getattr(context, 'image_data', '')  # Add image data
                }
            else:  # Dict object
                user_id = context.get('user_id', 'unknown')
                session_id = f"session_{int(asyncio.get_event_loop().time())}"
                query = context.get('query', '')
                input_type = context.get('input_type', 'text')
                user_context = context.get('user_context', {})
                # Add input_type and has_image to user_context
                user_context.update({
                    'input_type': input_type,
                    'has_image': input_type in ['image', 'text_image', 'voice_image']
                })
            
            # Create initial state
            initial_state = OrchestratorState(
                user_id=user_id,
                session_id=session_id,
                query=query,
                input_type=input_type,
                user_context=user_context,
                conversation_history=[]
            )
            
            # Run the orchestration workflow with memory
            config = {
                "configurable": {
                    "thread_id": f"user_{user_id}",
                    "checkpoint_id": f"session_{session_id}"
                }
            }
            
            try:
                final_state = await self.agent_graph.ainvoke(initial_state, config=config)
                
                # Debug logging
                logger.info(f"🎯 Orchestrator: LangGraph response type: {type(final_state)}")
                logger.info(f"🎯 Orchestrator: LangGraph response: {final_state}")
                
                # Handle both OrchestratorState and dict responses
                if hasattr(final_state, 'final_response'):
                    # It's an OrchestratorState object
                    logger.info("🎯 Orchestrator: Processing OrchestratorState response")
                    
                    final_response = final_state.final_response
                    
                    # Check if this is a non-agricultural query response (already processed)
                    if not final_state.selected_agents and final_response:
                        logger.info("🎯 Orchestrator: Non-agricultural query - returning direct response")
                        response_data = {
                            "response": final_response,
                            "selected_agents": [],
                            "routing_confidence": final_state.routing_confidence,
                            "routing_reasoning": final_state.routing_reasoning,
                            "synthesis_quality": final_state.synthesis_quality,
                            "processing_time": final_state.processing_time,
                            "agent_insights": final_state.agent_insights
                        }
                    else:
                        response_data = {
                            "response": final_response,
                            "selected_agents": final_state.selected_agents,
                            "routing_confidence": final_state.routing_confidence,
                            "routing_reasoning": final_state.routing_reasoning,
                            "synthesis_quality": final_state.synthesis_quality,
                            "processing_time": final_state.processing_time,
                            "agent_insights": final_state.agent_insights
                        }
                elif isinstance(final_state, dict):
                    # It's a dict response (fallback case)
                    logger.info("🎯 Orchestrator: Processing dict response")
                    
                    # Extract the final_response from the dict
                    final_response = final_state.get("final_response", "No response available")
                    
                    # If final_response is empty, try to get it from agent_responses
                    if final_response == "No response available" and "agent_responses" in final_state:
                        agent_responses = final_state["agent_responses"]
                        if agent_responses:
                            # Get the first agent's response
                            first_agent_response = list(agent_responses.values())[0]
                            if isinstance(first_agent_response, dict) and "response" in first_agent_response:
                                final_response = first_agent_response["response"]
                    
                    response_data = {
                        "response": final_response,
                        "selected_agents": final_state.get("selected_agents", ["general"]),
                        "routing_confidence": final_state.get("routing_confidence", 0.0),
                        "routing_reasoning": final_state.get("routing_reasoning", "Dict response"),
                        "synthesis_quality": final_state.get("synthesis_quality", 0.0),
                        "processing_time": final_state.get("processing_time", 0.0),
                        "agent_insights": final_state.get("agent_insights", {})
                    }
                else:
                    # Unknown response type
                    logger.error(f"Unknown response type: {type(final_state)}")
                    response_data = {
                        "response": "System encountered an unexpected response format.",
                        "selected_agents": ["general"],
                        "routing_confidence": 0.0,
                        "routing_reasoning": "Unknown response type",
                        "synthesis_quality": 0.0,
                        "processing_time": 0.0,
                        "error": f"Unexpected response type: {type(final_state)}"
                    }
                
                logger.info(f"🎯 Orchestrator: Final response data: {response_data}")
                return response_data
                
            except Exception as workflow_error:
                logger.error(f"LangGraph workflow error: {workflow_error}")
                logger.error(f"LangGraph workflow error type: {type(workflow_error)}")
                # Fallback to direct agent execution
                return await self._fallback_process_query(query, user_context, user_id)
            
        except Exception as e:
            logger.error(f"LangGraph Orchestrator error: {e}")
            return {
                "response": "System encountered an error. Please try again.",
                "selected_agents": ["general"],
                "routing_confidence": 0.0,
                "routing_reasoning": "Error in orchestration",
                "synthesis_quality": 0.0,
                "processing_time": 0.0,
                "error": str(e)
            }
    
    async def _fallback_process_query(self, query: str, user_context: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Fallback method for direct agent execution without LangGraph"""
        try:
            start_time = datetime.now()
            
            # Simple keyword-based routing as fallback
            has_image = user_context.get('has_image', False) or user_context.get('input_type', '') in ['image', 'text_image', 'voice_image']
            selected_agents = self._simple_route_query(query, has_image)
            
            # Prepare context for agents
            agent_context = {
                'user_id': user_id,
                'query': query,
                'location': user_context.get('location', ''),
                'crop': user_context.get('crop', ''),
                'user_profile': user_context.get('user_profile', {}),
                'conversation_history': [],
                'image': user_context.get('image', ''),  # Add image data
                'language': user_context.get('language', 'en')  # Add language preference
            }
            
            # Execute agents in parallel
            agent_tasks = []
            
            # Map agent names to their methods
            method_map = {
                "weather": self.agents["weather"].get_weather_info,
                "pest": self.agents["pest"].detect_pests,
                "market": self.agents["market"].get_market_prices,
                "finance": self.agents["finance"].get_financial_advice,
                "general": self.agents["general"].get_agricultural_advice
            }
            
            for agent_name in selected_agents:
                if agent_name in method_map:
                    method = method_map[agent_name]
                    task = method(agent_context)
                    agent_tasks.append((agent_name, task))
            
            # Wait for all agents to complete
            agent_responses = {}
            for agent_name, task in agent_tasks:
                try:
                    response = await task
                    agent_responses[agent_name] = response
                except Exception as e:
                    logger.error(f"Agent {agent_name} execution error: {e}")
                    agent_responses[agent_name] = {
                        "error": str(e),
                        "response": f"{agent_name} agent encountered an error"
                    }
            
            # Extract response from first successful agent
            final_response = "No response available"
            if agent_responses:
                first_response = list(agent_responses.values())[0]
                if isinstance(first_response, dict):
                    final_response = first_response.get("response", "No response available")
                else:
                    final_response = str(first_response)
            
            # Format cleanup: If only pest agent is selected, use direct pest response
            if selected_agents == ["pest"] and "pest" in agent_responses:
                pest_response = agent_responses["pest"]
                if isinstance(pest_response, dict) and "response" in pest_response:
                    final_response = pest_response["response"]
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "response": final_response,
                "selected_agents": selected_agents,
                "agent_responses": agent_responses,
                "routing_confidence": 0.7,
                "routing_reasoning": f"Fallback routing to {selected_agents[0]} based on keywords",
                "synthesis_quality": 0.6,
                "processing_time": processing_time,
                "agent_insights": {}
            }
            
        except Exception as e:
            logger.error(f"Fallback process error: {e}")
            return {
                "response": "System is temporarily unavailable. Please try again later.",
                "selected_agents": ["general"],
                "agent_responses": {},
                "routing_confidence": 0.0,
                "routing_reasoning": "Fallback error",
                "synthesis_quality": 0.0,
                "processing_time": 0.0,
                "error": str(e)
            }
    
    def _simple_route_query(self, query: str, has_image: bool = False) -> List[str]:
        """Simple keyword-based routing as fallback"""
        query_lower = query.lower()
        
        # If image is present, prioritize pest agent for crop-related queries
        if has_image and any(word in query_lower for word in ["crop", "plant", "disease", "pest", "happening", "problem", "issue"]):
            return ["pest"]
        
        # Simple keyword matching
        if any(word in query_lower for word in ["weather", "rain", "temperature", "forecast"]):
            return ["weather"]
        elif any(word in query_lower for word in ["pest", "disease", "insect", "fungus"]):
            return ["pest"]
        elif any(word in query_lower for word in ["price", "market", "sell", "buy", "cost"]):
            return ["market"]
        elif any(word in query_lower for word in ["loan", "scheme", "government", "subsidy", "kcc"]):
            return ["finance"]
        else:
            return ["general"]

# Global orchestrator instance
real_orchestrator = LangGraphOrchestrator()
