import { useRef, useState } from "react";
import { Dimensions, Text, TouchableOpacity, View, StyleSheet, ScrollView, Platform } from "react-native";
import PagerView from "react-native-pager-view";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { useAppState } from "../../src/state/app-state";
import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

// Screen 1: Welcome to Vett
function WelcomeScreen({ onNext }: { onNext: () => void }) {
  const theme = useTheme();

  return (
    <View style={styles.screenContainer}>
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 600 }}
        style={styles.content}
      >
        {/* Floating glass card */}
        <GlassCard
          intensity="heavy"
          radius="xl"
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <MotiView
              from={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, delay: 200 }}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: theme.colors.primary + "20",
                    borderRadius: theme.radii.lg,
                    width: 100,
                    height: 100,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: theme.spacing(4)
                  }
                ]}
              >
                <Ionicons name="shield-checkmark" size={56} color={theme.colors.primary} />
              </View>
            </MotiView>
            
            <Text
              style={[
                styles.heroTitle,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.heading + 8,
                  fontWeight: "700",
                  letterSpacing: -0.8,
                  marginBottom: theme.spacing(2)
                }
              ]}
            >
              Welcome to Vett
            </Text>
            
            <Text
              style={[
                styles.heroSubtitle,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.body + 2,
                  lineHeight: (theme.typography.body + 2) * theme.typography.lineHeight.relaxed,
                  letterSpacing: 0.2,
                  textAlign: "center"
                }
              ]}
            >
              Instant AI-powered validation for any post, article, or claim.
            </Text>
          </View>
        </GlassCard>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={onNext}
            activeOpacity={0.8}
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radii.pill,
                paddingVertical: theme.spacing(2.5)
              }
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: "#FFFFFF",
                  fontSize: theme.typography.body,
                  fontWeight: "600",
                  letterSpacing: 0.3
                }
              ]}
            >
              Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNext}
            activeOpacity={0.7}
            style={styles.secondaryButton}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.body,
                  letterSpacing: 0.2
                }
              ]}
            >
              Learn More
            </Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
}

// Screen 2: How Vett Works
function HowItWorksScreen({ onNext }: { onNext: () => void }) {
  const theme = useTheme();

  const steps = [
    {
      title: "Share any link or screenshot",
      description: "Paste a URL, upload an image, or capture a post from any platform.",
      icon: "link-outline",
      gradient: [theme.colors.primary, theme.colors.secondary]
    },
    {
      title: "Vett analyzes automatically",
      description: "AI extracts claims, verifies sources, and evaluates credibility in seconds.",
      icon: "analytics-outline",
      gradient: [theme.colors.secondary, theme.colors.highlight]
    },
    {
      title: "Get confidence-scored breakdown",
      description: "Receive transparent reasoning with bias detection and source reliability scores.",
      icon: "shield-checkmark-outline",
      gradient: [theme.colors.highlight, theme.colors.primary]
    }
  ];

  return (
    <ScrollView
      style={styles.screenContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: "timing", duration: 400 }}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.text,
              fontSize: theme.typography.heading,
              fontWeight: "700",
              letterSpacing: -0.5,
              marginBottom: theme.spacing(4),
              textAlign: "center"
            }
          ]}
        >
          How Vett Works
        </Text>

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <MotiView
              key={step.title}
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 500, delay: index * 150 }}
            >
              <GlassCard
                intensity="medium"
                radius="lg"
                style={styles.stepCard}
                gradientAccent={{
                  colors: step.gradient,
                  start: { x: 0, y: 0 },
                  end: { x: 1, y: 0 }
                }}
              >
                <View style={styles.stepContent}>
                  <View
                    style={[
                      styles.stepIconContainer,
                      {
                        backgroundColor: step.gradient[0] + "20",
                        borderRadius: theme.radii.lg,
                        width: 64,
                        height: 64,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: theme.spacing(2.5)
                      }
                    ]}
                  >
                    <Ionicons name={step.icon as keyof typeof Ionicons.glyphMap} size={32} color={step.gradient[0]} />
                  </View>
                  
                  <Text
                    style={[
                      styles.stepTitle,
                      {
                        color: theme.colors.text,
                        fontSize: theme.typography.subheading,
                        fontWeight: "600",
                        letterSpacing: -0.3,
                        marginBottom: theme.spacing(1)
                      }
                    ]}
                  >
                    {step.title}
                  </Text>
                  
                  <Text
                    style={[
                      styles.stepDescription,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.body,
                        lineHeight: theme.typography.body * theme.typography.lineHeight.relaxed,
                        letterSpacing: 0.1,
                        textAlign: "center"
                      }
                    ]}
                  >
                    {step.description}
                  </Text>
                </View>
              </GlassCard>
            </MotiView>
          ))}
        </View>

        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.8}
          style={[
            styles.primaryButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.pill,
              paddingVertical: theme.spacing(2.5),
              marginTop: theme.spacing(4)
            }
          ]}
        >
          <Text
            style={[
              styles.primaryButtonText,
              {
                color: "#FFFFFF",
                fontSize: theme.typography.body,
                fontWeight: "600",
                letterSpacing: 0.3
              }
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </MotiView>
    </ScrollView>
  );
}

