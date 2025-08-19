import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Wrapper component to provide language context
const ErrorBoundaryContent = ({ hasError, error, errorInfo, onRefresh, onTryAgain }) => {
  const { t } = useLanguage();
  
  if (!hasError) return null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          {t('something_went_wrong')}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {t('error_message')}
        </p>
        
        <div className="space-y-3">
          <button
            onClick={onRefresh}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-semibold"
          >
            {t('refresh_page')}
          </button>
          
          <button
            onClick={onTryAgain}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300"
          >
            {t('try_again')}
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
              {t('error_details_dev')}
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded-lg text-xs font-mono text-gray-700 overflow-auto max-h-32">
              <div className="mb-2">
                <strong>Error:</strong> {error.toString()}
              </div>
              <div>
                <strong>Stack:</strong> {errorInfo.componentStack}
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console for debugging
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    return (
      <>
        <ErrorBoundaryContent
          hasError={this.state.hasError}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRefresh={() => window.location.reload()}
          onTryAgain={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
        {this.props.children}
      </>
    );
  }
}

export default ErrorBoundary;
