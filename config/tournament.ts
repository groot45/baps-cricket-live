
// BAPS_ASSETS contains default branding assets for BAPS Charities
export const BAPS_ASSETS = {
  FULL_LOGO: "https://www.bapscharities.org/wp-content/themes/baps-charities-logo.png",
  SYMBOL: "https://www.bapscharities.org/wp-content/themes/baps-charities-symbol.png"
};

export const TOURNAMENT = {
  id: "PRAMUKH-CUP-2026",
  name: "Pramukh Cup Regina 2026",
  location: "Regina, SK",
  year: 2026
};

/**
 * MONGODB CONFIGURATION
 * ----------------------------------------------------------------------------
 * WARNING: The string you provided (mongodb+srv://...) is a CONNECTION STRING.
 * This is for server-side drivers.
 * 
 * FOR THIS APP, YOU NEED AN "APP ID".
 * 
 * 1. Go to MongoDB Atlas (https://cloud.mongodb.com)
 * 2. Click "App Services" in the top navigation bar.
 * 3. Create a new App (e.g., "baps-cricket-live").
 * 4. Once created, look at the top left of the dashboard.
 * 5. You will see an "App ID" like: baps-cricket-live-abcde
 * 6. PASTE THAT ID BELOW.
 * ----------------------------------------------------------------------------
 */
export const MONGODB_CONFIG = {
  APP_ID: "baps-live-xxxxx", // <-- REPLACE THIS WITH YOUR APP ID
  REGION: "us-east-1"
};

export const API_BASE_URL = "http://localhost:5000";
