"""
🛠️ Base Tool Class for Market Price Tools

All market price tools inherit from this base class to ensure consistent interface
and common functionality.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

class BaseMarketTool(ABC):
    """Base class for all market price tools"""
    
    def __init__(self, name: str, tier: int, cost: str, speed: str):
        self.name = name
        self.tier = tier
        self.cost = cost
        self.speed = speed
        self.enabled = True
        
    @abstractmethod
    async def execute(self, commodity: str, location: str, lang: str) -> Optional[List[Dict]]:
        """Execute the tool and return price data or None"""
        pass
    
    def is_enabled(self) -> bool:
        """Check if tool is enabled"""
        return self.enabled
    
    def enable(self, enable: bool = True):
        """Enable or disable the tool"""
        self.enabled = enable
        status = "enabled" if enable else "disabled"
        logger.info(f"🛠️ {self.name} {status}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get tool status information"""
        return {
            "name": self.name,
            "tier": self.tier,
            "cost": self.cost,
            "speed": self.speed,
            "enabled": self.enabled
        }
    
    async def execute_with_timeout(self, commodity: str, location: str, lang: str, 
                                 timeout: int = 30) -> Optional[List[Dict]]:
        """Execute tool with timeout protection"""
        try:
            return await asyncio.wait_for(
                self.execute(commodity, location, lang), 
                timeout=timeout
            )
        except asyncio.TimeoutError:
            logger.warning(f"⏱️ {self.name} execution timed out after {timeout}s")
            return None
        except Exception as e:
            logger.error(f"❌ {self.name} execution failed: {e}")
            return None