// Screen 3: Permissions Setup
function PermissionsScreen({ onNext }: { onNext: () => void }) {
  const theme = useTheme();
  const [permissions, setPermissions] = useState({
    clipboard: true,
    photos: true,
    camera: false
  });

  const permissionItems = [
    {
      key: "clipboard" as const,
      title: "Clipboard Access",
      description: "Allow Vett to read links and text from your clipboard for quick analysis.",
      icon: "clipboard-outline"
    },
    {
      key: "photos" as const,
      title: "Photo Library",
      description: "Access your photos to analyze screenshots and images you've saved.",
      icon: "images-outline"
    },
    {
      key: "camera" as const,
      title: "Camera",
      description: "Capture screenshots directly from the app for instant fact-checking.",
      icon: "camera-outline"
    }
  ];

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScrollView
      style={styles.screenContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: "timing", duration: 400 }}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.text,
              fontSize: theme.typography.heading,
              fontWeight: "700",
              letterSpacing: -0.5,
              marginBottom: theme.spacing(1)
            }
          ]}
        >
          Permissions Setup
        </Text>
        
        <Text
          style={[
            styles.sectionSubtitle,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.body,
              lineHeight: theme.typography.body * theme.typography.lineHeight.relaxed,
              marginBottom: theme.spacing(4),
              textAlign: "center"
            }
          ]}
        >
          Enable permissions to get the most out of Vett
        </Text>

        <GlassCard intensity="medium" radius="lg" style={styles.permissionsCard}>
          {permissionItems.map((item, index) => (
            <MotiView
              key={item.key}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: "timing", duration: 400, delay: index * 100 }}
            >
              <View
                style={[
                  styles.permissionItem,
                  {
                    paddingVertical: theme.spacing(2.5),
                    paddingHorizontal: theme.spacing(2.5),
                    borderBottomWidth: index < permissionItems.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.borderLight
                  }
                ]}
              >
                <View style={styles.permissionLeft}>
                  <View
                    style={[
                      styles.permissionIcon,
                      {
                        backgroundColor: theme.colors.primary + "20",
                        borderRadius: theme.radii.md,
                        width: 48,
                        height: 48,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: theme.spacing(2.5)
                      }
                    ]}
                  >
                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
                  </View>
                  
                  <View style={styles.permissionText}>
                    <Text
                      style={[
                        styles.permissionTitle,
                        {
                          color: theme.colors.text,
                          fontSize: theme.typography.body,
                          fontWeight: "600",
                          letterSpacing: -0.1,
                          marginBottom: theme.spacing(0.5)
                        }
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.permissionDescription,
                        {
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.caption,
                          lineHeight: theme.typography.caption * theme.typography.lineHeight.normal,
                          letterSpacing: 0.1
                        }
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => togglePermission(item.key)}
                  activeOpacity={0.7}
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: permissions[item.key] ? theme.colors.primary : theme.colors.border,
                      borderRadius: theme.radii.pill,
                      width: 50,
                      height: 30,
                      justifyContent: "center",
                      paddingHorizontal: 2
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: "#FFFFFF",
                        borderRadius: theme.radii.pill,
                        width: 26,
                        height: 26,
                        transform: [{ translateX: permissions[item.key] ? 20 : 0 }]
                      }
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </MotiView>
          ))}
        </GlassCard>

        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.8}
          style={[
            styles.primaryButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.pill,
              paddingVertical: theme.spacing(2.5),
              marginTop: theme.spacing(4)
            }
          ]}
        >
          <Text
            style={[
              styles.primaryButtonText,
              {
                color: "#FFFFFF",
                fontSize: theme.typography.body,
                fontWeight: "600",
                letterSpacing: 0.3
              }
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </MotiView>
    </ScrollView>
  );
}

