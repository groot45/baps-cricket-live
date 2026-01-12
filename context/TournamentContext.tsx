
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TournamentConfig } from '../types';
import { databaseService } from '../services/api';

interface TournamentContextType {
  config: TournamentConfig;
  updateConfig: (newConfig: TournamentConfig) => Promise<void>;
  loading: boolean;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<TournamentConfig>({
    id: "PRAMUKH-CUP-2026",
    name: "Pramukh Cup Regina 2026",
    shortName: "PRAMUKH CUP",
    year: 2026,
    location: "Regina, SK",
    logoUrl: "",
    bapsFullLogo: "",
    bapsSymbol: ""
  });
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const data = await databaseService.getTournamentConfig();
      if (data) {
        setConfig({
          ...data,
          bapsFullLogo: data.bapsFullLogo || "",
          bapsSymbol: data.bapsSymbol || ""
        });
      }
    } catch (e) {
      console.error("TournamentContext: Fetch Error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initialize DB Connection first thing
    const initAndFetch = async () => {
      await databaseService.initRealm();
      await fetchConfig();
    };

    initAndFetch();

    // 2. Poll for branding updates every 30 seconds
    // This ensures that when an admin changes a logo, all live screens (including non-logged-in users)
    // will see the update without a manual refresh.
    const interval = setInterval(fetchConfig, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const updateConfig = async (newConfig: TournamentConfig) => {
    const updated = await databaseService.updateTournamentConfig(newConfig);
    if (updated) {
      setConfig(updated);
    }
  };

  return (
    <TournamentContext.Provider value={{ config, updateConfig, loading }}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};
