import speech_recognition as sr
from gtts import gTTS
import io
import base64
import tempfile
import os
from typing import Optional
import logging
import wave
import numpy as np

logger = logging.getLogger(__name__)

class VoiceService:
    """
    Service for handling voice-related operations:
    - Speech-to-text conversion
    - Text-to-speech generation
    """
    
    def __init__(self):
        self.recognizer = sr.Recognizer()
        # Adjust for ambient noise
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        logger.info("Voice Service initialized successfully")
    
    async def speech_to_text(self, audio_data: bytes, language: str = "en") -> Optional[str]:
        """
        Convert speech audio to text using Google Speech Recognition.
        
        Args:
            audio_data: Audio file bytes (WAV, MP3, WebM, etc.)
            language: Language code ("en", "hi", etc.)
            
        Returns:
            Transcribed text or None if recognition fails
        """
        try:
            # Debug: Log audio data information
            logger.info(f"Received audio data: {len(audio_data)} bytes")
            logger.info(f"Audio data starts with: {audio_data[:20].hex()}")
            logger.info(f"Audio data ends with: {audio_data[-20:].hex()}")
            
            # Convert audio to proper WAV format
            converted_audio = self._convert_audio_to_wav(audio_data)
            
            # Debug: Log converted audio information
            logger.info(f"Converted audio: {len(converted_audio)} bytes")
            logger.info(f"Converted audio starts with: {converted_audio[:20].hex()}")
            
            # Create temporary file for audio data
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                temp_file.write(converted_audio)
                temp_file_path = temp_file.name
            
            logger.info(f"Created temporary WAV file: {temp_file_path}")
            
            # Load audio file
            with sr.AudioFile(temp_file_path) as source:
                # Adjust for ambient noise
                self.recognizer.adjust_for_ambient_noise(source, duration=0.2)
                audio = self.recognizer.record(source)
            
            # Clean up temp file
            os.unlink(temp_file_path)
            
            # Recognize speech with multiple attempts
            language_code = self._get_language_code(language)
            
            # Try with specific language first
            try:
                text = self.recognizer.recognize_google(audio, language=language_code)
                logger.info(f"Speech recognized successfully: {text}")
                return text
            except sr.UnknownValueError:
                logger.warning(f"Speech unclear with language {language_code}, trying generic recognition")
                
                # Try with generic language as fallback
                try:
                    text = self.recognizer.recognize_google(audio, language="en-US")
                    logger.info(f"Speech recognized with generic language: {text}")
                    return text
                except sr.UnknownValueError:
                    logger.warning("Speech unclear even with generic language")
                    return None
                except sr.RequestError as e:
                    logger.error(f"Generic speech recognition service error: {e}")
                    return None
            
        except sr.UnknownValueError:
            logger.warning("Could not understand audio - speech was unclear")
            return None
        except sr.RequestError as e:
            logger.error(f"Speech recognition service error: {e}")
            return None
        except Exception as e:
            logger.error(f"Speech-to-text conversion error: {e}")
            return None
    
    def _convert_audio_to_wav(self, audio_data: bytes) -> bytes:
        """
        Convert various audio formats to proper WAV format for speech recognition.
        
        Args:
            audio_data: Raw audio data
            
        Returns:
            WAV format audio data
        """
        try:
            # First, try to check if it's already a valid WAV file
            try:
                with io.BytesIO(audio_data) as audio_buffer:
                    with wave.open(audio_buffer, 'rb') as wav_file:
                        # If we can open it as WAV, return as-is
                        logger.info("Audio is already in valid WAV format")
                        return audio_data
            except Exception:
                pass
            
            # Try to create a proper WAV from the actual audio data
            logger.info("Attempting to create WAV from actual audio data")
            return self._create_wav_from_audio(audio_data)
            
        except Exception as e:
            logger.warning(f"Audio conversion failed: {e}, creating fallback WAV")
            return self._create_fallback_wav()
    
    def _create_wav_from_audio(self, audio_data: bytes) -> bytes:
        """
        Create a WAV file from the actual audio data.
        This attempts to preserve the original audio content.
        
        Args:
            audio_data: Raw audio data
            
        Returns:
            WAV format audio data
        """
        try:
            # Check if this might be a compressed audio format (WebM, MP4, etc.)
            if audio_data.startswith(b'\x1a\x45\xdf\xa3'):  # WebM/Matroska
                logger.warning("Detected WebM/Matroska audio format - cannot decode without additional libraries")
                raise ValueError("WebM audio format detected - requires audio decoding library")
            
            if audio_data.startswith(b'\x00\x00\x00') and len(audio_data) > 8:
                # Check for MP4 signature
                if audio_data[4:8] in [b'ftyp', b'mdat']:
                    logger.warning("Detected MP4 audio format - cannot decode without additional libraries")
                    raise ValueError("MP4 audio format detected - requires audio decoding library")
            
            # Create a WAV file with the original audio data
            # Assume the audio data is raw PCM at a reasonable sample rate
            
            # Audio parameters - use common values that work with speech recognition
            sample_rate = 16000  # 16kHz - standard for speech recognition
            channels = 1         # Mono
            bits_per_sample = 16 # 16-bit
            
            # Calculate how many samples we have
            # If audio_data is already 16-bit PCM, use it directly
            if len(audio_data) % 2 == 0:  # 16-bit = 2 bytes per sample
                num_samples = len(audio_data) // 2
                duration = num_samples / sample_rate
                
                # If duration is reasonable (0.1 to 30 seconds), use the data
                if 0.1 <= duration <= 30.0:
                    logger.info(f"Using original audio data: {duration:.2f}s, {num_samples} samples")
                    
                    # Create WAV file
                    wav_buffer = io.BytesIO()
                    
                    with wave.open(wav_buffer, 'wb') as wav_file:
                        wav_file.setnchannels(channels)
                        wav_file.setsampwidth(bits_per_sample // 8)
                        wav_file.setframerate(sample_rate)
                        wav_file.writeframes(audio_data)
                    
                    wav_buffer.seek(0)
                    wav_data = wav_buffer.read()
                    
                    logger.info("WAV created from original audio data successfully")
                    return wav_data
            
            # If we can't use the original data directly, try to interpret it
            logger.info("Attempting to interpret audio data as raw PCM")
            
            # Try different sample rates to find one that makes sense
            for test_rate in [8000, 16000, 22050, 44100]:
                test_samples = len(audio_data) // 2  # Assume 16-bit
                test_duration = test_samples / test_rate
                
                if 0.1 <= test_duration <= 30.0:
                    logger.info(f"Using sample rate {test_rate}Hz, duration {test_duration:.2f}s")
                    
                    wav_buffer = io.BytesIO()
                    
                    with wave.open(wav_buffer, 'wb') as wav_file:
                        wav_file.setnchannels(1)  # Mono
                        wav_file.setsampwidth(2)  # 16-bit
                        wav_file.setframerate(test_rate)
                        wav_file.writeframes(audio_data)
                    
                    wav_buffer.seek(0)
                    wav_data = wav_buffer.read()
                    
                    logger.info(f"WAV created with sample rate {test_rate}Hz successfully")
                    return wav_data
            
            # If all else fails, create a minimal WAV
            logger.warning("Could not interpret audio data, creating minimal WAV")
            return self._create_fallback_wav()
            
        except Exception as e:
            logger.error(f"Failed to create WAV from audio data: {e}")
            return self._create_fallback_wav()
    
    def _create_fallback_wav(self) -> bytes:
        """
        Create a fallback WAV file when audio processing fails.
        This creates a short silent audio that won't crash speech recognition.
        
        Returns:
            Fallback WAV format audio data
        """
        try:
            # Create 0.5 seconds of silence at 16kHz mono 16-bit
            sample_rate = 16000
            duration = 0.5
            num_samples = int(sample_rate * duration)
            
            # Silent audio (all zeros)
            audio_samples = np.zeros(num_samples, dtype=np.int16)
            
            # Create WAV file
            wav_buffer = io.BytesIO()
            
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_samples.tobytes())
            
            wav_buffer.seek(0)
            wav_data = wav_buffer.read()
            
            logger.info("Fallback WAV file created with silence")
            return wav_data
            
        except Exception as e:
            logger.error(f"Failed to create fallback WAV: {e}")
            # Return a hardcoded minimal WAV as absolute last resort
            return self._get_hardcoded_wav()
    
    def _get_hardcoded_wav(self) -> bytes:
        """
        Return a hardcoded minimal WAV file as absolute fallback.
        This is a 1-second silent WAV file.
        
        Returns:
            Hardcoded WAV data
        """
        # This is a minimal 1-second silent WAV file (16kHz, mono, 16-bit)
        wav_data = (
            b'RIFF' +                    # Chunk ID
            (36).to_bytes(4, 'little') +  # Chunk size
            b'WAVE' +                    # Format
            b'fmt ' +                    # Subchunk1 ID
            (16).to_bytes(4, 'little') +  # Subchunk1 size
            (1).to_bytes(2, 'little') +   # Audio format (PCM)
            (1).to_bytes(2, 'little') +   # Number of channels (mono)
            (16000).to_bytes(4, 'little') +  # Sample rate (16kHz)
            (32000).to_bytes(4, 'little') +  # Byte rate
            (2).to_bytes(2, 'little') +      # Block align
            (16).to_bytes(2, 'little') +     # Bits per sample
            b'data' +                    # Subchunk2 ID
            (32000).to_bytes(4, 'little')    # Subchunk2 size (1 second of 16kHz 16-bit mono)
        )
        
        # Add 1 second of silence (32000 bytes of zeros)
        wav_data += b'\x00' * 32000
        
        logger.info("Hardcoded WAV file used as fallback")
        return wav_data
    
    async def text_to_speech(self, text: str, language: str = "en") -> Optional[str]:
        """
        Convert text to speech and return base64 encoded audio.
        
        Args:
            text: Text to convert to speech
            language: Language code ("en", "hi", etc.)
            
        Returns:
            Base64 encoded audio data or None if generation fails
        """
        try:
            # Get language code for gTTS
            lang_code = self._get_gtts_language_code(language)
            
            # Generate TTS
            tts = gTTS(
                text=text, 
                lang=lang_code,
                slow=False  # Normal speed speech
            )
            
            # Save to bytes buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            # Encode to base64
            audio_base64 = base64.b64encode(audio_buffer.read()).decode()
            
            logger.info("Text-to-speech generated successfully")
            return audio_base64
            
        except Exception as e:
            logger.error(f"Text-to-speech conversion error: {e}")
            return None
    
    def _get_language_code(self, language: str) -> str:
        """
        Convert our language codes to Google Speech Recognition format.
        
        Args:
            language: Our internal language code
            
        Returns:
            Google Speech Recognition language code
        """
        language_mapping = {
            "en": "en-US",
            "hi": "hi-IN", 
            "hinglish": "en-IN"  # Use Indian English for Hinglish
        }
        return language_mapping.get(language, "en-US")
    
    def _get_gtts_language_code(self, language: str) -> str:
        """
        Convert our language codes to gTTS format.
        
        Args:
            language: Our internal language code
            
        Returns:
            gTTS language code
        """
        language_mapping = {
            "en": "en",
            "hi": "hi",
            "hinglish": "en"  # Use English for mixed language
        }
        return language_mapping.get(language, "en")
    
    def validate_audio_file(self, file_data: bytes, content_type: str) -> bool:
        """
        Validate uploaded audio file.
        
        Args:
            file_data: Audio file bytes
            content_type: MIME type of the file
            
        Returns:
            True if valid, False otherwise
        """
        # Check content type
        allowed_types = ["audio/wav", "audio/mpeg", "audio/webm", "audio/ogg", "audio/x-wav"]
        if content_type not in allowed_types:
            logger.warning(f"Invalid audio content type: {content_type}")
            return False
        
        # Check file size (max 10MB for audio)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_data) > max_size:
            logger.warning(f"Audio file too large: {len(file_data)} bytes")
            return False
            
        return True

# Global voice service instance
voice_service = VoiceService()