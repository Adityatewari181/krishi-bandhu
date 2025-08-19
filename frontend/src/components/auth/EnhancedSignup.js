import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Leaf, 
  Settings, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle,
  Globe,
  Phone,
  Calendar,
  Ruler,
  Bell,
  Eye,
  EyeOff,
  Shield,
  Home,
  Banknote,
  Zap,
  AlertTriangle,
  Languages,
  MessageCircle
} from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import useUserStore from '../../stores/userStore';
import { useLanguage } from '../../contexts/LanguageContext';

const EnhancedSignup = ({ onClose, onSwitchToLogin }) => {
  const { t } = useLanguage();
  
  // Custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f0f9ff;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #22c55e, #16a34a);
        border-radius: 4px;
        border: 1px solid #15803d;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #16a34a, #15803d);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:active {
        background: linear-gradient(180deg, #15803d, #166534);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form data state - Comprehensive farmer profile
  const [formData, setFormData] = useState({
    // Step 1: Account Setup
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Personal Details
    firstName: '',
    lastName: '',
    phone: '',
    preferredLanguage: 'en',
    
    // Step 3: Location Details
    state: '',
    district: '',
    village: '',
    pinCode: '',
    gpsCoordinates: { lat: '', lng: '' },
    
    // Step 4: Landholding Details
    landSizeHa: '',
    ownershipType: '',
    landRecordVerified: false,
    
    // Step 5: Banking Information
    bankName: '',
    hasKcc: false,
    aadhaarLinkedBank: false,
    
    // Step 6: Agriculture Details
    currentCrops: [],
    season: '',
    hasSolarPump: false,
    pumpCapacityHp: '',
    gridConnectedPump: false,
    
    // Step 7: Financial Details
    annualIncome: '',
    repaymentHistoryGood: false,
    desiredLoanAmount: '',
    loanPurpose: '',
    
    // Step 8: PM-KISAN Exclusion Flags
    familyPaysIncomeTax: false,
    familyGovtEmployee: false,
    familyConstitutionalPost: false,
    familyProfessional: false,
    
    // Step 9: Preferences
    notifications: true,
    communicationPreference: 'both'
  });

  const { setUser } = useUserStore();

  const steps = [
    { id: 1, title: t('account_setup'), icon: Shield, description: t('create_account') },
    { id: 2, title: t('personal_details'), icon: User, description: t('tell_about_yourself') },
    { id: 3, title: t('location'), icon: MapPin, description: t('where_do_you_farm') },
    { id: 4, title: t('landholding'), icon: Home, description: t('your_land_details') },
    { id: 5, title: t('banking_info'), icon: Banknote, description: t('basic_banking_info') },
    { id: 6, title: t('agriculture'), icon: Leaf, description: t('your_farming_activities') },
    { id: 7, title: t('financial'), icon: Settings, description: t('income_loan_details') },
    { id: 8, title: t('eligibility'), icon: AlertTriangle, description: t('scheme_eligibility_check') },
    { id: 9, title: t('preferences'), icon: Languages, description: t('customize_experience') }
  ];

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const cropTypes = [
    'Paddy (Rice)', 'Wheat', 'Apple', 'Bell Pepper', 'Cherry', 'Corn', 'Maize', 
    'Grape', 'Peach', 'Potato', 'Strawberry', 'Tomato', 'Pepper', 'Cotton', 'Sugarcane'
  ];

  const ownershipTypes = [
    { value: 'owner', label: 'Owner' },
    { value: 'tenant', label: 'Tenant' },
    { value: 'sharecropper', label: 'Sharecropper' }
  ];

  const seasons = [
    { value: 'kharif', label: 'Kharif' },
    { value: 'rabi', label: 'Rabi' },
    { value: 'zaid', label: 'Zaid' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'hinglish', label: 'Hinglish' }
  ];

  const loanPurposes = [
    { value: 'crop_input', label: 'Crop Input' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'irrigation', label: 'Irrigation' },
    { value: 'land_development', label: 'Land Development' },
    { value: 'storage', label: 'Storage' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCropToggle = (crop) => {
    setFormData(prev => ({
      ...prev,
      currentCrops: prev.currentCrops.includes(crop)
        ? prev.currentCrops.filter(c => c !== crop)
        : [...prev.currentCrops, crop]
    }));
  };



  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          return 'Please fill all required fields';
        }
        if (formData.password !== formData.confirmPassword) {
          return 'Passwords do not match';
        }
        if (formData.password.length < 6) {
          return 'Password must be at least 6 characters long';
        }
        break;
      case 2:
        if (!formData.firstName || !formData.lastName || !formData.phone || !formData.preferredLanguage) {
          return 'Please fill all required fields';
        }
        if (formData.phone.length < 10) {
          return 'Please enter a valid phone number';
        }
        break;
      case 3:
        if (!formData.state || !formData.district || !formData.village || !formData.pinCode) {
          return 'Please fill all location fields';
        }
        if (formData.pinCode.length !== 6) {
          return 'Please enter a valid 6-digit pin code';
        }
        break;
      case 4:
        if (!formData.landSizeHa) {
          return 'Please enter land size in hectares';
        }
        if (!formData.ownershipType) {
          return 'Please select ownership type';
        }
        break;
      case 5:
        if (!formData.bankName) {
          return 'Please enter bank name';
        }
        break;
      case 6:
        if (formData.currentCrops.length === 0) {
          return 'Please select at least one crop';
        }
        if (!formData.season) {
          return 'Please select current season';
        }
        break;
      case 7:
        if (!formData.annualIncome) {
          return 'Please enter annual income';
        }
        break;
      case 8:
        // Exclusion flags are required for PM-KISAN eligibility
        break;
      case 9:
        // Preferences are optional, no validation needed
        break;
    }
    return null;
  };

  const nextStep = () => {
    console.log('🔍 Attempting to go to next step:', currentStep);
    console.log('🔍 Current form data:', formData);
    
    const validationError = validateStep(currentStep);
    if (validationError) {
      console.log('❌ Validation failed:', validationError);
      setError(validationError);
      return;
    }
    
    console.log('✅ Validation passed, moving to next step');
    setError('');
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      // Scroll to top of form content
      const formContent = document.querySelector('.form-content-scroll');
      if (formContent) {
        formContent.scrollTop = 0;
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
      // Scroll to top of form content
      const formContent = document.querySelector('.form-content-scroll');
      if (formContent) {
        formContent.scrollTop = 0;
      }
    }
  };

  const handleSubmit = async () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

          try {
        // Create Firebase user
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );

        // Create comprehensive farmer profile
        const userData = {
          uid: userCredential.user.uid,
          email: formData.email,
          name: `${formData.firstName} ${formData.lastName}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          preferredLanguage: formData.preferredLanguage,
          location: {
            state: formData.state,
            district: formData.district,
            village: formData.village,
            pinCode: formData.pinCode,
            gpsCoordinates: formData.gpsCoordinates
          },
          landholdingDetails: {
            landSizeHa: parseFloat(formData.landSizeHa),
            ownershipType: formData.ownershipType,
            landRecordVerified: formData.landRecordVerified
          },
          bankingInfo: {
            bankName: formData.bankName,
            hasKcc: formData.hasKcc,
            aadhaarLinkedBank: formData.aadhaarLinkedBank
          },
          agricultureSpecific: {
            currentCrops: formData.currentCrops,
            season: formData.season,
            hasSolarPump: formData.hasSolarPump,
            pumpCapacityHp: parseFloat(formData.pumpCapacityHp) || 0,
            gridConnectedPump: formData.gridConnectedPump
          },
          incomeRepayment: {
            annualIncome: parseFloat(formData.annualIncome),
            repaymentHistoryGood: formData.repaymentHistoryGood,
            desiredLoanAmount: parseFloat(formData.desiredLoanAmount),
            loanPurpose: formData.loanPurpose
          },
          exclusionFlags: {
            familyPaysIncomeTax: formData.familyPaysIncomeTax,
            familyGovtEmployee: formData.familyGovtEmployee,
            familyConstitutionalPost: formData.familyConstitutionalPost,
            familyProfessional: formData.familyProfessional
          },
          preferences: {
            notifications: formData.notifications,
            communicationPreference: formData.communicationPreference,
            darkMode: false
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        };

        // Save to Firestore first
        await setDoc(doc(db, 'users', userCredential.user.uid), userData);

        // Set user in store (this will also update the store)
        setUser(userData);
        
        // Close signup modal
        onClose();
        
      } catch (error) {
        console.error('Signup error:', error);
        
        // Handle specific Firebase auth errors
        let userFriendlyError = t('failed_create_account');
        
        if (error.code === 'auth/email-already-in-use') {
          userFriendlyError = t('email_already_registered');
          // Add a helpful suggestion to switch to login
          setTimeout(() => {
            if (window.confirm(t('email_already_registered_switch_login'))) {
              onSwitchToLogin();
            }
          }, 2000);
        } else if (error.code === 'auth/weak-password') {
          userFriendlyError = t('password_too_weak');
        } else if (error.code === 'auth/invalid-email') {
          userFriendlyError = t('please_enter_valid_email');
        } else if (error.code === 'auth/operation-not-allowed') {
          userFriendlyError = t('email_password_not_enabled');
        } else if (error.code === 'auth/too-many-requests') {
          userFriendlyError = t('too_many_failed_attempts');
        }
        
        setError(userFriendlyError);
      } finally {
        setIsLoading(false);
      }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Create Your Account</h3>
              <p className="text-gray-600 text-sm">Secure your access to Krishi Bandhu</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                                      placeholder={t('enter_email')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters required</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Personal Details</h3>
              <p className="text-gray-600 text-sm">Tell us about yourself for personalized assistance</p>
            </div>

            <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                    placeholder={t('enter_first_name')}
                />
              </div>
              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                    placeholder={t('enter_last_name')}
                />
              </div>
            </div>
            
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                                      placeholder={t('enter_phone_number')}
                  />
                                  <p className="text-xs text-gray-500 mt-1">{t('for_sms_otp_notifications')}</p>
              </div>

                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Preferred Language <span className="text-red-500">*</span>
                  </label>
                  <select
                  value={formData.preferredLanguage}
                  onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                  <option value="">Select your preferred language</option>
                  {languages.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                                  <p className="text-xs text-gray-500 mt-1">{t('for_personalized_responses')}</p>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Location Details</h3>
              <p className="text-gray-600 text-sm">Where do you farm? This helps us provide location-specific assistance</p>
            </div>

            <div className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
              </label>
                <select
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                                      <option value="">{t('select_your_state')}</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
            </div>
            
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                                      placeholder={t('enter_your_district')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Village <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                                      placeholder={t('enter_your_village')}
                />
            </div>
            
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Pin Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.pinCode}
                  onChange={(e) => handleInputChange('pinCode', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  placeholder="Enter 6-digit pin code"
                  maxLength="6"
                />
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Home className="w-6 h-6 text-green-600" />
              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('landholding_details')}</h3>
                              <p className="text-gray-600 text-sm">{t('land_info_for_schemes')}</p>
            </div>
            
            <div className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('land_size_hectares')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.landSizeHa}
                  onChange={(e) => handleInputChange('landSizeHa', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  placeholder="0.0"
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Needed for KCC caps, PMFBY, and subsidy eligibility</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('ownership_type')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.ownershipType}
                  onChange={(e) => handleInputChange('ownershipType', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                  <option value="">{t('select_ownership_type')}</option>
                  {ownershipTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">PM-KISAN requires landholder status</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('land_record_verified')}
                </label>
                <select
                  value={formData.landRecordVerified ? 'yes' : 'no'}
                  onChange={(e) => handleInputChange('landRecordVerified', e.target.value === 'yes')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Aligns with PM-KISAN requirement</p>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Banknote className="w-6 h-6 text-green-600" />
              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('banking_information')}</h3>
                              <p className="text-gray-600 text-sm">{t('basic_banking_info_for_schemes')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('bank_name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  placeholder={t('enter_bank_name')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('has_kisan_credit_card')}
                  </label>
                  <select
                    value={formData.hasKcc ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('hasKcc', e.target.value === 'yes')}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('aadhaar_linked_bank')}
                  </label>
                  <select
                    value={formData.aadhaarLinkedBank ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('aadhaarLinkedBank', e.target.value === 'yes')}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                <div>
                    <h4 className="text-sm font-semibold text-blue-800 mb-1">{t('required_for_pm_kisan')}</h4>
                                          <p className="text-sm text-blue-700">{t('aadhaar_linked_bank_description')}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('agriculture_specific')}</h3>
                              <p className="text-gray-600 text-sm">{t('your_farming_activities')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('current_crops')} <span className="text-red-500">*</span>
                  </label>
                                  <p className="text-xs text-gray-500 mb-2">{t('select_all_crops_growing')}</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white custom-scrollbar">
                  {cropTypes.map(crop => (
                    <label key={crop} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                        type="checkbox"
                        checked={formData.currentCrops.includes(crop)}
                        onChange={() => handleCropToggle(crop)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{crop}</span>
                    </label>
                  ))}
                </div>
                {formData.currentCrops.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Selected: {formData.currentCrops.join(', ')}</p>
                  </div>
                )}
                </div>
                
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('current_season')} <span className="text-red-500">*</span>
                  </label>
                  <select
                  value={formData.season}
                  onChange={(e) => handleInputChange('season', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                                      <option value="">{t('select_current_season')}</option>
                  {seasons.map(season => (
                    <option key={season.value} value={season.value}>{season.label}</option>
                  ))}
                  </select>
                                  <p className="text-xs text-gray-500 mt-1">{t('pmfby_premiums_differ')}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('has_solar_pump')}
                  </label>
                  <select
                    value={formData.hasSolarPump ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('hasSolarPump', e.target.value === 'yes')}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('pump_capacity_hp')}
                  </label>
                  <input
                    type="number"
                    value={formData.pumpCapacityHp}
                    onChange={(e) => handleInputChange('pumpCapacityHp', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                    placeholder="0.0"
                    step="0.1"
                    min="0"
                  />
                </div>
                </div>
                
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('grid_connected_pump')}
                  </label>
                  <select
                  value={formData.gridConnectedPump ? 'yes' : 'no'}
                  onChange={(e) => handleInputChange('gridConnectedPump', e.target.value === 'yes')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  </select>
                                  <p className="text-xs text-gray-500 mt-1">{t('for_pm_kusum_cfa')}</p>
              </div>
            </div>
          </motion.div>
        );

      case 7:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('income_repayment')}</h3>
                              <p className="text-gray-600 text-sm">{t('income_repayment_details')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('annual_income')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.annualIncome}
                  onChange={(e) => handleInputChange('annualIncome', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                                      placeholder={t('enter_annual_income')}
                  step="1000"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">To check PM-KISAN exclusion threshold</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('repayment_history_good')}
                </label>
                <select
                  value={formData.repaymentHistoryGood ? 'yes' : 'no'}
                  onChange={(e) => handleInputChange('repaymentHistoryGood', e.target.value === 'yes')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">For PRI eligibility under KCC</p>
              </div>
              
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('desired_loan_amount')} <span className="text-blue-500 text-xs">({t('optional')})</span>
                  </label>
                  <input
                    type="number"
                  value={formData.desiredLoanAmount}
                  onChange={(e) => handleInputChange('desiredLoanAmount', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                                      placeholder={t('enter_desired_loan_amount')}
                  step="1000"
                    min="0"
                  />
                                  <p className="text-xs text-blue-600 mt-1">💡 {t('loan_purpose_help')}</p>
                </div>
                
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('loan_purpose')} <span className="text-blue-500 text-xs">({t('optional')})</span>
                  </label>
                  <select
                  value={formData.loanPurpose}
                  onChange={(e) => handleInputChange('loanPurpose', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                                      <option value="">{t('select_loan_purpose_optional')}</option>
                  {loanPurposes.map(purpose => (
                    <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
                  ))}
                  </select>
                                  <p className="text-xs text-blue-600 mt-1">💡 {t('loan_purpose_help_2')}</p>
              </div>
            </div>
          </motion.div>
        );

      case 8:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-green-600" />
              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('eligibility')}</h3>
                              <p className="text-gray-600 text-sm">{t('scheme_eligibility_check')}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <div>
                                      <h4 className="text-sm font-semibold text-yellow-800 mb-1">{t('important_note')}</h4>
                                      <p className="text-sm text-yellow-700">{t('eligibility_questions')}</p>
                  </div>
                </div>
              </div>
              
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('family_pays_income_tax')}
                  </label>
                  <select
                    value={formData.familyPaysIncomeTax ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('familyPaysIncomeTax', e.target.value === 'yes')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  </select>
                </div>
                
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('family_govt_employee')}
                  </label>
                  <select
                    value={formData.familyGovtEmployee ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('familyGovtEmployee', e.target.value === 'yes')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  </select>
              </div>
              
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('family_constitutional_post')}
                  </label>
                  <select
                    value={formData.familyConstitutionalPost ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('familyConstitutionalPost', e.target.value === 'yes')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  </select>
                </div>
                
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('family_professional')}
                  </label>
                  <select
                    value={formData.familyProfessional ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('familyProfessional', e.target.value === 'yes')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  </select>
              </div>
            </div>
          </motion.div>
        );

      case 9:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Languages className="w-6 h-6 text-green-600" />
              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('preferences')}</h3>
                              <p className="text-gray-600 text-sm">{t('customize_experience')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('communication_preference')}
              </label>
              <select
                  value={formData.communicationPreference}
                  onChange={(e) => handleInputChange('communicationPreference', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                >
                  <option value="both">Both Text & Audio</option>
                  <option value="text">Text Only</option>
                  <option value="audio">Audio Only</option>
              </select>
            </div>
            
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications}
                    onChange={(e) => handleInputChange('notifications', e.target.checked)}
                      className="w-4 h-4 text-green-600 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  />
                    <span className="ml-3 text-sm text-gray-700">{t('receive_notifications')}</span>
              </div>
                  </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-green-800 mb-1">Almost Done!</h4>
                    <p className="text-sm text-green-700">Your comprehensive farmer profile will be created and you'll have access to all Krishi Bandhu features.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col"
        style={{ height: '90vh', maxHeight: '800px' }}
      >
        {/* Modern Green Header */}
        <div className="bg-gradient-to-br from-green-600 via-green-500 to-green-700 p-4 text-white flex-shrink-0 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">Create Your Account</h2>
              <p className="text-green-100 text-sm">Join Krishi Bandhu for personalized farming assistance</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-100 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Modern Progress Steps */}
        <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 flex-shrink-0">
          <div className="relative flex items-center justify-between mb-2">
            {/* Progress bar */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-green-200 rounded-full -z-10" />
            <div 
              className="absolute top-4 left-0 h-0.5 bg-green-500 rounded-full transition-all duration-500 -z-10"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
            
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center relative">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 mb-2 ${
                  currentStep >= step.id
                    ? 'bg-green-600 border-green-600 text-white shadow-lg'
                    : 'bg-white border-green-300 text-green-400'
                }`}>
                  <step.icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-medium text-center ${
                  currentStep >= step.id ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex-shrink-0"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              </motion.div>
            )}
            
            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto pr-2 form-content-scroll custom-scrollbar">
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* Modern Navigation */}
        <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 flex-shrink-0 rounded-b-3xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 px-3 py-1.5 text-green-700 hover:text-green-800 transition-all duration-200 hover:bg-white hover:shadow-md rounded-lg border border-green-300 font-medium text-sm"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Previous</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {currentStep < steps.length ? (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-sm"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <CheckCircle className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-green-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-green-700 hover:text-green-800 font-semibold underline hover:no-underline transition-all duration-200"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EnhancedSignup;
