
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { financeService } from '../services/financeService';

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (newProfile: UserProfile) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    setLoading(true);
    try {
      // financeService now intelligently checks if it's Demo or Live
      const data = await financeService.getUserSettings();
      setProfile(data);
    } catch (error) {
      console.error("Failed to load user profile", error);
      setProfile(null); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const updateProfile = async (newProfile: UserProfile) => {
    // Optimistic Update
    setProfile(newProfile);
    
    try {
      const updated = await financeService.updateUserSettings(newProfile);
      setProfile(updated);
    } catch (error) {
      console.error("Failed to update profile", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ profile, loading, updateProfile, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