// Screen 4: Sign-in Options
function SignInScreen({ onComplete }: { onComplete: () => void }) {
  const theme = useTheme();
  const { setAuthMode } = useAppState();

  const handleSignIn = async (method: "google" | "apple" | "email" | "phone" | "guest") => {
    if (method === "guest") {
      await setAuthMode("guest");
    } else {
      await setAuthMode("signedIn");
    }
    onComplete();
  };

  return (
    <View style={styles.screenContainer}>
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: "timing", duration: 400 }}
        style={styles.content}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.text,
              fontSize: theme.typography.heading,
              fontWeight: "700",
              letterSpacing: -0.5,
              marginBottom: theme.spacing(1),
              textAlign: "center"
            }
          ]}
        >
          Get Started
        </Text>
        
        <Text
          style={[
            styles.sectionSubtitle,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.body,
              lineHeight: theme.typography.body * theme.typography.lineHeight.relaxed,
              marginBottom: theme.spacing(5),
              textAlign: "center"
            }
          ]}
        >
          Sign in to sync your analyses across devices
        </Text>

        <View style={styles.signInContainer}>
          {/* Google Sign In */}
          <TouchableOpacity
            onPress={() => handleSignIn("google")}
            activeOpacity={0.8}
            style={[
              styles.signInButton,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingVertical: theme.spacing(2.5)
              }
            ]}
          >
            <Ionicons name="logo-google" size={24} color={theme.colors.text} />
            <Text
              style={[
                styles.signInButtonText,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.body,
                  fontWeight: "600",
                  letterSpacing: 0.2,
                  marginLeft: theme.spacing(2)
                }
              ]}
            >
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Apple Sign In */}
          {Platform.OS === "ios" && (
            <TouchableOpacity
              onPress={() => handleSignIn("apple")}
              activeOpacity={0.8}
              style={[
                styles.signInButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  paddingVertical: theme.spacing(2.5)
                }
              ]}
            >
              <Ionicons name="logo-apple" size={24} color={theme.colors.text} />
              <Text
                style={[
                  styles.signInButtonText,
                  {
                    color: theme.colors.text,
                    fontSize: theme.typography.body,
                    fontWeight: "600",
                    letterSpacing: 0.2,
                    marginLeft: theme.spacing(2)
                  }
                ]}
              >
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}

          {/* Email Sign In */}
          <TouchableOpacity
            onPress={() => handleSignIn("email")}
            activeOpacity={0.8}
            style={[
              styles.signInButton,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingVertical: theme.spacing(2.5)
              }
            ]}
          >
            <Ionicons name="mail-outline" size={24} color={theme.colors.text} />
            <Text
              style={[
                styles.signInButtonText,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.body,
                  fontWeight: "600",
                  letterSpacing: 0.2,
                  marginLeft: theme.spacing(2)
                }
              ]}
            >
              Continue with Email
            </Text>
          </TouchableOpacity>

          {/* Phone Sign In */}
          <TouchableOpacity
            onPress={() => handleSignIn("phone")}
            activeOpacity={0.8}
            style={[
              styles.signInButton,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingVertical: theme.spacing(2.5)
              }
            ]}
          >
            <Ionicons name="call-outline" size={24} color={theme.colors.text} />
            <Text
              style={[
                styles.signInButtonText,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.body,
                  fontWeight: "600",
                  letterSpacing: 0.2,
                  marginLeft: theme.spacing(2)
                }
              ]}
            >
              Continue with Phone
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.borderLight }]} />
            <Text
              style={[
                styles.dividerText,
                {
                  color: theme.colors.textTertiary,
                  fontSize: theme.typography.caption,
                  marginHorizontal: theme.spacing(2)
                }
              ]}
            >
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.borderLight }]} />
          </View>

          {/* Guest Mode */}
          <TouchableOpacity
            onPress={() => handleSignIn("guest")}
            activeOpacity={0.7}
            style={styles.guestButton}
          >
            <Text
              style={[
                styles.guestButtonText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.body,
                  letterSpacing: 0.2
                }
              ]}
            >
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
}

