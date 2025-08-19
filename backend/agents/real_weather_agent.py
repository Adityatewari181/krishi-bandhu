#!/usr/bin/env python3
"""
🌤️ Weather Agent - OpenWeatherMap API + LLM

A weather agent that:
- Uses OpenWeatherMap API for accurate weather data
- Provides comprehensive weather information
- Gives farmer-friendly weather advice
- Maintains speed and reliability
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import aiohttp
import json

from services.llm_service import LLMService

logger = logging.getLogger(__name__)

class WeatherAgent:
    """
    Weather agent using OpenWeatherMap API
    """
    
    def __init__(self):
        self.api_key = None
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.llm_service = LLMService()
        
        logger.info("🌤️ Weather Agent initialized")
    
    async def _fetch_current_weather(self, location: str) -> Optional[Dict]:
        """Fetch current weather data from OpenWeatherMap API"""
        try:
            if not self.api_key:
                from config import Config
                self.api_key = Config.OPENWEATHER_API_KEY
            
            url = f"{self.base_url}/weather"
            params = {
                "q": location,
                "appid": self.api_key,
                "units": "metric"
            }
            
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "temperature": round(data["main"]["temp"], 1),
                            "feels_like": round(data["main"]["feels_like"], 1),
                            "humidity": data["main"]["humidity"],
                            "description": data["weather"][0]["description"],
                            "wind_speed": round(data["wind"]["speed"] * 3.6, 1),  # m/s to km/h
                            "pressure": data["main"]["pressure"],
                            "visibility": round(data.get("visibility", 10000) / 1000, 1),  # m to km
                            "sunrise": datetime.fromtimestamp(data["sys"]["sunrise"]).strftime("%I:%M %p"),
                            "sunset": datetime.fromtimestamp(data["sys"]["sunset"]).strftime("%I:%M %p"),
                            "clouds": data["clouds"]["all"]
                        }
                    else:
                        logger.warning(f"Weather API error for {location}: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Weather fetch error: {e}")
            return None
    
    async def _fetch_forecast(self, location: str) -> Optional[List]:
        """Fetch 5-day forecast from OpenWeatherMap API"""
        try:
            if not self.api_key:
                from config import Config
                self.api_key = Config.OPENWEATHER_API_KEY
            
            url = f"{self.base_url}/forecast"
            params = {
                "q": location,
                "appid": self.api_key,
                "units": "metric"
            }
            
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        forecast = []
                        
                        # Group by day and get daily summary
                        daily_data = {}
                        for item in data["list"]:
                            date = datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d")
                            if date not in daily_data:
                                daily_data[date] = []
                            daily_data[date].append(item)
                        
                        # Process daily summaries
                        for date, day_items in list(daily_data.items())[:5]:
                            temps = [item["main"]["temp"] for item in day_items]
                            humidities = [item["main"]["humidity"] for item in day_items]
                            rain_probs = [item.get("pop", 0) for item in day_items]
                            
                            descriptions = [item["weather"][0]["description"] for item in day_items]
                            most_common_desc = max(set(descriptions), key=descriptions.count)
                            
                            forecast.append({
                                "date": date,
                                "day_name": datetime.strptime(date, "%Y-%m-%d").strftime("%A"),
                                "min_temp": round(min(temps), 1),
                                "max_temp": round(max(temps), 1),
                                "avg_humidity": round(sum(humidities) / len(humidities), 1),
                                "description": most_common_desc.title(),
                                "rain_probability": round(max(rain_probs) * 100, 1)
                            })
                        
                        return forecast
                    else:
                        logger.warning(f"Forecast API error for {location}: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Forecast fetch error: {e}")
            return None
    
    async def _generate_weather_response(self, query: str, weather_data: Dict, forecast: List, location: str, language: str = "en") -> str:
        """Generate comprehensive weather response using LLM"""
        try:
            # Prepare weather information
            weather_info = {
                "current": weather_data,
                "forecast": forecast,
                "location": location,
                "query": query
            }
            
            # Set language-specific instructions
            if language == "hi":
                language_instruction = "RESPOND IN HINDI ONLY. Use simple Hindi that farmers can understand easily."
            else:
                language_instruction = "RESPOND IN ENGLISH ONLY. Use simple English that farmers can understand easily."
            
            response_prompt = f"""
            You are a friendly weather assistant for farmers. Provide a natural, conversational weather response:

            {language_instruction}

            USER QUERY: {query}
            LOCATION: {location}

            CURRENT WEATHER:
            {json.dumps(weather_data, indent=2)}

            FORECAST (5 days):
            {json.dumps(forecast, indent=2)}

            Create a NATURAL response (under 150 words) that:
            1. **Talks directly like a helpful friend** (no formal language)
            2. **Directly answers the weather question** in 1-2 sentences
            3. **Provides current conditions briefly**
            4. **Focuses on tomorrow's forecast** (most important)
            5. **Gives 2-3 key farming recommendations**
            6. **Uses simple, everyday language**
            7. **Ends naturally** (no formal closings)

            Format: Direct answer → Current weather → Tomorrow's forecast → Key farming advice
            Tone: Friendly and helpful - like talking to a farming buddy.
            DO NOT use formal business language or signatures.
            """
            
            response = await self.llm_service.get_completion(response_prompt)
            return response
            
        except Exception as e:
            logger.error(f"Weather response generation error: {e}")
            # Fallback to simple response
            return self._generate_simple_response(query, weather_data, forecast, location)
    
    def _generate_simple_response(self, query: str, weather_data: Dict, forecast: List, location: str) -> str:
        """Generate simple weather response as fallback"""
        current = f"**Current Weather in {location}:**\n• Temperature: {weather_data.get('temperature', 'N/A')}°C\n• Feels like: {weather_data.get('feels_like', 'N/A')}°C\n• Humidity: {weather_data.get('humidity', 'N/A')}%\n• Weather: {weather_data.get('description', 'N/A')}"
        
        if forecast and len(forecast) > 1:
            tomorrow = forecast[1]
            forecast_text = f"\n\n**Tomorrow's Forecast:**\n• Temperature: {tomorrow['min_temp']}°C - {tomorrow['max_temp']}°C\n• Rain chance: {tomorrow['rain_probability']}%\n• Weather: {tomorrow['description']}"
            return current + forecast_text
        else:
            return current
    
    async def get_weather_info(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main interface method - comprehensive weather information
        """
        try:
            start_time = datetime.now()
            
            # Get location
            location = context.get('location', 'Delhi, India')
            query = context.get('query', '')
            
            # Fetch weather data in parallel
            current_weather, forecast = await asyncio.gather(
                self._fetch_current_weather(location),
                self._fetch_forecast(location),
                return_exceptions=True
            )
            
            # Handle exceptions
            if isinstance(current_weather, Exception):
                current_weather = None
            if isinstance(forecast, Exception):
                forecast = None
            
            # Generate comprehensive response
            language = context.get('language', 'en')
            if current_weather:
                response = await self._generate_weather_response(query, current_weather, forecast, location, language)
            else:
                if language == "hi":
                    response = f"माफ़ करें, मुझे {location} के लिए मौसम का डेटा नहीं मिल सका। कृपया अपना स्थान जांचें या बाद में फिर से कोशिश करें।"
                else:
                    response = f"Sorry, I couldn't get weather data for {location}. Please check your location or try again later."
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "temperature": current_weather.get("temperature", "N/A") if current_weather else "N/A",
                "humidity": current_weather.get("humidity", "N/A") if current_weather else "N/A",
                "condition": current_weather.get("description", "N/A") if current_weather else "N/A",
                "forecast": forecast,
                "response": response,
                "confidence": 0.9,
                "processing_time": processing_time,
                "location": location
            }
            
        except Exception as e:
            logger.error(f"Weather Agent error: {e}")
            return {
                "temperature": "N/A",
                "humidity": "N/A", 
                "condition": "Error",
                "forecast": None,
                "response": "Weather service is temporarily unavailable. Please try again later.",
                "error": str(e),
                "processing_time": 0.0
            }

# Global weather agent instance
real_weather_agent = WeatherAgent()
