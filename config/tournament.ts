
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
// 1. Go to MongoDB Atlas > App Services
// 2. Create an App and Copy the "App ID" (e.g., baps-live-abcde)
// 3. Paste it below or add it as VITE_MONGODB_APP_ID in Vercel.
export const MONGODB_CONFIG = {
  APP_ID: (import.meta as any).env?.VITE_MONGODB_APP_ID || "", 
  REGION: "us-east-1"
};

export const API_BASE_URL = "http://localhost:5000";