// Main Onboarding Component
export default function OnboardingScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const { markOnboarded } = useAppState();
  const theme = useTheme();

  const screens = [
    { component: WelcomeScreen, key: "welcome" },
    { component: HowItWorksScreen, key: "how-it-works" },
    { component: PermissionsScreen, key: "permissions" },
    { component: SignInScreen, key: "signin" }
  ];

  const handleNext = () => {
    if (index < screens.length - 1) {
      pagerRef.current?.setPage(index + 1);
      return;
    }
  };

  const handleComplete = async () => {
    await markOnboarded();
    router.replace("/(tabs)/analyze");
  };

  const handleSkip = async () => {
    await markOnboarded();
    await handleComplete();
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Skip button - only show on first screen */}
        {index === 0 && (
          <View style={styles.skipContainer}>
            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              style={styles.skipButton}
            >
              <Text
                style={[
                  styles.skipButtonText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.body
                  }
                ]}
              >
                Skip
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={(event) => setIndex(event.nativeEvent.position)}
        >
          <View key="welcome">
            <WelcomeScreen onNext={handleNext} />
          </View>
          <View key="how-it-works">
            <HowItWorksScreen onNext={handleNext} />
          </View>
          <View key="permissions">
            <PermissionsScreen onNext={handleNext} />
          </View>
          <View key="signin">
            <SignInScreen onComplete={handleComplete} />
          </View>
        </PagerView>

        {/* Page indicators */}
        <View style={styles.indicators}>
          {screens.map((_, idx) => (
            <MotiView
              key={idx}
              animate={{
                width: idx === index ? 32 : 8,
                opacity: idx === index ? 1 : 0.4
              }}
              transition={{ type: "timing", duration: 300 }}
              style={[
                styles.indicator,
                {
                  backgroundColor: idx === index ? theme.colors.primary : theme.colors.card,
                  borderRadius: 4
                }
              ]}
            />
          ))}
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40
  },
  skipContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "flex-end",
    zIndex: 10
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  skipButtonText: {
    letterSpacing: 0.2
  },
  pager: {
    flex: 1
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 20
  },
  content: {
    flex: 1,
    justifyContent: "center"
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 20
  },
  heroCard: {
    width: "100%",
    padding: 32,
    alignItems: "center",
    marginBottom: 32
  },
  heroContent: {
    alignItems: "center"
  },
  iconContainer: {
    // Styled inline
  },
  heroTitle: {
    textAlign: "center"
  },
  heroSubtitle: {
    maxWidth: 280
  },
  buttonContainer: {
    gap: 16,
    width: "100%"
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    // Styled inline
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 12
  },
  secondaryButtonText: {
    // Styled inline
  },
  sectionTitle: {
    // Styled inline
  },
  sectionSubtitle: {
    // Styled inline
  },
  stepsContainer: {
    gap: 20
  },
  stepCard: {
    width: "100%",
    padding: 24,
    marginBottom: 16
  },
  stepContent: {
    alignItems: "center"
  },
  stepIconContainer: {
    // Styled inline
  },
  stepTitle: {
    textAlign: "center"
  },
  stepDescription: {
    maxWidth: 280
  },
  permissionsCard: {
    width: "100%"
  },
  permissionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  permissionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  permissionIcon: {
    // Styled inline
  },
  permissionText: {
    flex: 1
  },
  permissionTitle: {
    // Styled inline
  },
  permissionDescription: {
    // Styled inline
  },
  toggle: {
    alignItems: "center"
  },
  toggleThumb: {
    // Styled inline
  },
  signInContainer: {
    gap: 16,
    width: "100%"
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  signInButtonText: {
    // Styled inline
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8
  },
  dividerLine: {
    flex: 1,
    height: 1
  },
  dividerText: {
    letterSpacing: 0.5
  },
  guestButton: {
    alignItems: "center",
    paddingVertical: 12
  },
  guestButtonText: {
    // Styled inline
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 16
  },
  indicator: {
    height: 8
  }
});
