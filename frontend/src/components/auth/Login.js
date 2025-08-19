import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import useUserStore from '../../stores/userStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User,
  ArrowRight,
  CheckCircle,
  Globe,
  Phone,
  MessageCircle
} from 'lucide-react';

const Login = ({ onClose, onSwitchToSignup }) => {
  const { t, currentLanguage } = useLanguage();
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Login component props:', { onClose, onSwitchToSignup });
    console.log('Login component language context:', { currentLanguage, t: typeof t });
    console.log('Testing translation:', t('welcome_back'));
  }
  
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'mobile'
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  
  const { setUser, setLoading } = useUserStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setLoading(true);

    try {
      if (loginMethod === 'email') {
        // Email login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        setUser(user);
      } else {
        // Mobile login - for now, we'll use a placeholder
        // In a real implementation, you'd integrate with Firebase Phone Auth or a custom backend
        console.log('Mobile login attempted with:', mobile, otp);
        // For demo purposes, we'll simulate success
        setError(t('mobile_login_not_implemented') || 'Mobile login will be implemented soon');
        setIsLoading(false);
        setLoading(false);
        return;
      }
      
      // Show success state briefly before closing
      setIsSuccess(true);
      
      // Add a small delay to prevent the flash effect
      setTimeout(() => {
        if (onClose && typeof onClose === 'function') {
          onClose();
        } else {
          console.warn('onClose prop is not available');
        }
      }, 1000);
      
    } catch (error) {
      console.error('Authentication error:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!mobile || mobile.length < 10) {
      setError(t('please_enter_valid_mobile') || 'Please enter a valid mobile number');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // In a real implementation, you'd call your backend to send OTP
      console.log('Sending OTP to:', mobile);
      // Simulate OTP sending
      setTimeout(() => {
        setOtpSent(true);
        setIsLoading(false);
        setError(t('otp_sent_successfully') || 'OTP sent successfully!');
      }, 2000);
    } catch (error) {
      setError(t('failed_to_send_otp') || 'Failed to send OTP. Please try again.');
      setIsLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return t('no_account_found');
      case 'auth/wrong-password':
        return t('incorrect_password');
      case 'auth/email-already-in-use':
        return t('email_already_exists');
      case 'auth/weak-password':
        return t('weak_password');
      case 'auth/invalid-email':
        return t('invalid_email');
      default:
        return t('auth_failed');
    }
  };

  const handleSwitchToSignup = () => {
    if (onSwitchToSignup && typeof onSwitchToSignup === 'function') {
      onSwitchToSignup();
    } else {
      console.error('onSwitchToSignup prop is missing or not a function:', onSwitchToSignup);
    }
  };

  const resetForm = () => {
    setEmail('');
    setMobile('');
    setPassword('');
    setOtp('');
    setOtpSent(false);
    setError('');
  };

  const handleMethodChange = (method) => {
    setLoginMethod(method);
    resetForm();
  };

  // Validate required props
  if (!onClose || !onSwitchToSignup) {
    console.error('Login component missing required props:', { onClose, onSwitchToSignup });
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 text-center text-red-600">
          <h2 className="text-xl font-bold mb-2">{t('configuration_error')}</h2>
          <p>{t('login_not_configured')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full flex flex-col"
      >
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t('welcome_back') || 'Welcome Back'}</h2>
              <p className="text-blue-100">{t('sign_in_account') || 'Sign in to your account'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Login Method Tabs */}
        <div className="px-6 pt-4">
          <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => handleMethodChange('email')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                loginMethod === 'email' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{t('email_login') || 'Email'}</span>
              </div>
            </button>
            <button
              onClick={() => handleMethodChange('mobile')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                loginMethod === 'mobile' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{t('mobile_login') || 'Mobile'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Form Content - No Scroll */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {loginMethod === 'email' ? (
                // Email Login Form
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('email_address') || 'Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder={t('enter_email') || 'Enter your email'}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('password') || 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder={t('enter_password') || 'Enter your password'}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // Mobile Login Form
                <motion.div
                  key="mobile"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Mobile Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('mobile_number') || 'Mobile Number'}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder={t('enter_mobile_number') || 'Enter your mobile number'}
                        maxLength="10"
                        required
                      />
                    </div>
                  </div>

                  {/* OTP Section */}
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isLoading || !mobile || mobile.length < 10}
                      className={`w-full py-3 font-semibold rounded-xl transition-all duration-300 ${
                        !mobile || mobile.length < 10
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t('sending_otp') || 'Sending OTP...'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          <span>{t('send_otp') || 'Send OTP'}</span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('enter_otp') || 'Enter OTP'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          placeholder={t('enter_6_digit_otp') || 'Enter 6-digit OTP'}
                          maxLength="6"
                          required
                        />
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          {t('otp_sent_to') || 'OTP sent to'} +91 {mobile}
                        </span>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {t('resend_otp') || 'Resend'}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Success Message */}
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{t('login_successful') || 'Login successful! Redirecting...'}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            {loginMethod === 'email' || (loginMethod === 'mobile' && otpSent) ? (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                type="submit"
                disabled={isLoading || isSuccess}
                className={`w-full py-3 font-semibold rounded-xl shadow-lg transition-all duration-300 ${
                  isSuccess 
                    ? 'bg-green-500 text-white cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:shadow-xl'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">{t('signing_in') || 'Signing in...'}</span>
                  </motion.div>
                ) : isSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">{t('success') || 'Success!'}</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">{t('sign_in') || 'Sign In'}</span>
                  </motion.div>
                )}
              </motion.button>
            ) : null}
          </form>

          {/* Switch Mode */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-gray-600">
              {t('dont_have_account') || "Don't have an account?"}{' '}
              <button
                onClick={handleSwitchToSignup}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {t('sign_up_here') || 'Sign up here'}
              </button>
            </p>
          </motion.div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Globe className="w-4 h-4" />
              <span>{t('ai_farming_companion') || 'AI Farming Companion'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
