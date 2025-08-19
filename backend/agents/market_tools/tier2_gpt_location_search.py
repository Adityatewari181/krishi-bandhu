"""
🤖 Tier 2: GPT-4 Location-Specific Search Tool

Uses GPT-4 to search for price information in specific locations or nearby areas.
"""

import logging
from typing import List, Dict, Any, Optional
from .base_tool import BaseMarketTool

logger = logging.getLogger(__name__)

class GPTLocationSearchTool(BaseMarketTool):
    """Tier 2: GPT-4 Location-Specific Search Tool"""
    
    def __init__(self):
        super().__init__(
            name="GPT-4 Location Search",
            tier=2,
            cost="Medium AI Cost",
            speed="Medium"
        )
    
    async def execute(self, commodity: str, location: str, lang: str) -> Optional[List[Dict]]:
        """Execute location-specific search using GPT-4"""
        try:
            logger.info(f"🔍 Searching for {commodity} prices in {location} using GPT-4...")
            
            # Import LLM service - Robust import handling
            llm_service = self._get_llm_service()
            if not llm_service:
                logger.error("❌ Could not import LLM service")
                return None
            
            # Create search prompt
            prompt = self._create_search_prompt(commodity, location, lang)
            
            # Get GPT-4 response
            response = await llm_service.get_completion(prompt)
            
            # Debug: Log the actual GPT response
            logger.info(f"🔍 GPT-4 Response for {location}: {response[:200]}...")
            
            # Parse response for price data
            prices = self._parse_gpt_response(response, commodity, location)
            
            # Count actual price records (not informational text)
            actual_price_records = [p for p in prices if p.get('price') and p.get('price') != 'Information Available' and str(p.get('price')).replace('.', '', 1).isdigit()]
            
            if actual_price_records:
                logger.info(f"✅ GPT-4 found {len(actual_price_records)} actual price records for {location}")
                # If we have actual prices, return all results (prices + info)
                return prices
            else:
                logger.info(f"⚠️ No actual price data found for {location}, trying nearby areas...")
                logger.info(f"🔍 Total entries: {len(prices)}, Actual price records: {len(actual_price_records)}")
                
                # Try nearby areas
                nearby_prices = await self._search_nearby_areas(commodity, location, lang, llm_service)
                return nearby_prices
                
        except Exception as e:
            logger.error(f"❌ GPT-4 location search failed: {e}")
            return None
    
    def _get_llm_service(self):
        """Robust method to get LLM service with multiple import attempts"""
        try:
            # Try different import paths
            import_paths = [
                "backend.services.llm_service",
                "services.llm_service", 
                "agents.services.llm_service",
                "llm_service"
            ]
            
            for path in import_paths:
                try:
                    module = __import__(path, fromlist=['LLMService'])
                    return module.LLMService()
                except (ImportError, AttributeError):
                    continue
            
            # If all imports fail, try direct import
            try:
                from backend.services.llm_service import LLMService
                return LLMService()
            except ImportError:
                try:
                    from services.llm_service import LLMService
                    return LLMService()
                except ImportError:
                    logger.error("❌ All import attempts failed for LLM service")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error importing LLM service: {e}")
            return None
    
    def _create_search_prompt(self, commodity: str, location: str, lang: str) -> str:
        """Create prompt for GPT-4 location search - Universal for all of India"""
        if lang == "hi":
            return f"""
            आपको {commodity} की कीमत जानकारी {location} में खोजनी है।
            
            यह स्थान भारत में कहीं भी हो सकता है - गाँव, कस्बा, शहर, जिला, या राज्य।
            
            निम्नलिखित स्रोतों से जानकारी प्राप्त करें:
            1. eNAM (enam.gov.in) - राष्ट्रीय कृषि बाजार
            2. Agmarknet (agmarknet.gov.in) - कृषि विपणन
            3. CEDA (agmarknet.ceda.ashoka.edu.in) - कृषि डेटा
            4. राज्य सरकार की कृषि वेबसाइटें
            5. जिला और तालुका स्तर की वेबसाइटें
            6. स्थानीय मंडी और बाजार की वेबसाइटें
            7. कृषि विभाग के कार्यालय
            8. किसान उत्पादक संगठन (FPO)
            
            यदि {location} में कीमत नहीं मिलती है, तो निकटवर्ती क्षेत्रों में खोजें।
            
            प्रत्येक कीमत के लिए निम्नलिखित जानकारी दें:
            - फसल का नाम
            - कीमत (प्रति क्विंटल या प्रति किलो)
            - मंडी का नाम
            - स्थान (गाँव/कस्बा/शहर/जिला)
            - तारीख
            - स्रोत वेबसाइट या कार्यालय
            
            यदि कोई कीमत जानकारी नहीं मिलती है, तो "कोई कीमत जानकारी नहीं" लिखें।
            """
        else:
            return f"""
            You need to search for {commodity} price information in {location}.
            
            This location can be anywhere in India - a village, town, city, district, or state.
            
            Search the following sources:
            1. eNAM (enam.gov.in) - National Agricultural Market
            2. Agmarknet (agmarknet.gov.in) - Agricultural Marketing
            3. CEDA (agmarknet.ceda.ashoka.edu.in) - Agricultural Data
            4. State government agricultural websites
            5. District and taluka level websites
            6. Local mandi and market websites
            7. Agricultural department offices
            8. Farmer Producer Organizations (FPO)
            
            If prices are not found in {location}, search in nearby areas.
            
            For each price found, provide:
            - Crop name
            - Price (per quintal or per kg)
            - Mandi name
            - Location (village/town/city/district)
            - Date
            - Source website or office
            
            If no price information is found, respond with "No price information available".
            """
    
    async def _search_nearby_areas(self, commodity: str, location: str, lang: str, llm_service) -> List[Dict]:
        """Search for prices in nearby areas"""
        try:
            # Identify nearby areas
            nearby_prompt = self._create_nearby_search_prompt(commodity, location, lang)
            nearby_response = await llm_service.get_completion(nearby_prompt)
            
            # Parse nearby areas response
            nearby_areas = self._parse_nearby_areas(nearby_response)
            
            if not nearby_areas:
                return []
            
            # Search each nearby area
            all_prices = []
            for area in nearby_areas[:3]:  # Limit to 3 nearby areas
                try:
                    area_prompt = self._create_search_prompt(commodity, area, lang)
                    area_response = await llm_service.get_completion(area_prompt)
                    area_prices = self._parse_gpt_response(area_response, commodity, area)
                    if area_prices:
                        all_prices.extend(area_prices)
                except Exception as e:
                    logger.warning(f"⚠️ Failed to search {area}: {e}")
                    continue
            
            return all_prices
            
        except Exception as e:
            logger.error(f"❌ Nearby areas search failed: {e}")
            return []
    
    def _create_nearby_search_prompt(self, commodity: str, location: str, lang: str) -> str:
        """Create prompt for identifying nearby areas - Universal for all of India"""
        if lang == "hi":
            return f"""
            {location} के निकटवर्ती क्षेत्रों की पहचान करें जहां {commodity} की कीमत जानकारी मिल सकती है।
            
            यह स्थान भारत में कहीं भी हो सकता है - गाँव, कस्बा, शहर, जिला, या राज्य।
            
            निम्नलिखित प्रकार के क्षेत्रों पर विचार करें:
            1. पड़ोसी गाँव और कस्बे
            2. पड़ोसी जिले
            3. पड़ोसी राज्य
            4. प्रमुख कृषि केंद्र
            5. प्रमुख मंडी केंद्र
            6. कृषि विश्वविद्यालय के आसपास के क्षेत्र
            7. कृषि विभाग के कार्यालय वाले क्षेत्र
            
            प्रत्येक क्षेत्र के लिए निम्नलिखित जानकारी दें:
            - क्षेत्र का नाम (गाँव/कस्बा/शहर/जिला)
            - राज्य
            - {location} से दूरी (अनुमानित)
            
            केवल 5 सबसे प्रासंगिक क्षेत्र सूचीबद्ध करें।
            """
        else:
            return f"""
            Identify nearby areas to {location} where {commodity} price information might be available.
            
            This location can be anywhere in India - a village, town, city, district, or state.
            
            Consider the following types of areas:
            1. Neighboring villages and towns
            2. Neighboring districts
            3. Neighboring states
            4. Major agricultural centers
            5. Major mandi centers
            6. Areas around agricultural universities
            7. Areas with agricultural department offices
            
            For each area, provide:
            - Area name (village/town/city/district)
            - State
            - Estimated distance from {location}
            
            List only the 5 most relevant areas.
            """
    
    def _parse_nearby_areas(self, response: str) -> List[str]:
        """Parse GPT response for nearby areas"""
        try:
            areas = []
            lines = response.split('\n')
            
            for line in lines:
                line = line.strip()
                if line and not line.startswith('-') and not line.startswith('•'):
                    # Extract area name (usually first part before comma)
                    if ',' in line:
                        area = line.split(',')[0].strip()
                        if area and len(area) > 2:
                            areas.append(area)
                    else:
                        if line and len(line) > 2:
                            areas.append(line)
            
            return areas[:5]  # Return max 5 areas
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse nearby areas: {e}")
            return []
    
    def _parse_gpt_response(self, response: str, commodity: str, location: str) -> List[Dict]:
        """Parse GPT response for price information - Ultra flexible for LLM consumption"""
        try:
            if not response or "no price information available" in response.lower() or "कोई कीमत जानकारी नहीं" in response:
                return []
            
            prices = []
            lines = response.split('\n')
            
            # Track if we found any useful information
            found_useful_info = False
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Ultra-flexible parsing - capture ANY line that might contain useful info
                useful_keywords = [
                    'price', 'rate', 'cost', 'value', 'market', 'mandi', 'bazaar',
                    'quintal', 'kg', 'ton', 'rupee', 'rs', '₹', 'dollar', '$',
                    'tomato', 'wheat', 'rice', 'onion', 'potato', 'cotton',
                    'mandi', 'market', 'center', 'office', 'department',
                    'government', 'sarkar', 'sarkari', 'private', 'niji',
                    'farmer', 'kisan', 'trader', 'vyapari', 'wholesale',
                    'retail', 'bulk', 'quality', 'grade', 'fresh', 'dry',
                    'village', 'town', 'city', 'district', 'state', 'taluka',
                    'block', 'panchayat', 'municipality', 'corporation'
                ]
                
                # Check if line contains any useful information
                line_lower = line.lower()
                has_useful_info = any(keyword in line_lower for keyword in useful_keywords)
                
                if has_useful_info or len(line) > 10:  # Capture longer lines as they might have context
                    found_useful_info = True
                    
                    # Try to extract price information first
                    price_entry = self._extract_price_from_line(line, commodity, location)
                    
                    if price_entry:
                        prices.append(price_entry)
                        logger.info(f"✅ Extracted price: {price_entry}")
                    else:
                        # Even if no price, capture the line as useful information
                        info_entry = self._extract_info_entry(line, commodity, location)
                        if info_entry:
                            prices.append(info_entry)
                            logger.info(f"📝 Captured info: {info_entry}")
            
            if not found_useful_info:
                logger.info("⚠️ No useful information found in GPT response")
            else:
                logger.info(f"🔍 Found {len(prices)} useful entries (prices + info)")
            
            return prices
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse GPT response: {e}")
            return []
    
    def _extract_info_entry(self, line: str, commodity: str, location: str) -> Optional[Dict]:
        """Extract any useful information entry when price extraction fails"""
        try:
            # Clean the line
            clean_line = line.strip()
            if len(clean_line) < 5:
                return None
            
            # Try to identify what type of information this is
            info_type = "General Information"
            if any(word in clean_line.lower() for word in ['mandi', 'market', 'bazaar']):
                info_type = "Market Information"
            elif any(word in clean_line.lower() for word in ['price', 'rate', 'cost']):
                info_type = "Price Related"
            elif any(word in clean_line.lower() for word in ['government', 'sarkar', 'office']):
                info_type = "Government Information"
            elif any(word in clean_line.lower() for word in ['farmer', 'kisan', 'trader']):
                info_type = "Stakeholder Information"
            
            return {
                "commodity": commodity,
                "location": location,
                "price": "Information Available",
                "mandi": "Various Sources",
                "quality": "Informational",
                "source": "GPT-4 Location Search",
                "url": "AI Generated",
                "last_updated": self._get_timestamp(),
                "tier": "Tier 2 (GPT-4 Location Search)",
                "info_type": info_type,
                "raw_text": clean_line[:200],  # Store the actual text for LLM consumption
                "useful_for": "Market analysis and decision making"
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to extract info entry: {e}")
            return None
    
    def _extract_price_from_line(self, line: str, commodity: str, location: str) -> Optional[Dict]:
        """Extract price information from a single line"""
        try:
            import re
            
            # More flexible price patterns
            price_patterns = [
                r'₹\s*(\d{1,3}(?:,\d{3})*)\s*/?\s*Quintal',
                r'(\d{1,3}(?:,\d{3})*)\s*₹\s*/?\s*Quintal',
                r'Price[:\s]*(\d{1,3}(?:,\d{3})*)',
                r'Rate[:\s]*(\d{1,3}(?:,\d{3})*)',
                r'(\d{1,3}(?:,\d{3})*)\s*per\s*quintal',
                r'(\d{1,3}(?:,\d{3})*)\s*quintal',
                r'(\d{1,3}(?:,\d{3})*)\s*rs',
                r'(\d{1,3}(?:,\d{3})*)\s*rupees',
                r'(\d{1,3}(?:,\d{3})*)\s*/-',
                r'(\d{1,3}(?:,\d{3})*)\s*per\s*kg',
                r'(\d{1,3}(?:,\d{3})*)\s*kg'
            ]
            
            price = None
            for pattern in price_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    price = match.group(1)
                    break
            
            if not price:
                # Try to find any number that might be a price
                number_match = re.search(r'(\d{2,4})', line)
                if number_match:
                    price = number_match.group(1)
                    logger.info(f"🔍 Found potential price: {price} from line: {line}")
            
            if not price:
                return None
            
            # Extract mandi name (look for common mandi keywords)
            mandi = "Unknown"
            mandi_keywords = ["mandi", "market", "bazaar", "mandi", "मंडी", "center", "office"]
            for keyword in mandi_keywords:
                if keyword in line.lower():
                    # Extract text around keyword
                    parts = line.lower().split(keyword)
                    if len(parts) > 1:
                        mandi = parts[1].split()[0] if parts[1].split() else "Unknown"
                        break
            
            return {
                "commodity": commodity,
                "location": location,
                "price": f"₹{price}/Quintal",
                "mandi": mandi.title(),
                "quality": "Standard",
                "source": "GPT-4 Location Search",
                "url": "AI Generated",
                "last_updated": self._get_timestamp(),
                "tier": "Tier 2 (GPT-4 Location Search)"
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to extract price from line: {e}")
            return None
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
