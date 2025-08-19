"""
🛠️ Tier 1: Direct Scrape Tool

Handles direct scraping from eNAM and CEDA without AI assistance.
Fastest tier with zero AI cost.
"""

import logging
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple



from .base_tool import BaseMarketTool

logger = logging.getLogger(__name__)

class DirectScrapeTool(BaseMarketTool):
    """Tier 1: Direct scraping from eNAM and CEDA"""
    
    def __init__(self):
        super().__init__(
            name="Direct Scrape (eNAM & CEDA)",
            tier=1,
            cost="Zero AI Cost",
            speed="Fastest"
        )
        self._session = None  # Lazy initialization
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ]
        self.enam_url = "https://enam.gov.in/web/commodity/commodity-wise-price"
        self.ceda_url = "https://agmarknet.ceda.ashoka.edu.in/commodities"
        
        # Simple in-memory cache (15-min TTL)
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._cache_ttl = 900  # seconds
    
    def _get_session(self):
        """Lazy session creation to avoid event loop issues during import"""
        if self._session is None:
            import aiohttp
            self._session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15))
        return self._session
    
    async def execute(self, commodity: str, location: str, lang: str) -> Optional[List[Dict]]:
        """Execute direct scraping from eNAM and CEDA"""
        if not self.enabled:
            logger.info("🛠️ Direct Scrape Tool is disabled")
            return None
            
        logger.info("🚀 Tier 1: Direct Scraping (eNAM & CEDA)...")
        
        # Try eNAM first (fastest)
        prices = await self._fetch_enam_prices(commodity, location)
        if prices:
            logger.info(f"✅ eNAM found {len(prices)} price records")
            return prices
        
        # Try CEDA (fast backup)
        prices = await self._fetch_ceda_prices(commodity, location)
        if prices:
            logger.info(f"✅ CEDA found {len(prices)} price records")
            return prices
        
        logger.info("⚠️ No data found from direct scraping")
        return None
    
    async def _fetch_enam_prices(self, commodity: str, location: str) -> Optional[List[Dict]]:
        """Fetch prices from eNAM"""
        try:
            state, district = self._parse_location(location)
            if not state or not district:
                return None
                
            cache_key = f"enam:{commodity}:{state}:{district}"
            cached = self._cache_get(cache_key)
            if cached:
                return cached
            
            from datetime import datetime
            form = {
                "commodity": commodity.upper(),
                "state": state.upper(),
                "district": district.upper(),
                "fromDate": self._get_date_formatted(),
                "toDate": self._get_date_formatted()
            }
            
            headers = {
                "User-Agent": self.user_agents[0],
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://enam.gov.in/web/commodity"
            }
            
            async with self._get_session().post(self.enam_url, data=form, headers=headers) as resp:
                if resp.status != 200:
                    return None
                    
                ctype = resp.headers.get("content-type", "")
                if "json" in ctype:
                    raw = await resp.json()
                    parsed = self._parse_enam_json(raw, commodity, state, district)
                else:
                    html = await resp.text()
                    parsed = self._parse_enam_html(html, commodity, state, district)
                    
                if parsed:
                    self._cache_set(cache_key, parsed)
                return parsed
                
        except Exception as e:
            logger.error(f"❌ eNAM scraping failed: {e}")
            return None
    
    async def close(self):
        """Close the aiohttp session"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def _get_date_formatted(self) -> str:
        """Get current date in dd-mm-yyyy format"""
        from datetime import datetime
        return datetime.now().strftime("%d-%m-%Y")
    
    async def _fetch_ceda_prices(self, commodity: str, location: str) -> Optional[List[Dict]]:
        """Fetch prices from CEDA"""
        try:
            cache_key = f"ceda:{commodity}"
            cached = self._cache_get(cache_key)
            if cached:
                return cached
                
            async with self._get_session().get(self.ceda_url) as resp:
                if resp.status != 200:
                    return None
                    
                html = await resp.text()
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html, "html.parser")
                rows = soup.find_all("tr")
                
                for row in rows:
                    cols = [c.get_text(strip=True) for c in row.find_all("td")]
                    if len(cols) >= 6 and cols[1].upper() == commodity.upper():
                        try:
                            price = float(cols[3].replace(",", ""))
                            if self._validate_price(price, commodity):
                                entry = self._make_entry(price, commodity, cols[4], "")
                                self._cache_set(cache_key, [entry])
                                return [entry]
                        except:
                            continue
                            
            return None
            
        except Exception as e:
            logger.error(f"❌ CEDA scraping failed: {e}")
            return None
    
    def _parse_enam_json(self, data: Any, commodity: str, state: str, district: str) -> Optional[List[Dict]]:
        """Parse eNAM JSON response"""
        arr = []
        if isinstance(data, dict):
            for v in data.values():
                if isinstance(v, list):
                    arr.extend(v)
        elif isinstance(data, list):
            arr = data
            
        results = []
        for item in arr:
            if not isinstance(item, dict):
                continue
            if commodity.upper() not in str(item).upper():
                continue
                
            price = self._extract_price(item)
            if price and self._validate_price(price, commodity):
                results.append(self._make_entry(price, commodity, state, district))
                
        return results or None
    
    def _parse_enam_html(self, html: str, commodity: str, state: str, district: str) -> Optional[List[Dict]]:
        """Parse eNAM HTML response"""
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        rows = soup.find_all("tr")
        
        for row in rows:
            text = row.get_text(" ", strip=True)
            if commodity.upper() in text.upper() and state.upper() in text.upper():
                nums = re.findall(r"\d{1,3}(?:,\d{3})*", text)
                if nums:
                    price = float(nums[-1].replace(",", ""))
                    if self._validate_price(price, commodity):
                        return [self._make_entry(price, commodity, state, district)]
        return None
    
    def _extract_price(self, item: Dict) -> Optional[float]:
        """Extract price from item"""
        for key in ["modalPrice", "modal_price", "price", "rate", "value"]:
            if key in item and item[key]:
                try:
                    return float(str(item[key]).replace(",", ""))
                except:
                    continue
        return None
    
    def _validate_price(self, price: float, commodity: str) -> bool:
        """Validate price is within reasonable range"""
        ranges = {
            "tomato": (300, 8000), 
            "wheat": (1500, 4000), 
            "rice": (1200, 4500), 
            "onion": (400, 6000), 
            "potato": (300, 4000)
        }
        lo, hi = ranges.get(commodity.lower(), (100, 15000))
        return lo <= price <= hi
    
    def _make_entry(self, price: float, commodity: str, state: str, district: str) -> Dict[str, Any]:
        """Create price entry"""
        return {
            "commodity": commodity.title(),
            "price": price,
            "price_unit": "₹/Quintal",
            "state": state.title() if state else "Unknown",
            "district": district.title() if district else "Unknown",
            "last_updated": self._get_timestamp(),
            "source": "eNAM" if state else "CEDA",
            "reliability": "HIGH",
            "tier": 1
        }
    
    def _parse_location(self, loc: str) -> Tuple[Optional[str], Optional[str]]:
        """Parse location string to extract state and district"""
        if not loc or "," not in loc:
            return None, None
        parts = [p.strip() for p in loc.split(",")]
        if len(parts) >= 2:
            district, state = parts[0], parts[-1]
            return state.upper(), district.upper()
        return None, None
    
    def _cache_get(self, key: str):
        """Get cached value"""
        entry = self._cache.get(key)
        if entry and time.time() - entry[0] < self._cache_ttl:
            return entry[1]
        self._cache.pop(key, None)
        return None
    
    def _cache_set(self, key: str, value: Any):
        """Set cached value"""
        self._cache[key] = (time.time(), value)
    
    async def close(self):
        """Close the tool and cleanup resources"""
        await self._get_session().close()
