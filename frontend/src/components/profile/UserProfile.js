import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useUserStore from '../../stores/userStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  User, 
  MapPin, 
  Leaf, 
  Globe, 
  Bell, 
  Save, 
  Edit3, 
  X, 
  Settings, 
  Shield,
  Phone,
  Calendar,
  Home,
  Banknote,
  Zap,
  AlertTriangle,
  Languages,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';

const UserProfile = ({ onClose }) => {
  const { t } = useLanguage();
  const { 
    userProfile, 
    updateUserProfile, 
    updateComprehensiveProfile, 
    refreshUserProfile,
    getDisplayName,
    getUserLocation,
    getUserCropType,
    getUserLanguage
  } = useUserStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Details
    firstName: '',
    lastName: '',
    phone: '',
    preferredLanguage: 'en',
    
    // Location Details
    state: '',
    district: '',
    village: '',
    pinCode: '',
    
    // Landholding Details
    landSizeHa: '',
    ownershipType: '',
    landRecordVerified: false,
    
    // Banking Information
    bankName: '',
    hasKcc: false,
    aadhaarLinkedBank: false,
    
    // Agriculture Details
    currentCrops: [],
    season: '',
    hasSolarPump: false,
    pumpCapacityHp: '',
    gridConnectedPump: false,
    
    // Financial Details
    annualIncome: '',
    repaymentHistoryGood: false,
    desiredLoanAmount: '',
    loanPurpose: '',
    
    // PM-KISAN Exclusion Flags
    familyPaysIncomeTax: false,
    familyGovtEmployee: false,
    familyConstitutionalPost: false,
    familyProfessional: false,
    
    // Preferences
    notifications: true,
    communicationPreference: 'both'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Initialize form data when component mounts
  useEffect(() => {
    if (userProfile) {
      console.log('UserProfile: Initializing form data with profile:', userProfile);
      
      const initialFormData = {
        // Personal Details
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
        preferredLanguage: userProfile.preferredLanguage || userProfile.preferences?.language || 'en',
        
        // Location Details
        state: userProfile.location?.state || '',
        district: userProfile.location?.district || '',
        village: userProfile.location?.village || '',
        pinCode: userProfile.location?.pinCode || '',
        
        // Landholding Details
        landSizeHa: userProfile.landholdingDetails?.landSizeHa?.toString() || '',
        ownershipType: userProfile.landholdingDetails?.ownershipType || '',
        landRecordVerified: userProfile.landholdingDetails?.landRecordVerified || false,
        
        // Banking Information
        bankName: userProfile.bankingInfo?.bankName || '',
        hasKcc: userProfile.bankingInfo?.hasKcc || false,
        aadhaarLinkedBank: userProfile.bankingInfo?.aadhaarLinkedBank || false,
        
        // Agriculture Details
        currentCrops: userProfile.agricultureSpecific?.currentCrops || [],
        season: userProfile.agricultureSpecific?.season || '',
        hasSolarPump: userProfile.agricultureSpecific?.hasSolarPump || false,
        pumpCapacityHp: userProfile.agricultureSpecific?.pumpCapacityHp?.toString() || '',
        gridConnectedPump: userProfile.agricultureSpecific?.gridConnectedPump || false,
        
        // Financial Details
        annualIncome: userProfile.incomeRepayment?.annualIncome?.toString() || '',
        repaymentHistoryGood: userProfile.incomeRepayment?.repaymentHistoryGood || false,
        desiredLoanAmount: userProfile.incomeRepayment?.desiredLoanAmount?.toString() || '',
        loanPurpose: userProfile.incomeRepayment?.loanPurpose || '',
        
        // PM-KISAN Exclusion Flags
        familyPaysIncomeTax: userProfile.exclusionFlags?.familyPaysIncomeTax || false,
        familyGovtEmployee: userProfile.exclusionFlags?.familyGovtEmployee || false,
        familyConstitutionalPost: userProfile.exclusionFlags?.familyConstitutionalPost || false,
        familyProfessional: userProfile.exclusionFlags?.familyProfessional || false,
        
        // Preferences
        notifications: userProfile.preferences?.notifications !== false,
        communicationPreference: userProfile.preferences?.communicationPreference || 'both'
      };
      
      console.log('UserProfile: Setting initial form data:', initialFormData);
      setFormData(initialFormData);
    }
  }, [userProfile]);

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

  const handleSave = async () => {
    // Clear previous messages
    setSaveMessage('');
    setIsError(false);
    setValidationErrors({});
    
    // Validate form data
    const errors = {};
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }
    if (!formData.district.trim()) {
      errors.district = 'District is required';
    }
    if (!formData.village.trim()) {
      errors.village = 'Village is required';
    }
    if (!formData.pinCode.trim()) {
      errors.pinCode = 'Pin code is required';
    }
    if (!formData.landSizeHa.trim()) {
      errors.landSizeHa = 'Land size is required';
    }
    if (!formData.ownershipType.trim()) {
      errors.ownershipType = 'Ownership type is required';
    }
    if (!formData.bankName.trim()) {
      errors.bankName = 'Bank name is required';
    }
    if (formData.currentCrops.length === 0) {
      errors.currentCrops = 'At least one crop is required';
    }
    if (!formData.season.trim()) {
      errors.season = 'Season is required';
    }
    if (!formData.annualIncome.trim()) {
      errors.annualIncome = 'Annual income is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Create comprehensive profile update
      const updatedProfile = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        preferredLanguage: formData.preferredLanguage,
        location: {
          state: formData.state,
          district: formData.district,
          village: formData.village,
          pinCode: formData.pinCode,
          fullAddress: `${formData.village}, ${formData.district}, ${formData.state}`
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
          desiredLoanAmount: parseFloat(formData.desiredLoanAmount) || 0,
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
          language: formData.preferredLanguage
        }
      };
      
      // Update the profile using the store method
      await updateUserProfile(updatedProfile);
      
      setSaveMessage('Profile updated successfully!');
      setIsError(false);
      setIsEditing(false);
        
      // Refresh profile from Firebase to ensure we have the latest data
      await refreshUserProfile();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage('Failed to update profile. Please try again.');
      setIsError(true);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSaveMessage('');
        setIsError(false);
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current values by re-initializing
    if (userProfile) {
      console.log('UserProfile: Resetting form data to current profile values:', userProfile);
      
      const resetFormData = {
        // Personal Details
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
        preferredLanguage: userProfile.preferredLanguage || userProfile.preferences?.language || 'en',
        
        // Location Details
        state: userProfile.location?.state || '',
        district: userProfile.location?.district || '',
        village: userProfile.location?.village || '',
        pinCode: userProfile.location?.pinCode || '',
        
        // Landholding Details
        landSizeHa: userProfile.landholdingDetails?.landSizeHa?.toString() || '',
        ownershipType: userProfile.landholdingDetails?.ownershipType || '',
        landRecordVerified: userProfile.landholdingDetails?.landRecordVerified || false,
        
        // Banking Information
        bankName: userProfile.bankingInfo?.bankName || '',
        hasKcc: userProfile.bankingInfo?.hasKcc || false,
        aadhaarLinkedBank: userProfile.bankingInfo?.aadhaarLinkedBank || false,
        
        // Agriculture Details
        currentCrops: userProfile.agricultureSpecific?.currentCrops || [],
        season: userProfile.agricultureSpecific?.season || '',
        hasSolarPump: userProfile.agricultureSpecific?.hasSolarPump || false,
        pumpCapacityHp: userProfile.agricultureSpecific?.pumpCapacityHp?.toString() || '',
        gridConnectedPump: userProfile.agricultureSpecific?.gridConnectedPump || false,
        
        // Financial Details
        annualIncome: userProfile.incomeRepayment?.annualIncome?.toString() || '',
        repaymentHistoryGood: userProfile.incomeRepayment?.repaymentHistoryGood || false,
        desiredLoanAmount: userProfile.incomeRepayment?.desiredLoanAmount?.toString() || '',
        loanPurpose: userProfile.incomeRepayment?.loanPurpose || '',
        
        // PM-KISAN Exclusion Flags
        familyPaysIncomeTax: userProfile.exclusionFlags?.familyPaysIncomeTax || false,
        familyGovtEmployee: userProfile.exclusionFlags?.familyGovtEmployee || false,
        familyConstitutionalPost: userProfile.exclusionFlags?.familyConstitutionalPost || false,
        familyProfessional: userProfile.exclusionFlags?.familyProfessional || false,
        
        // Preferences
        notifications: userProfile.preferences?.notifications !== false,
        communicationPreference: userProfile.preferences?.communicationPreference || 'both'
      };
      
      console.log('UserProfile: Setting reset form data:', resetFormData);
      setFormData(resetFormData);
    }
    setIsEditing(false);
  };

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

  if (!userProfile) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Comprehensive Farmer Profile</h2>
                <p className="text-white/80">Manage your complete farming profile and preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshUserProfile}
                disabled={isSaving}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Refresh Profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 space-y-6">
          {/* Profile Picture Section */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
              <User className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{getDisplayName()}</h3>
            <p className="text-gray-600">{userProfile.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              {userProfile.location?.village && userProfile.location?.district && userProfile.location?.state 
                ? `${userProfile.location.village}, ${userProfile.location.district}, ${userProfile.location.state}`
                : 'Location not set'
              }
            </p>
          </div>

          {/* Edit Button */}
          <div className="text-center">
            <button
              onClick={() => setIsEditing(!isEditing)}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditing ? 'Cancel Editing' : 'Edit Comprehensive Profile'}
            </button>
          </div>

          {/* Loading Indicator */}
          {isSaving && (
            <div className="flex items-center justify-center p-4">
              <div className="flex items-center gap-3 text-blue-600">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Updating profile...</span>
              </div>
            </div>
          )}

          {/* Save Message */}
          {saveMessage && (
            <div className={`p-4 rounded-xl ${
              isError 
                ? 'bg-red-50 border border-red-200 text-red-700' 
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              <div className="flex items-center gap-2">
                {isError ? (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                ) : (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
                <span className="font-medium">{saveMessage}</span>
              </div>
            </div>
          )}

          {/* Profile Form */}
          <div className="space-y-6">
            {/* Personal Details Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.firstName || 'Not set'}
                    </div>
                  )}
                  {validationErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.lastName || 'Not set'}
                    </div>
                  )}
                  {validationErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={isSaving}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div className="p-3 bg-white rounded-xl text-gray-800">
                    {formData.phone || 'Not set'}
                  </div>
                )}
                {validationErrors.phone && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Location Details Section */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      <option value="">Select your state</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.state || 'Not set'}
                    </div>
                  )}
                  {validationErrors.state && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.state}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    District <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      placeholder="Enter district"
                    />
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.district || 'Not set'}
                    </div>
                  )}
                  {validationErrors.district && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.district}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Village <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.village}
                      onChange={(e) => handleInputChange('village', e.target.value)}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      placeholder="Enter village"
                    />
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.village || 'Not set'}
                    </div>
                  )}
                  {validationErrors.village && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.village}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pin Code <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.pinCode}
                      onChange={(e) => handleInputChange('pinCode', e.target.value)}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      placeholder="Enter 6-digit pin code"
                      maxLength="6"
                    />
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.pinCode || 'Not set'}
                    </div>
                  )}
                  {validationErrors.pinCode && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.pinCode}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Landholding Details Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Landholding Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Land Size (Hectares) <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.landSizeHa}
                      onChange={(e) => handleInputChange('landSizeHa', e.target.value)}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      placeholder="0.0"
                      step="0.1"
                      min="0"
                    />
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.landSizeHa ? `${formData.landSizeHa} hectares` : 'Not set'}
                    </div>
                  )}
                  {validationErrors.landSizeHa && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.landSizeHa}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ownership Type <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.ownershipType}
                      onChange={(e) => handleInputChange('ownershipType', e.target.value)}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      <option value="">Select ownership type</option>
                      {ownershipTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.ownershipType || 'Not set'}
                    </div>
                  )}
                  {validationErrors.ownershipType && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.ownershipType}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Banking Information Section */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Banking Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    disabled={isSaving}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    placeholder="Enter bank name"
                  />
                ) : (
                  <div className="p-3 bg-white rounded-xl text-gray-800">
                    {formData.bankName || 'Not set'}
                  </div>
                )}
                {validationErrors.bankName && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.bankName}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Has Kisan Credit Card
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.hasKcc ? 'yes' : 'no'}
                      onChange={(e) => handleInputChange('hasKcc', e.target.value === 'yes')}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.hasKcc ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Linked Bank
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.aadhaarLinkedBank ? 'yes' : 'no'}
                      onChange={(e) => handleInputChange('aadhaarLinkedBank', e.target.value === 'yes')}
                      disabled={isSaving}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : (
                    <div className="p-3 bg-white rounded-xl text-gray-800">
                      {formData.aadhaarLinkedBank ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Agriculture Details Section */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                <Leaf className="w-5 h-5" />
                Agriculture Details
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Crops <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
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
                ) : (
                  <div className="p-3 bg-white rounded-xl">
                    {formData.currentCrops.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.currentCrops.map((crop, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                          >
                            {crop}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">No crops selected</span>
                    )}
                  </div>
                )}
                {validationErrors.currentCrops && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.currentCrops}</p>
                )}
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Season <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <select
                    value={formData.season}
                    onChange={(e) => handleInputChange('season', e.target.value)}
                    disabled={isSaving}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    <option value="">Select current season</option>
                    {seasons.map(season => (
                      <option key={season.value} value={season.value}>{season.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-white rounded-xl text-gray-800">
                    {formData.season || 'Not set'}
                  </div>
                )}
                {validationErrors.season && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.season}</p>
                )}
              </div>
            </div>

            {/* Financial Details Section */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Financial Details
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Income <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.annualIncome}
                    onChange={(e) => handleInputChange('annualIncome', e.target.value)}
                    disabled={isSaving}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    placeholder="Enter annual income"
                    step="1000"
                    min="0"
                  />
                ) : (
                  <div className="p-3 bg-white rounded-xl text-gray-800">
                    {formData.annualIncome ? `₹${formData.annualIncome}` : 'Not set'}
                  </div>
                )}
                {validationErrors.annualIncome && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.annualIncome}</p>
                )}
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                <Languages className="w-5 h-5" />
                Preferences
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Preferred Language
                </label>
                {isEditing ? (
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                    disabled={isSaving}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {languages.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-white rounded-xl text-gray-800">
                    {languages.find(l => l.value === formData.preferredLanguage)?.label || 'Not set'}
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </label>
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={formData.notifications}
                      onChange={(e) => handleInputChange('notifications', e.target.checked)}
                      disabled={isSaving}
                      className="w-5 h-5 text-green-500 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="notifications" className="text-gray-700">
                      Receive farming updates and tips
                    </label>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl text-gray-800">
                    {formData.notifications ? 'Enabled' : 'Disabled'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfile;
