import { Redirect } from "expo-router";
import { useAppState } from "../../src/state/app-state";

export default function OnboardingIndex() {
  const { hasOnboarded } = useAppState();

  // If already onboarded, redirect to main app
  if (hasOnboarded) {
    return <Redirect href="/(tabs)/analyze" />;
  }

  // Start with warm-up screen
  return <Redirect href="/onboarding/warm-up" />;
}
