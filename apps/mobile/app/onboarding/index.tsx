import { Redirect } from "expo-router";
import { useAppState } from "../../src/state/app-state";

export default function OnboardingIndex() {
  const { hasOnboarded } = useAppState();

  // If already onboarded, redirect to main app
  if (hasOnboarded) {
    return <Redirect href="/(tabs)/analyze" />;
  }

  // Start with welcome screen
  return <Redirect href="/onboarding/welcome" />;
}
