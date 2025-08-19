# Krishi Bandhu - AI-Powered Agricultural Assistant

A comprehensive AI-powered farming assistant that provides intelligent agricultural advice through text, image, and voice interactions. Built with FastAPI backend and React frontend.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.8+** (Recommended: Python 3.9 or 3.10)
- **Node.js 16+** and npm
- **Git** for version control
- **Chrome/Chromium** (for Playwright web scraping)
- **FFmpeg** (for audio processing)

### System Requirements
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: At least 2GB free space (for ML models and vector database)
- **OS**: Windows 10+, macOS 10.15+, or Ubuntu 18.04+
- **GPU**: Optional but recommended for faster ML model inference



## 🏗️ Project Structure

```
krishi_bandhu_hackathon/
├── backend/                                    # FastAPI Backend
│   ├── agents/                                 # AI Agent System
│   │   ├── real_orchestrator.py                # Main agent coordinator & router
│   │   ├── real_weather_agent.py               # Weather advisory & forecasts
│   │   ├── real_pest_agent.py                  # Plant disease detection
│   │   ├── real_market_agent.py                # Market price analysis
│   │   ├── real_general_agent.py               # General farming advice
│   │   ├── real_finance_agent.py               # Financial & policy guidance
│   │   ├── market_tools/                       # Market data tools
│   │   │   ├── __init__.py
│   │   │   ├── base_tool.py                    # Base tool class
│   │   │   ├── tier1_direct_scrape.py          # Direct web scraping
│   │   │   ├── tier2_gpt_location_search.py    # Location-based search
│   │   │   └── tier3_gpt_global_search.py      # Global market search
│   │   └── schemes_and_policies/               # Policy documents
│   │       ├── kcc_interest_subvention_2025.txt
│   │       ├── pmfby_general_features_wikipedia.txt
│   │       ├── pmfby_operational_guidelines.txt
│   │       ├── pmfby_policy_features.txt
│   │       ├── pmkisan_operational_guidelines.txt
│   │       ├── pmkusum_component_b_guidelines.txt
│   │       ├── pmkusum_component_c_ips.txt
│   │       └── pmkusum_feeder_level_FLS.txt
│   ├── services/                               # Core Services
│   │   ├── llm_service.py                      # AI model integration
│   │   ├── voice_service.py                    # Speech-to-text processing
│   │   ├── tts_service.py                      # Text-to-speech conversion
│   │   └── firebase_service.py                 # Firebase operations
│   ├── config/                                 # Configuration
│   │   └── azure_config.yaml                   # Azure OpenAI configuration
│   ├── models/                                 # Data Models
│   │   └── state.py                            # State management models
│   ├── static/                                 # Static Files
│   │   └── audio/                              # Generated audio responses
│   ├── chroma_db/                              # Vector Database
│   │   ├── chroma.sqlite3                      # SQLite database
│   │   └── [uuid]/                             # Vector embeddings
│   ├── myenv/                                  # Python virtual environment
│   ├── main.py                                 # FastAPI application entry point
│   ├── config.py                               # Configuration management
│   ├── requirements.txt                        # Python dependencies
│   ├── .env                                    # Environment variables
│   └── krishi-firestore-service-account.json   # firestore service account
├── frontend/                                   # React Frontend
│   ├── src/
│   │   ├── components/                         # React Components
│   │   │   ├── auth/                           # Authentication
│   │   │   │   ├── Login.js                    # Login component
│   │   │   │   └── EnhancedSignup.js           # Enhanced signup form
│   │   │   ├── chat/                           # Chat Components
│   │   │   │   └── ChatHistory.js              # Chat history display
│   │   │   ├── layout/                         # Layout Components
│   │   │   │   ├── Header.js                   # Application header
│   │   │   │   └── Sidebar.js                  # Navigation sidebar
│   │   │   ├── profile/                        # Profile Components
│   │   │   │   └── UserProfile.js              # User profile management
│   │   │   ├── ChatInterface.js                # Main chat interface
│   │   │   ├── QuerySubmissionInterface.js     # Query input handling
│   │   │   ├── SaveResponseModal.js            # Response saving modal
│   │   │   ├── SavedResponses.js               # Saved responses display
│   │   │   ├── WelcomeGuide.js                 # Welcome guide component
│   │   │   ├── WelcomeScreen.js                # Welcome screen
│   │   │   └── ErrorBoundary.js                # Error handling
│   │   ├── stores/                             # State Management (Zustand)
│   │   │   ├── chatStore.js                    # Chat state management
│   │   │   ├── userStore.js                    # User state management
│   │   │   └── savedResponsesStore.js          # Saved responses state
│   │   ├── contexts/                           # React Contexts
│   │   │   ├── DarkModeContext.js              # Dark mode theme
│   │   │   └── LanguageContext.js              # Multi-language support
│   │   ├── services/                           # API Services
│   │   │   └── api.js                          # Backend API integration
│   │   ├── config/                             # Configuration
│   │   │   └── firebase.js                     # Firebase configuration
│   │   ├── App.js                              # Main application component
│   │   ├── App.css                             # Application styles
│   │   ├── index.js                            # Application entry point
│   │   └── index.css                           # Global styles
│   ├── public/                                 # Static Assets
│   │   ├── index.html                          # HTML template
│   │   └── logo.png                            # Application logo
│   ├── build/                                  # Production build (generated)
│   ├── node_modules/                           # Node.js dependencies
│   ├── package.json                            # Node.js dependencies & scripts
│   ├── package-lock.json                       # Dependency lock file
│   ├── tailwind.config.js                      # Tailwind CSS configuration
│   └── postcss.config.js                       # PostCSS configuration
├── images/                                     # Test Images
│   ├── test1.jpg                               # Test image 1
│   └── test2.JPG                               # Test image 2
└── README.md                                   # Project documentation
```


## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd krishi_bandhu_hackathon
```

### 2. Backend Setup
#### 2.1 Create Python Virtual Environment
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv myenv

# Activate virtual environment
# On Windows:
myenv\Scripts\activate
# On macOS/Linux:
source myenv/bin/activate
```

#### 2.2 Install Python Dependencies
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

#### 2.3 Environment Configuration
Create a `.env` file in the `backend` directory:

```bash
# Copy the template
cp .env.sample .env
```

Edit the `.env` file with your actual API keys:

```env
# Azure OpenAI Configuration (Required for LLM features)
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_EMBEDDING_MODEL=text-embedding-3-small

# External APIs
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Server Configuration
DEBUG=true

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=krishi-firestore-service-account.json
```

#### 2.4 Firebase Service Account Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Go to Project Settings > Service Accounts
3. Generate a new private key
4. Download the JSON file and save it as `krishi-firestore-service-account.json` in the `backend` directory

#### 2.5 Install Additional Dependencies
```bash
# Install Playwright browsers (required for web scraping)
playwright install

# Install system dependencies for audio processing
# On Ubuntu/Debian:
sudo apt-get update
sudo apt-get install -y ffmpeg portaudio19-dev python3-pyaudio

# On macOS:
brew install ffmpeg portaudio

# On Windows:
# Download and install FFmpeg from https://ffmpeg.org/download.html
```

#### 2.6 Run the Backend
```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend API will be available at `http://127.0.0.1:8000`

### 3. Frontend Setup
#### 3.1 Install Node.js Dependencies
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install
```

#### 3.2 Configure Firebase (Optional for Development)
For development, the frontend uses mock authentication. For production:

1. Update `src/config/firebase.js` with your Firebase project details
2. Comment out the mock configuration
3. Uncomment the real Firebase initialization

#### 3.3 Run the Frontend
```bash
# Start development server
npm start
```
The frontend will be available at `http://localhost:3000`






## 🔧 Detailed Setup Instructions

### Backend Dependencies Breakdown

The backend uses the following key packages:

- **FastAPI**: Web framework for building APIs
- **Uvicorn**: ASGI server for running FastAPI
- **OpenAI/LangChain**: AI model integration
- **Transformers/Torch**: Machine learning models for pest detection
- **Firebase Admin**: User authentication and data storage
- **Playwright**: Web scraping for market prices
- **ChromaDB**: Vector database for document storage
- **SpeechRecognition/gTTS**: Voice processing
- **Pandas/NumPy**: Data processing
- **BeautifulSoup4**: Web scraping
- **PyYAML**: Configuration management
- **Pydantic**: Data validation

### Frontend Dependencies Breakdown

The frontend uses the following key packages:

- **React 18**: UI framework
- **React Router**: Navigation
- **Zustand**: State management
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **Axios**: HTTP client
- **Firebase**: Authentication and storage
- **React Dropzone**: File upload handling
- **React Hot Toast**: Notifications
- **Lucide React**: Icons
- **Headless UI**: Accessible UI components

### API Keys Setup

#### 1. Azure OpenAI

