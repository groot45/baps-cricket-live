
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

  useEffect(() => {
    const fetchConfig = async () => {
      const data = await databaseService.getTournamentConfig();
      // Ensure we have the new fields even if loading from older local storage
      setConfig({
        ...data,
        bapsFullLogo: data.bapsFullLogo || "",
        bapsSymbol: data.bapsSymbol || ""
      });
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const updateConfig = async (newConfig: TournamentConfig) => {
    const updated = await databaseService.updateTournamentConfig(newConfig);
    setConfig(updated);
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
