const app = require("./app.json");

module.exports = ({ config }) => ({
  ...config,
  name: "Mi Arca",
  slug: "mi-arca",
  scheme: "miarca",
  extra: {
    ...app.expo.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  },
});