1. Create an Azure account at [Azure Portal](https://portal.azure.com/)
2. Create an Azure OpenAI resource
3. Deploy a GPT-4 model
4. Get your API key and endpoint from the Azure OpenAI resource

#### 2. OpenWeather API

1. Sign up at [OpenWeather](https://openweathermap.org/api)
2. Get your API key from your account dashboard

#### 3. Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and Firestore
3. Generate service account key
4. Download and save as `krishi-firestore-service-account.json`


## 🚀 Running the Application

### Development Mode

1. **Start Backend**:
   ```bash
   cd backend
   source myenv/bin/activate  # or myenv\Scripts\activate on Windows
   python main.py
   ```
   **1st run will take a bit longer time as it downloads 3 models from Hugging Face used in the pest agent:** `prithivMLmods/Rice-Leaf-Disease`, `wambugu71/crop_leaf_diseases_vit`, and `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`.
   and 
   vector embeddings are created for the .txt files under chroma_db dir

2. **Start Frontend** (in a new terminal):
   ```bash
   cd frontend
   npm start
   ```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://127.0.0.1:8000
   - API Documentation: http://127.0.0.1:8000/docs

### Production Mode

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Run Backend with Production Settings**:
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

## 🧪 Testing the Application

### Backend Testing

1. **Health Check**:
   ```bash
   curl http://127.0.0.1:8000/health
   ```

2. **Text Query**:
   ```bash
   curl -X POST "http://127.0.0.1:8000/query/text" \
        -H "Content-Type: application/json" \
        -d '{"query": "How to grow tomatoes?", "language": "en"}'
   ```

3. **Image Upload Test**:
   ```bash
   curl -X POST "http://127.0.0.1:8000/query/image" \
        -F "file=@images/test1.jpg" \
        -F "query=What disease does this plant have?"
   ```

4. **Voice Query Test**:
   ```bash
   curl -X POST "http://127.0.0.1:8000/query/voice" \
        -F "file=@path/to/audio.wav" \
        -F "language=en"
   ```

5. **API Documentation**:
   Visit http://127.0.0.1:8000/docs for interactive API testing

### Frontend Testing

1. **Mock User**: The app starts with a mock user for testing
2. **Chat Interface**: Test text queries about farming
3. **Image Upload**: Upload plant photos for disease detection
4. **Voice Recording**: Test voice queries (requires microphone permission)
5. **Navigation**: Test all sidebar navigation options
6. **Multi-language**: Test English, Hindi, and Hinglish responses
7. **Dark Mode**: Toggle between light and dark themes
8. **Chat History**: Verify conversation persistence
9. **User Profile**: Test profile management features

## 🔍 Troubleshooting

### Common Issues

#### Backend Issues

1. **Import Errors**:
   ```bash
   # Reinstall dependencies
   pip install -r requirements.txt --force-reinstall
   ```

2. **Audio Processing Errors**:
   ```bash
   # Install system audio dependencies
   # Ubuntu/Debian:
   sudo apt-get install portaudio19-dev python3-pyaudio
   # macOS:
   brew install portaudio
   ```

3. **Playwright Issues**:
   ```bash
   # Reinstall browsers
   playwright install
   ```

4. **ChromaDB Issues**:
   ```bash
   # Clear database
   rm -rf chroma_db/
   ```

#### Frontend Issues

1. **Node Modules Issues**:
   ```bash
   # Clear and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Port Already in Use**:
   ```bash
   # Kill process on port 3000
   npx kill-port 3000
   ```

3. **Build Errors**:
   ```bash
   # Clear cache
   npm run build -- --reset-cache
   ```

### Environment Variables Issues

1. **Missing API Keys**: Ensure all required API keys are set in `.env`
2. **Invalid Endpoints**: Verify Azure OpenAI endpoint format
3. **Firebase Path**: Ensure `krishi-firestore-service-account.json` exists

### Performance Issues

1. **Slow Responses**: Check API key limits and quotas
2. **Memory Issues**: Reduce number of workers or increase system RAM
3. **Audio Processing**: Ensure FFmpeg is properly installed

## 📚 API Documentation

### Key Endpoints

- `GET /health` - Health check
- `POST /query/text` - Process text queries
- `POST /query/image` - Process image queries (plant disease detection)
- `POST /query/voice` - Process voice queries
- `GET /chat/history/{user_id}` - Get chat history
- `PUT /profile/{user_id}` - Update user profile
- `GET /static/audio/{filename}` - Serve generated audio files
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation

### Request/Response Format

All endpoints return a consistent format:

```json
{
  "success": true,
  "message": "Query processed successfully",
  "data": {
    "response": "AI response content",
    "audio_url": "optional_audio_file_url",
    "metadata": {}
  },
  "error": null
}
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **API Keys**: Rotate API keys regularly
3. **CORS**: Configure CORS properly for production
4. **File Uploads**: Validate file types and sizes
5. **Authentication**: Implement proper user authentication
6. **Rate Limiting**: Implement API rate limiting for production
7. **Input Validation**: Validate all user inputs
8. **HTTPS**: Use HTTPS in production environments

## 🚀 Future Deployment Plans

### Backend Deployment

1. **Docker** (Recommended):
   ```dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. **Cloud Platforms**:
   - **Azure**: Use Azure App Service
   - **AWS**: Use AWS Lambda or EC2
   - **Google Cloud**: Use Cloud Run

### Frontend Deployment

1. **Build for Production**:
   ```bash
   npm run build
   ```

2. **Deploy to**:
   - **Vercel**: Connect GitHub repository
   - **Netlify**: Drag and drop build folder
   - **AWS S3**: Upload build files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## 🆘 Support

For support and questions:

Contact: Aditya Tewari: tewariadi123@gmail.com

## 🎯 Next Steps

After successful setup:

1. **Test all features** thoroughly
2. **Configure production environment** variables
3. **Set up monitoring** and logging
4. **Implement user authentication** if needed
5. **Add more agricultural knowledge** to the system
6. **Optimize performance** based on usage patterns
7. **Add more ML models** for different crop types
8. **Expand market data sources** for better price analysis
9. **Implement caching** for faster responses
10. **Add analytics** to track user interactions

---

**Happy Farming! 🌱**

This comprehensive setup guide should help you reproduce the entire Krishi Bandhu codebase from scratch. If you encounter any issues, refer to the troubleshooting section or check the individual README files in the backend and frontend directories for more specific information.
