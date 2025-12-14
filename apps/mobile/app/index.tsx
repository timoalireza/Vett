import { useEffect } from "react";
import { Redirect } from "expo-router";
import { clearAllStorage } from "../src/utils/clear-storage";

// Uncomment the line below to clear all storage on app start (for testing)
// This will reset onboarding, auth state, and all preferences

export default function RootIndex() {
  // Uncomment to clear storage on every app start (dev only)
  // useEffect(() => {
  //   clearAllStorage().catch(console.error);
  // }, []);

  return <Redirect href="/analyze" />;
}
