"""
🌐 Tier 3: GPT-4 Global Web Search + Fallback Tool

Uses GPT-4 to search across the entire web for price information and provides helpful fallback suggestions.
"""

import logging
from typing import List, Dict, Any, Optional
from .base_tool import BaseMarketTool

logger = logging.getLogger(__name__)

class GPTGlobalSearchTool(BaseMarketTool):
    """Tier 3: GPT-4 Global Web Search + Fallback Tool"""
    
    def __init__(self):
        super().__init__(
            name="GPT-4 Global Web Search",
            tier=3,
            cost="High AI Cost",
            speed="Slow"
        )
    
    async def execute(self, commodity: str, location: str, lang: str) -> Optional[List[Dict]]:
        """Execute global web search using GPT-4"""
        try:
            logger.info(f"🌐 Searching globally for {commodity} prices using GPT-4...")
            
            # Import LLM service - Robust import handling
            llm_service = self._get_llm_service()
            if not llm_service:
                logger.error("❌ Could not import LLM service")
                return None
            
            # Create comprehensive search prompt
            prompt = self._create_global_search_prompt(commodity, location, lang)
            
            # Get GPT-4 response
            response = await llm_service.get_completion(prompt)
            
            # Debug: Log the actual GPT response
            logger.info(f"🔍 GPT-4 Global Response: {response[:200]}...")
            
            # Parse response for price data
            prices = self._parse_global_response(response, commodity, location)
            
            if prices:
                logger.info(f"✅ Global search found {len(prices)} price records")
                return prices
            else:
                logger.info("⚠️ No price data found globally, providing fallback suggestions...")
                logger.info(f"🔍 Parsed prices count: {len(prices)}")
                
                # Get fallback suggestions
                fallback_suggestions = await self._get_fallback_suggestions(commodity, location, lang, llm_service)
                return fallback_suggestions
                
        except Exception as e:
            logger.error(f"❌ Global web search failed: {e}")
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
    
    def _create_global_search_prompt(self, commodity: str, location: str, lang: str) -> str:
        """Create comprehensive global search prompt - Universal for all of India"""
        if lang == "hi":
            return f"""
            आपको {commodity} की कीमत जानकारी {location} में या कहीं भी खोजनी है।
            
            यह स्थान भारत में कहीं भी हो सकता है - गाँव, कस्बा, शहर, जिला, या राज्य।
            
            निम्नलिखित सभी संभावित स्रोतों से खोजें:
            1. सरकारी कृषि वेबसाइटें (eNAM, Agmarknet, CEDA)
            2. राज्य सरकार की कृषि वेबसाइटें
            3. जिला और तालुका स्तर की वेबसाइटें
            4. कृषि विश्वविद्यालयों की वेबसाइटें
            5. कृषि विभाग की वेबसाइटें
            6. निजी कृषि पोर्टल
            7. समाचार वेबसाइटें
            8. सोशल मीडिया पोस्ट
            9. किसान फोरम और ब्लॉग
            10. मंडी और व्यापारी वेबसाइटें
            11. किसान उत्पादक संगठन (FPO) वेबसाइटें
            12. स्थानीय कृषि कार्यालयों की जानकारी
            
            यदि {location} में कीमत नहीं मिलती है, तो:
            - निकटवर्ती गाँवों और कस्बों में खोजें
            - निकटवर्ती जिलों में खोजें
            - निकटवर्ती राज्यों में खोजें
            - राष्ट्रीय स्तर पर खोजें
            
            प्रत्येक कीमत के लिए निम्नलिखित जानकारी दें:
            - फसल का नाम
            - कीमत (प्रति क्विंटल या प्रति किलो)
            - मंडी का नाम
            - स्थान (गाँव/कस्बा/शहर/जिला)
            - तारीख
            - स्रोत वेबसाइट
            - विश्वसनीयता स्तर
            
            यदि कोई कीमत जानकारी नहीं मिलती है, तो "कोई कीमत जानकारी नहीं" लिखें।
            """
        else:
            return f"""
            You need to search for {commodity} price information in {location} or anywhere globally.
            
            This location can be anywhere in India - a village, town, city, district, or state.
            
            Search ALL possible sources including:
            1. Government agricultural websites (eNAM, Agmarknet, CEDA)
            2. State government agricultural websites
            3. District and taluka level websites
            4. Agricultural university websites
            5. Agricultural department websites
            6. Private agricultural portals
            7. News websites
            8. Social media posts
            9. Farmer forums and blogs
            10. Mandi and trader websites
            11. Farmer Producer Organization (FPO) websites
            12. Local agricultural office information
            
            If prices are not found in {location}, search:
            - In neighboring villages and towns
            - In neighboring districts
            - In neighboring states
            - At national level
            
            For each price found, provide:
            - Crop name
            - Price (per quintal or per kg)
            - Mandi name
            - Location (village/town/city/district)
            - Date
            - Source website
            - Reliability level
            
            If no price information is found, respond with "No price information available".
            """
    
    async def _get_fallback_suggestions(self, commodity: str, location: str, lang: str, llm_service) -> List[Dict]:
        """Get fallback suggestions when no price data is found"""
        try:
            # Create fallback prompt
            fallback_prompt = self._create_fallback_prompt(commodity, location, lang)
            
            # Get GPT-4 response
            response = await llm_service.get_completion(fallback_prompt)
            
            # Parse fallback suggestions
            suggestions = self._parse_fallback_suggestions(response, commodity, location)
            
            return suggestions
            
        except Exception as e:
            logger.error(f"❌ Fallback suggestions failed: {e}")
            return []
    
    def _create_fallback_prompt(self, commodity: str, location: str, lang: str) -> str:
        """Create prompt for fallback suggestions"""
        if lang == "hi":
            return f"""
            {commodity} की कीमत जानकारी {location} में नहीं मिल रही है। 
            
            कृपया निम्नलिखित प्रकार के वैकल्पिक स्रोतों के बारे में सुझाव दें:
            
            1. **स्थानीय संसाधन:**
               - कौन से स्थानीय मंडी जा सकते हैं?
               - कौन से कृषि कार्यालय संपर्क कर सकते हैं?
               - कौन से किसान संगठन मदद कर सकते हैं?
            
            2. **डिजिटल संसाधन:**
               - कौन से मोबाइल ऐप उपयोग कर सकते हैं?
               - कौन से वेबसाइट चेक कर सकते हैं?
               - कौन से सोशल मीडिया ग्रुप जॉइन कर सकते हैं?
            
            3. **मानव संसाधन:**
               - कौन से विशेषज्ञ संपर्क कर सकते हैं?
               - कौन से हेल्पलाइन कॉल कर सकते हैं?
               - कौन से किसान नेटवर्क में शामिल हो सकते हैं?
            
            4. **वैकल्पिक तरीके:**
               - कीमत जानकारी प्राप्त करने के अन्य तरीके क्या हैं?
               - भविष्य में कीमत की जानकारी कैसे प्राप्त कर सकते हैं?
               - कीमत की जानकारी के लिए कौन से अलर्ट सेट कर सकते हैं?
            
            प्रत्येक सुझाव के लिए निम्नलिखित जानकारी दें:
            - सुझाव का प्रकार
            - विस्तृत विवरण
            - संपर्क जानकारी (यदि उपलब्ध हो)
            - अनुमानित लागत
            - समय सीमा
            """
        else:
            return f"""
            {commodity} price information is not available in {location}.
            
            Please provide suggestions for the following types of alternative sources:
            
            1. **Local Resources:**
               - Which local mandis can be visited?
               - Which agricultural offices can be contacted?
               - Which farmer organizations can help?
            
            2. **Digital Resources:**
               - Which mobile apps can be used?
               - Which websites can be checked?
               - Which social media groups can be joined?
            
            3. **Human Resources:**
               - Which experts can be contacted?
               - Which helplines can be called?
               - Which farmer networks can be joined?
            
            4. **Alternative Methods:**
               - What other ways to get price information?
               - How to get price information in the future?
               - What alerts can be set for price information?
            
            For each suggestion, provide:
            - Type of suggestion
            - Detailed description
            - Contact information (if available)
            - Estimated cost
            - Timeline
            """
    
    def _parse_fallback_suggestions(self, response: str, commodity: str, location: str) -> List[Dict]:
        """Parse GPT response for fallback suggestions"""
        try:
            suggestions = []
            lines = response.split('\n')
            
            current_suggestion = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Look for suggestion patterns
                if any(keyword in line.lower() for keyword in ['mandi', 'office', 'app', 'website', 'expert', 'helpline', 'network']):
                    if current_suggestion:
                        suggestions.append(current_suggestion)
                    
                    current_suggestion = {
                        "commodity": commodity,
                        "location": location,
                        "price": "Guidance Available",
                        "mandi": "Alternative Source",
                        "quality": "Guidance",
                        "source": "GPT-4 Fallback Suggestions",
                        "url": "AI Generated",
                        "last_updated": self._get_timestamp(),
                        "tier": "Tier 3 (GPT-4 Global Search)",
                        "suggestion": line,
                        "type": self._categorize_suggestion(line)
                    }
                elif current_suggestion and line:
                    # Add additional details to current suggestion
                    if 'suggestion_details' not in current_suggestion:
                        current_suggestion['suggestion_details'] = []
                    current_suggestion['suggestion_details'].append(line)
            
            # Add the last suggestion
            if current_suggestion:
                suggestions.append(current_suggestion)
            
            return suggestions
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse fallback suggestions: {e}")
            return []
    
    def _categorize_suggestion(self, line: str) -> str:
        """Categorize the type of suggestion"""
        line_lower = line.lower()
        
        if any(keyword in line_lower for keyword in ['mandi', 'market', 'bazaar']):
            return "Local Market"
        elif any(keyword in line_lower for keyword in ['office', 'department', 'center']):
            return "Government Office"
        elif any(keyword in line_lower for keyword in ['app', 'mobile', 'website']):
            return "Digital Resource"
        elif any(keyword in line_lower for keyword in ['expert', 'helpline', 'contact']):
            return "Human Resource"
        elif any(keyword in line_lower for keyword in ['network', 'group', 'forum']):
            return "Community Network"
        else:
            return "General Guidance"
    
    def _parse_global_response(self, response: str, commodity: str, location: str) -> List[Dict]:
        """Parse global search response for price information - Ultra flexible for LLM consumption"""
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
                    'website', 'portal', 'app', 'mobile', 'online', 'digital',
                    'news', 'article', 'report', 'study', 'research', 'analysis',
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
                logger.info("⚠️ No useful information found in global GPT response")
            else:
                logger.info(f"🔍 Found {len(prices)} useful entries (prices + info)")
            
            return prices
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse global response: {e}")
            return []
    
    def _extract_price_from_line(self, line: str, commodity: str, location: str) -> Optional[Dict]:
        """Extract price information from a single line"""
        try:
            import re
            
            # Look for price patterns
            price_patterns = [
                r'₹\s*(\d{1,3}(?:,\d{3})*)\s*/?\s*Quintal',
                r'(\d{1,3}(?:,\d{3})*)\s*₹\s*/?\s*Quintal',
                r'Price[:\s]*(\d{1,3}(?:,\d{3})*)',
                r'Rate[:\s]*(\d{1,3}(?:,\d{3})*)'
            ]
            
            price = None
            for pattern in price_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    price = match.group(1)
                    break
            
            if not price:
                return None
            
            # Extract mandi name (look for common mandi keywords)
            mandi = "Unknown"
            mandi_keywords = ["mandi", "market", "bazaar", "mandi", "मंडी"]
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
                "source": "GPT-4 Global Search",
                "url": "AI Generated",
                "last_updated": self._get_timestamp(),
                "tier": "Tier 3 (GPT-4 Global Search)"
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to extract price from line: {e}")
            return None
    
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
            elif any(word in clean_line.lower() for word in ['website', 'portal', 'app']):
                info_type = "Digital Resource"
            elif any(word in clean_line.lower() for word in ['news', 'article', 'report']):
                info_type = "News/Media Information"
            
            return {
                "commodity": commodity,
                "location": location,
                "price": "Information Available",
                "mandi": "Various Sources",
                "quality": "Informational",
                "source": "GPT-4 Global Search",
                "url": "AI Generated",
                "last_updated": self._get_timestamp(),
                "tier": "Tier 3 (GPT-4 Global Search)",
                "info_type": info_type,
                "raw_text": clean_line[:200],  # Store the actual text for LLM consumption
                "useful_for": "Market analysis, decision making, and alternative source identification"
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to extract info entry: {e}")
            return None
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
