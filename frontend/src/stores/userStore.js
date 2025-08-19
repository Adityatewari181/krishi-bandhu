import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '../config/firebase';

const useUserStore = create(
  persist(
    (set, get) => ({
      // User state
      user: null,
      userProfile: null,
      isAuthenticated: false,
      isLoading: false,
      
      // Initialize Firebase auth listener
      initializeAuth: () => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // User is signed in
            console.log('Firebase user authenticated:', user.uid);
            await get().setUser(user);
          } else {
            // User is signed out
            console.log('Firebase user signed out');
            set({ 
              user: null, 
              userProfile: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        });
        
        // Return unsubscribe function
        return unsubscribe;
      },
      
      // Sign out user
      signOut: async () => {
        try {
          await signOut(auth);
          console.log('User signed out successfully');
        } catch (error) {
          console.error('Error signing out:', error);
        }
      },
      
      // User actions
      setUser: async (user) => {
        if (!user) {
          set({ 
            user: null, 
            userProfile: null,
            isAuthenticated: false,
            isLoading: false
          });
          return;
        }

        try {
          // If user already has comprehensive profile (from enhanced signup), save it to Firestore
          if (user.location && user.farmingProfile && user.preferences) {
            // Save comprehensive profile to Firestore
            await setDoc(doc(db, 'users', user.uid), {
              ...user,
              updatedAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            }, { merge: true });
            
            set({ 
              user, 
              userProfile: user,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            // Try to fetch existing profile from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (userDoc.exists()) {
              // Use existing profile from Firestore
              const existingProfile = userDoc.data();
              set({ 
                user, 
                userProfile: existingProfile,
                isAuthenticated: true,
                isLoading: false
              });
            } else {
              // Create basic profile for new users
              const basicProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Farmer',
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                preferences: {
                  language: 'en',
                  location: '',
                  cropType: '',
                  notifications: true
                }
              };
              
              // Save basic profile to Firestore
              await setDoc(doc(db, 'users', user.uid), basicProfile);
              
              set({ 
                user, 
                userProfile: basicProfile,
                isAuthenticated: true,
                isLoading: false
              });
            }
          }
        } catch (error) {
          console.error('Error setting user:', error);
          // Fallback to basic profile if Firestore fails
          const fallbackProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Farmer',
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
              language: 'en',
              location: '',
              cropType: '',
              notifications: true
            }
          };
          
          set({ 
            user, 
            userProfile: fallbackProfile,
            isAuthenticated: true,
            isLoading: false
          });
        }
      },
      
      updateUserProfile: async (updates) => {
        const { user, userProfile } = get();
        if (!user || !userProfile) return;

        try {
          const updatedProfile = { ...userProfile, ...updates, updatedAt: serverTimestamp() };
          
          // Update in Firestore
          await updateDoc(doc(db, 'users', user.uid), {
            ...updates,
            updatedAt: serverTimestamp()
          });
          
          // Also update the user object if displayName is being updated
          let updatedUser = user;
          if (updates.displayName) {
            updatedUser = { ...user, displayName: updates.displayName };
          }
          
          set({
            user: updatedUser,
            userProfile: updatedProfile
          });
        } catch (error) {
          console.error('Error updating user profile:', error);
          throw error;
        }
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      logout: () => set({ 
        user: null, 
        userProfile: null, 
        isAuthenticated: false 
      }),

      // Refresh user profile from Firestore
      refreshUserProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const updatedProfile = userDoc.data();
            set({ userProfile: updatedProfile });
          }
        } catch (error) {
          console.error('Error refreshing user profile:', error);
          // If Firestore fails, we'll keep using the local profile
          console.warn('Using local profile due to Firestore error');
        }
      },
      
      // Profile management
      updatePreferences: async (preferences) => {
        const { user, userProfile } = get();
        if (!user || !userProfile) return;

        try {
          // Update in Firestore
          await updateDoc(doc(db, 'users', user.uid), {
            preferences: { ...userProfile.preferences, ...preferences },
            updatedAt: serverTimestamp()
          });
          
          // Update local state
          const updatedProfile = {
            ...userProfile,
            preferences: { ...userProfile.preferences, ...preferences }
          };
          
          set({ userProfile: updatedProfile });
        } catch (error) {
          console.error('Error updating preferences in Firebase:', error);
          throw error;
        }
      },
      
      // Enhanced profile update method for comprehensive profile changes
      updateComprehensiveProfile: async (updates) => {
        const { user, userProfile } = get();
        if (!user || !userProfile) return;

        try {
          const updateData = {};
          
          // Handle display name updates
          if (updates.displayName) {
            updateData.displayName = updates.displayName;
          }
          
          // Handle location updates (convert simple location string to structured format)
          if (updates.location) {
            // Parse location string and create structured location object
            const locationParts = updates.location.split(',').map(part => part.trim());
            updateData.location = {
              fullAddress: updates.location,
              village: locationParts[0] || '',
              city: locationParts[1] || '',
              district: locationParts[2] || '',
              state: locationParts[3] || '',
              pinCode: locationParts[4] || ''
            };
          }
          
          // Handle crop type updates
          if (updates.cropType) {
            updateData.farmingProfile = {
              ...userProfile.farmingProfile,
              primaryCrop: updates.cropType
            };
          }
          
          // Handle all crop types updates
          if (updates.allCropTypes) {
            updateData.farmingProfile = {
              ...updateData.farmingProfile,
              ...userProfile.farmingProfile,
              allCropTypes: updates.allCropTypes
            };
          }
          
          // Update in Firestore
          await updateDoc(doc(db, 'users', user.uid), {
            ...updateData,
            updatedAt: serverTimestamp()
          });
          
          // Update local state
          const updatedProfile = { ...userProfile, ...updateData };
          set({ userProfile: updatedProfile });
          
          return { success: true, message: 'Profile updated successfully' };
        } catch (error) {
          console.error('Error updating comprehensive profile in Firebase:', error);
          throw error;
        }
      },
      
      // Helper methods
      getUserProfile: () => get().userProfile,
      isUserLoggedIn: () => get().isAuthenticated,
      
      // Get user ID for API calls
      getUserId: () => {
        const { user } = get();
        return user?.uid || null;
      },
      
      // Get user preferences
      getUserLocation: () => {
        const { userProfile } = get();
        // Check for comprehensive location first
        if (userProfile?.location?.fullAddress) {
          return userProfile.location.fullAddress;
        }
        if (userProfile?.location?.village && userProfile?.location?.city && userProfile?.location?.state) {
          return `${userProfile.location.village}, ${userProfile.location.city}, ${userProfile.location.state}`;
        }
        return userProfile?.preferences?.location || '';
      },

      getUserDarkMode: () => {
        const { userProfile } = get();
        return userProfile?.preferences?.darkMode || false;
      },
      
      getUserCropType: () => {
        const { userProfile } = get();
        return userProfile?.farmingProfile?.primaryCrop || userProfile?.preferences?.cropType || '';
      },
      
      getUserLanguage: () => {
        const { userProfile } = get();
        return userProfile?.preferences?.language || 'en';
      },

      // Enhanced location methods
      getUserVillage: () => {
        const { userProfile } = get();
        return userProfile?.location?.village || '';
      },

      getUserCity: () => {
        const { userProfile } = get();
        return userProfile?.location?.city || '';
      },

      getUserDistrict: () => {
        const { userProfile } = get();
        return userProfile?.location?.district || '';
      },

      getUserState: () => {
        const { userProfile } = get();
        return userProfile?.location?.state || '';
      },

      getUserPinCode: () => {
        const { userProfile } = get();
        return userProfile?.location?.pinCode || '';
      },

      // Enhanced farming profile methods
      getUserCropTypes: () => {
        const { userProfile } = get();
        return userProfile?.farmingProfile?.cropTypes || [];
      },

      getUserLandSize: () => {
        const { userProfile } = get();
        return userProfile?.farmingProfile?.landSize || 0;
      },

      getUserLandUnit: () => {
        const { userProfile } = get();
        return userProfile?.farmingProfile?.landUnit || 'acres';
      },

      getUserFarmingExperience: () => {
        const { userProfile } = get();
        return userProfile?.farmingProfile?.farmingExperience || '';
      },

      // Enhanced preference methods
      getUserNotifications: () => {
        const { userProfile } = get();
        return userProfile?.preferences?.notifications || false;
      },

      getUserCommunicationPreference: () => {
        const { userProfile } = get();
        return userProfile?.preferences?.communicationPreference || 'both';
      },

      getUserReceiveUpdates: () => {
        const { userProfile } = get();
        return userProfile?.preferences?.receiveUpdates || false;
      },

      // Update user preferences
      updateUserLocation: (location) => {
        const { userProfile } = get();
        if (userProfile) {
          set({
            userProfile: {
              ...userProfile,
              preferences: {
                ...userProfile.preferences,
                location
              }
            }
          });
        }
      },

      updateUserCropType: (cropType) => {
        const { userProfile } = get();
        if (userProfile) {
          set({
            userProfile: {
              ...userProfile,
              preferences: {
                ...userProfile.preferences,
                cropType
              }
            }
          });
        }
      },

      updateUserLanguage: async (language) => {
        const { user, userProfile } = get();
        if (!user || !userProfile) return;

        try {
          // Update in Firestore
          await updateDoc(doc(db, 'users', user.uid), {
            'preferences.language': language,
            updatedAt: serverTimestamp()
          });
          
          // Update local state
          const updatedProfile = {
            ...userProfile,
            preferences: {
              ...userProfile.preferences,
              language
            }
          };
          
          set({ userProfile: updatedProfile });
          console.log(`Language updated to: ${language}`);
        } catch (error) {
          console.error('Error updating language in Firebase:', error);
          // Fallback to local update only
          const updatedProfile = {
            ...userProfile,
            preferences: {
              ...userProfile.preferences,
              language
            }
          };
          set({ userProfile: updatedProfile });
          throw error;
        }
      },

      updateUserDarkMode: async (darkMode) => {
        const { user, userProfile } = get();
        if (!user || !userProfile) return;

        try {
          // Update in Firestore
          await updateDoc(doc(db, 'users', user.uid), {
            'preferences.darkMode': darkMode,
            updatedAt: serverTimestamp()
          });
          
          // Update local state
          const updatedProfile = {
            ...userProfile,
            preferences: {
              ...userProfile.preferences,
              darkMode
            }
          };
          
          set({ userProfile: updatedProfile });
        } catch (error) {
          console.error('Error updating dark mode preference in Firebase:', error);
          throw error;
        }
      },

      // Get display name for UI
      getDisplayName: () => {
        const { user, userProfile } = get();
        // Check for full name from signup form first
        if (userProfile?.name) {
          return userProfile.name;
        }
        // Check for firstName + lastName combination
        if (userProfile?.firstName && userProfile?.lastName) {
          return `${userProfile.firstName} ${userProfile.lastName}`;
        }
        // Fallback to displayName or email
        return userProfile?.displayName || user?.displayName || userProfile?.email?.split('@')[0] || 'Farmer';
      },
    }),
    {
      name: 'krishi-bandhu-user-storage',
      partialize: (state) => ({ 
        user: state.user, 
        userProfile: state.userProfile, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useUserStore;
