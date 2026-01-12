
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

// NOTE: For security, the mongodb+srv:// URI should NEVER be used directly in frontend code.
// We use the MongoDB Realm App ID to securely connect via the Web SDK.
export const MONGODB_CONFIG = {
  APP_ID: "", // To be set in Admin Panel > Settings
  REGION: "us-east-1"
};

export const API_BASE_URL = "http://localhost:5000";
