
// BAPS_ASSETS contains default branding assets for BAPS Charities
export const BAPS_ASSETS = {
  FULL_LOGO: "https://www.bapscharities.org/wp-content/themes/baps-charities/images/baps-charities-logo.png",
  SYMBOL: "https://www.bapscharities.org/wp-content/themes/baps-charities/images/baps-charities-symbol.png"
};

export const TOURNAMENT = {
  id: "PRAMUKH-CUP-2026",
  name: "Pramukh Cup Regina 2026",
  location: "Regina, SK",
  year: 2026
};

// MONGODB CONFIG
// For Vercel deployment: Add VITE_MONGODB_APP_ID to your Vercel Environment Variables.
// This allows the app to connect to your Atlas cluster 'nktsar9' securely.
export const MONGODB_CONFIG = {
  APP_ID: (import.meta as any).env?.VITE_MONGODB_APP_ID || "", 
  REGION: "us-east-1"
};

export const API_BASE_URL = "http://localhost:5000";
