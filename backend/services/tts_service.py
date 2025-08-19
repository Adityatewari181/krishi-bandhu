import logging
import asyncio
import os
import time
import hashlib
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class TTSService:
    """
    Text-to-Speech service using Google Text-to-Speech (gTTS).
    Generates audio responses that can be played in the frontend.
    """
    
    def __init__(self):
        self.audio_cache = {}
        self.cache_ttl = 3600  # 1 hour cache for audio files
        
        # Use absolute path to ensure consistency with FastAPI static mounting
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.audio_dir = os.path.join(backend_dir, "static", "audio")
        
        # Create audio directory if it doesn't exist
        os.makedirs(self.audio_dir, exist_ok=True)
        
        # Voice configurations for gTTS
        self.voice_configs = {
            "en": {
                "gtts_lang": "en",
                "gtts_tld": "com"  # Use default Google TLD
            },
            "hi": {
                "gtts_lang": "hi",
                "gtts_tld": "com"  # Use default Google TLD
            }
        }
        
        # Test gTTS availability
        try:
            from gtts import gTTS
            self.gtts_available = True
            logger.info(f"TTS Service initialized successfully with gTTS - Cache dir: {self.audio_dir}")
            logger.info(f"Audio files will be accessible at: /static/audio/")
        except ImportError:
            self.gtts_available = False
            logger.error("gTTS not available - install with: pip install gtts")
    
    async def generate_audio_response(self, text: str, language: str = "en", user_id: str = None) -> Optional[str]:
        """
        Generate audio response and return the URL to access it.
        
        Args:
            text: Text to convert to speech
            language: Language code (en/hi)
            user_id: User ID for personalized caching
            
        Returns:
            URL to access the audio file, or None if generation failed
        """
        try:
            if not text or not text.strip():
                return None
            
            # Generate cache key
            cache_key = self._generate_cache_key(text, language, user_id)
            
            # Check if audio already exists in cache
            if cache_key in self.audio_cache:
                cached_time, audio_url = self.audio_cache[cache_key]
                if time.time() - cached_time < self.cache_ttl:
                    logger.info(f"Using cached audio for key: {cache_key[:16]}...")
                    return audio_url
            
            # Clean text for TTS
            clean_text = self._clean_text_for_tts(text)
            if not clean_text:
                return None
            
            # Generate audio file using gTTS
            audio_filename = f"{cache_key}.mp3"
            audio_path = os.path.join(self.audio_dir, audio_filename)
            
            # Generate audio using gTTS
            success = await self._generate_gtts_audio(clean_text, language, audio_path)
            
            if success and os.path.exists(audio_path):
                # Generate URL (assuming the audio directory is served statically)
                audio_url = f"/static/audio/{audio_filename}"
                
                # Cache the result
                self.audio_cache[cache_key] = (time.time(), audio_url)
                
                logger.info(f"Generated audio response: {audio_url}")
                return audio_url
            else:
                # Try fallback TTS if gTTS fails
                logger.warning("gTTS failed, trying fallback TTS...")
                fallback_success = await self._generate_fallback_audio(clean_text, language, audio_path)
                
                if fallback_success and os.path.exists(audio_path):
                    audio_url = f"/static/audio/{audio_filename}"
                    self.audio_cache[cache_key] = (time.time(), audio_url)
                    logger.info(f"Generated fallback audio response: {audio_url}")
                    return audio_url
                else:
                    logger.error(f"Both gTTS and fallback TTS failed for text: {text[:50]}...")
                    return None
                
        except Exception as e:
            logger.error(f"Audio generation error: {e}")
            return None
    
    async def _generate_gtts_audio(self, text: str, language: str, output_path: str) -> bool:
        """Generate audio using Google Text-to-Speech (gTTS)"""
        try:
            if not self.gtts_available:
                logger.error("gTTS not available - install with: pip install gtts")
                return False
                
            # Import gTTS
            from gtts import gTTS
            
            voice_config = self.voice_configs.get(language, self.voice_configs["en"])
            gtts_lang = voice_config["gtts_lang"]
            gtts_tld = voice_config.get("gtts_tld", "com")
            
            # Generate TTS with optimal settings and timeout
            tts = gTTS(
                text=text, 
                lang=gtts_lang, 
                tld=gtts_tld, 
                slow=False  # Normal speed for better user experience
            )
            
            # Save to file with timeout (run in executor to avoid blocking)
            try:
                await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(None, tts.save, output_path),
                    timeout=30.0  # 30 second timeout
                )
            except asyncio.TimeoutError:
                logger.error("gTTS generation timed out after 30 seconds")
                return False
            
            logger.info(f"gTTS audio generated successfully: {output_path}")
            return True
            
        except ImportError:
            logger.error("gTTS not available - install with: pip install gtts")
            return False
        except Exception as e:
            logger.error(f"gTTS generation failed: {e}")
            
            # Try alternative TLD if the first one fails
            try:
                logger.info("Attempting with alternative TLD...")
                tts = gTTS(
                    text=text, 
                    lang=gtts_lang, 
                    tld="com",  # Try default TLD
                    slow=False
                )
                await asyncio.get_event_loop().run_in_executor(None, tts.save, output_path)
                logger.info(f"gTTS audio generated with alternative TLD: {output_path}")
                return True
            except Exception as e2:
                logger.error(f"Alternative TLD also failed: {e2}")
                return False
    
    async def _generate_fallback_audio(self, text: str, language: str, output_path: str) -> bool:
        """Generate audio using a fallback method when gTTS is not available"""
        try:
            logger.info("Using fallback TTS method...")
            
            # For now, create a simple text file indicating TTS is unavailable
            # In a real implementation, you could use:
            # - pyttsx3 (offline TTS)
            # - espeak (Linux)
            # - Windows SAPI (Windows)
            # - Azure Speech Service (if available)
            
            fallback_text = f"Audio not available due to network connectivity issues. Please read the text response."
            
            # Create a simple audio file or return False
            logger.warning("Fallback TTS not implemented - network connectivity required for gTTS")
            return False
            
        except Exception as e:
            logger.error(f"Fallback TTS generation failed: {e}")
            return False
    
    def _generate_cache_key(self, text: str, language: str, user_id: str = None) -> str:
        """Generate a unique cache key for the audio"""
        content = f"{text}_{language}_{user_id or 'anonymous'}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    def _clean_text_for_tts(self, text: str) -> str:
        """Clean text for better TTS pronunciation"""
        import re
        
        # Remove asterisks and other formatting characters
        text = re.sub(r'\*+', '', text)  # Remove asterisks
        text = re.sub(r'#+', '', text)  # Remove hash symbols
        text = re.sub(r'`+', '', text)  # Remove backticks
        text = re.sub(r'_{2,}', '', text)  # Remove double underscores
        
        # Remove emojis
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"  # emoticons
            u"\U0001F300-\U0001F5FF"  # symbols & pictographs
            u"\U0001F680-\U0001F6FF"  # transport & map symbols
            u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
            u"\U00002500-\U00002BEF"  # chinese char
            u"\U00002702-\U000027B0"
            u"\U00002702-\U000027B0"
            u"\U000024C2-\U0001F251"
            u"\U0001f926-\U0001f937"
            u"\U00010000-\U0010ffff"
            u"\u2640-\u2642" 
            u"\u2600-\u2B55"
            u"\u200d"
            u"\u23cf"
            u"\u23e9"
            u"\u231a"
            u"\ufe0f"  # dingbats
            u"\u3030"
            "]+", flags=re.UNICODE)
        
        text = emoji_pattern.sub(r'', text)
        
        # Replace bullet points with pauses
        text = re.sub(r'[•▪▫◦‣⁃]', '. ', text)
        
        # Replace URLs with "link"
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', 'link', text)
        
        # Clean up multiple spaces and newlines
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # Limit length for TTS (most services have limits)
        if len(text) > 2000:
            text = text[:1997] + "..."
        
        return text
    
    def cleanup_old_audio_files(self, max_age_hours: int = 24):
        """Clean up old audio files to save disk space"""
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for filename in os.listdir(self.audio_dir):
                if filename.endswith('.mp3'):
                    file_path = os.path.join(self.audio_dir, filename)
                    file_age = current_time - os.path.getmtime(file_path)
                    
                    if file_age > max_age_seconds:
                        os.remove(file_path)
                        logger.info(f"Cleaned up old audio file: {filename}")
            
            # Also clean up memory cache
            expired_keys = []
            for key, (cached_time, _) in self.audio_cache.items():
                if current_time - cached_time > self.cache_ttl:
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self.audio_cache[key]
                
        except Exception as e:
            logger.warning(f"Audio cleanup error: {e}")

# Global TTS service instance
tts_service = TTSService()
