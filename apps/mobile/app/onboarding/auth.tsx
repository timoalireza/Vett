import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSignUp, useAuth, useClerk } from "@clerk/clerk-expo";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";
import { formatPhoneForDisplay, getMaxPhoneLength, getDisplayMaxLength } from "../../src/utils/phone-formatter";

// Country codes for phone number input (sorted alphabetically by country name)
const COUNTRY_CODES = [
  { code: "+355", country: "Albania", flag: "🇦🇱" },
  { code: "+213", country: "Algeria", flag: "🇩🇿" },
  { code: "+376", country: "Andorra", flag: "🇦🇩" },
  { code: "+244", country: "Angola", flag: "🇦🇴" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+297", country: "Aruba", flag: "🇦🇼" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+994", country: "Azerbaijan", flag: "🇦🇿" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+375", country: "Belarus", flag: "🇧🇾" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+501", country: "Belize", flag: "🇧🇿" },
  { code: "+229", country: "Benin", flag: "🇧🇯" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+387", country: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "+267", country: "Botswana", flag: "🇧🇼" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+246", country: "British Indian Ocean Territory", flag: "🇮🇴" },
  { code: "+673", country: "Brunei", flag: "🇧🇳" },
  { code: "+359", country: "Bulgaria", flag: "🇧🇬" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" },
  { code: "+855", country: "Cambodia", flag: "🇰🇭" },
  { code: "+237", country: "Cameroon", flag: "🇨🇲" },
  { code: "+1", country: "Canada", flag: "🇨🇦" },
  { code: "+238", country: "Cape Verde", flag: "🇨🇻" },
  { code: "+236", country: "Central African Republic", flag: "🇨🇫" },
  { code: "+235", country: "Chad", flag: "🇹🇩" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+269", country: "Comoros", flag: "🇰🇲" },
  { code: "+243", country: "Democratic Republic of the Congo", flag: "🇨🇩" },
  { code: "+242", country: "Republic of the Congo", flag: "🇨🇬" },
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+225", country: "Ivory Coast", flag: "🇨🇮" },
  { code: "+385", country: "Croatia", flag: "🇭🇷" },
  { code: "+53", country: "Cuba", flag: "🇨🇺" },
  { code: "+599", country: "Curaçao", flag: "🇨🇼" },
  { code: "+357", country: "Cyprus", flag: "🇨🇾" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+253", country: "Djibouti", flag: "🇩🇯" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+503", country: "El Salvador", flag: "🇸🇻" },
  { code: "+240", country: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+291", country: "Eritrea", flag: "🇪🇷" },
  { code: "+372", country: "Estonia", flag: "🇪🇪" },
  { code: "+268", country: "Eswatini", flag: "🇸🇿" },
  { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
  { code: "+500", country: "Falkland Islands", flag: "🇫🇰" },
  { code: "+298", country: "Faroe Islands", flag: "🇫🇴" },
  { code: "+679", country: "Fiji", flag: "🇫🇯" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+594", country: "French Guiana", flag: "🇬🇫" },
  { code: "+689", country: "French Polynesia", flag: "🇵🇫" },
  { code: "+241", country: "Gabon", flag: "🇬🇦" },
  { code: "+220", country: "Gambia", flag: "🇬🇲" },
  { code: "+995", country: "Georgia", flag: "🇬🇪" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+350", country: "Gibraltar", flag: "🇬🇮" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+299", country: "Greenland", flag: "🇬🇱" },
  { code: "+590", country: "Guadeloupe", flag: "🇬🇵" },
  { code: "+224", country: "Guinea", flag: "🇬🇳" },
  { code: "+245", country: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "+592", country: "Guyana", flag: "🇬🇾" },
  { code: "+509", country: "Haiti", flag: "🇭🇹" },
  { code: "+504", country: "Honduras", flag: "🇭🇳" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+354", country: "Iceland", flag: "🇮🇸" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+964", country: "Iraq", flag: "🇮🇶" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+972", country: "Israel", flag: "🇵🇸" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+7", country: "Kazakhstan", flag: "🇰🇿" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+686", country: "Kiribati", flag: "🇰🇮" },
  { code: "+383", country: "Kosovo", flag: "🇽🇰" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+856", country: "Laos", flag: "🇱🇦" },
  { code: "+371", country: "Latvia", flag: "🇱🇻" },
  { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+266", country: "Lesotho", flag: "🇱🇸" },
  { code: "+231", country: "Liberia", flag: "🇱🇷" },
  { code: "+218", country: "Libya", flag: "🇱🇾" },
  { code: "+423", country: "Liechtenstein", flag: "🇱🇮" },
  { code: "+370", country: "Lithuania", flag: "🇱🇹" },
  { code: "+352", country: "Luxembourg", flag: "🇱🇺" },
  { code: "+853", country: "Macau", flag: "🇲🇴" },
  { code: "+261", country: "Madagascar", flag: "🇲🇬" },
  { code: "+265", country: "Malawi", flag: "🇲🇼" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+960", country: "Maldives", flag: "🇲🇻" },
  { code: "+223", country: "Mali", flag: "🇲🇱" },
  { code: "+356", country: "Malta", flag: "🇲🇹" },
  { code: "+692", country: "Marshall Islands", flag: "🇲🇭" },
  { code: "+596", country: "Martinique", flag: "🇲🇶" },
  { code: "+222", country: "Mauritania", flag: "🇲🇷" },
  { code: "+230", country: "Mauritius", flag: "🇲🇺" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+691", country: "Micronesia", flag: "🇫🇲" },
  { code: "+373", country: "Moldova", flag: "🇲🇩" },
  { code: "+377", country: "Monaco", flag: "🇲🇨" },
  { code: "+976", country: "Mongolia", flag: "🇲🇳" },
  { code: "+382", country: "Montenegro", flag: "🇲🇪" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+258", country: "Mozambique", flag: "🇲🇿" },
  { code: "+95", country: "Myanmar", flag: "🇲🇲" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+674", country: "Nauru", flag: "🇳🇷" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+687", country: "New Caledonia", flag: "🇳🇨" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
  { code: "+227", country: "Niger", flag: "🇳🇪" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+683", country: "Niue", flag: "🇳🇺" },
  { code: "+672", country: "Norfolk Island", flag: "🇳🇫" },
  { code: "+850", country: "North Korea", flag: "🇰🇵" },
  { code: "+389", country: "North Macedonia", flag: "🇲🇰" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+680", country: "Palau", flag: "🇵🇼" },
  { code: "+970", country: "Palestine", flag: "🇵🇸" },
  { code: "+507", country: "Panama", flag: "🇵🇦" },
  { code: "+675", country: "Papua New Guinea", flag: "🇵🇬" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+262", country: "Réunion", flag: "🇷🇪" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+250", country: "Rwanda", flag: "🇷🇼" },
  { code: "+290", country: "Saint Helena", flag: "🇸🇭" },
  { code: "+508", country: "Saint Pierre and Miquelon", flag: "🇵🇲" },
  { code: "+685", country: "Samoa", flag: "🇼🇸" },
  { code: "+378", country: "San Marino", flag: "🇸🇲" },
  { code: "+239", country: "São Tomé and Príncipe", flag: "🇸🇹" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+221", country: "Senegal", flag: "🇸🇳" },
  { code: "+381", country: "Serbia", flag: "🇷🇸" },
  { code: "+248", country: "Seychelles", flag: "🇸🇨" },
  { code: "+232", country: "Sierra Leone", flag: "🇸🇱" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+421", country: "Slovakia", flag: "🇸🇰" },
  { code: "+386", country: "Slovenia", flag: "🇸🇮" },
  { code: "+677", country: "Solomon Islands", flag: "🇸🇧" },
  { code: "+252", country: "Somalia", flag: "🇸🇴" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+249", country: "Sudan", flag: "🇸🇩" },
  { code: "+597", country: "Suriname", flag: "🇸🇷" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+963", country: "Syria", flag: "🇸🇾" },
  { code: "+886", country: "Taiwan", flag: "🇹🇼" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+670", country: "East Timor", flag: "🇹🇱" },
  { code: "+228", country: "Togo", flag: "🇹🇬" },
  { code: "+690", country: "Tokelau", flag: "🇹🇰" },
  { code: "+676", country: "Tonga", flag: "🇹🇴" },
  { code: "+216", country: "Tunisia", flag: "🇹🇳" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+688", country: "Tuvalu", flag: "🇹🇻" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
  { code: "+678", country: "Vanuatu", flag: "🇻🇺" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+681", country: "Wallis and Futuna", flag: "🇼🇫" },
  { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
];

export default function AuthScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setAuthMode, phoneNumber: storedPhoneNumber, countryCode: storedCountryCode, setPhoneNumber, fullName } = useAppState();
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const { sessionId } = useAuth();
  const { signOut } = useClerk();

  const [loading, setLoading] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneNumber, setPhoneNumberLocal] = useState(storedPhoneNumber || "");
  const [countryCode, setCountryCodeLocal] = useState(storedCountryCode || "+1");
  const [selectedCountry, setSelectedCountry] = useState("United States");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown in seconds
  const sessionIdRef = useRef<string | null | undefined>(sessionId);
  const isSigningOutRef = useRef<boolean>(false);
  const hasAttemptedAutoNavigateRef = useRef<boolean>(false); // Track if we've already tried to navigate

  // Load stored values when component mounts or when stored values change
  useEffect(() => {
    if (storedPhoneNumber) {
      setPhoneNumberLocal(storedPhoneNumber);
    }
    if (storedCountryCode) {
      setCountryCodeLocal(storedCountryCode);
      const country = COUNTRY_CODES.find(c => c.code === storedCountryCode);
      if (country) {
        setSelectedCountry(country.country);
      }
    }
  }, [storedPhoneNumber, storedCountryCode]);

  // Keep refs in sync with state from hooks
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    isSigningOutRef.current = isSigningOut;
  }, [isSigningOut]);

  // Check if signUp is already complete and handle accordingly
  // Only runs once when we first detect complete status, not when user navigates back
  useEffect(() => {
    if (
      signUp && 
      signUp.status === "complete" && 
      signUp.createdSessionId && 
      setActive && 
      !loading && 
      !showVerificationForm &&
      !hasAttemptedAutoNavigateRef.current
    ) {
      // Sign up is already complete, try to set active session
      // Mark as attempted to prevent re-running when user goes back
      hasAttemptedAutoNavigateRef.current = true;
      
      const handleAlreadyComplete = async () => {
        try {
          await setActive({ session: signUp.createdSessionId });
          await setAuthMode("signedIn");
          router.push("/onboarding/trust");
        } catch (err) {
          console.warn("[Auth] Failed to set active session for already complete sign up:", err);
          // Reset the ref so user can try again if navigation failed
          hasAttemptedAutoNavigateRef.current = false;
        }
      };
      handleAlreadyComplete();
    }
    
    // Reset the ref when signUp status changes away from complete (e.g., new sign up attempt)
    if (signUp && signUp.status !== "complete") {
      hasAttemptedAutoNavigateRef.current = false;
    }
  }, [signUp?.status, signUp?.createdSessionId, setActive, loading, showVerificationForm, setAuthMode, router]);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);
  
  const setIsSigningOutWithRef = (value: boolean) => {
    setIsSigningOut(value);
    isSigningOutRef.current = value;
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      console.warn("Failed to clear existing session:", err);
    }
  }, [signOut]);

  // Format phone number for display (using utility function)
  const formatPhone = (phone: string) => formatPhoneForDisplay(phone, countryCode);

  // Get full phone number with country code
  const getFullPhoneNumber = () => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    return `${countryCode}${cleaned}`;
  };

  // Get flag for display based on selected country
  const getDisplayFlag = () => {
    const country = COUNTRY_CODES.find(
      c => c.code === countryCode && c.country === selectedCountry
    );
    return country?.flag || "🌍";
  };

  // Handle phone sign up
  const handlePhoneSignUp = async () => {
    if (!signUpLoaded || !signUp) {
      setError("Authentication service is not ready. Please wait a moment and try again.");
      return;
    }

    // Save phone number to state before proceeding
    await setPhoneNumber(phoneNumber, countryCode);

    const fullPhone = getFullPhoneNumber();
    const cleaned = phoneNumber.replace(/\D/g, "");
    const maxLength = getMaxPhoneLength(countryCode);
    const minLength = Math.max(7, Math.floor(maxLength * 0.7)); // At least 70% of max length or 7 digits
    
    if (!cleaned || cleaned.length < minLength || cleaned.length > maxLength) {
      setError(`Please enter a valid phone number (${minLength}-${maxLength} digits)`);
      return;
    }

    // Validate that fullName exists
    if (!fullName || !fullName.trim()) {
      setError("Please go back and enter your name first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Clear any existing session first
      if (sessionIdRef.current) {
        // Wait if sign out is already in progress
        if (isSigningOutRef.current) {
          const maxWaitTime = 5000;
          const pollInterval = 100;
          const startTime = Date.now();
          
          while (isSigningOutRef.current && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
          
          // After waiting for concurrent sign out, poll the ref until it reflects the cleared state
          // The useEffect (lines 243-245) will update sessionIdRef.current once the component
          // re-renders with the updated sessionId from useAuth() hook after signOut() completes
          // This fixes the race condition where the ref check at line 326 could see stale data
          const verifyClearedMaxTime = 2000;
          const verifyStartTime = Date.now();
          while (sessionIdRef.current && (Date.now() - verifyStartTime) < verifyClearedMaxTime) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
        }
        
        // If session still exists after waiting for concurrent sign out, perform sign out ourselves
        if (sessionIdRef.current) {
          try {
            setIsSigningOutWithRef(true);
            await signOut();
            
            // Poll the ref until it reflects the cleared session state
            // The useEffect will update sessionIdRef.current once the component re-renders
            // with the updated sessionId from useAuth() hook
            const maxWaitTime = 3000;
            const pollInterval = 100;
            const startTime = Date.now();
            
            while (sessionIdRef.current && (Date.now() - startTime) < maxWaitTime) {
              await new Promise(resolve => setTimeout(resolve, pollInterval));
              // sessionIdRef.current will be updated by useEffect (lines 243-245) 
              // once sessionId prop changes after Clerk processes the sign out
            }
            
            // If session still exists after polling, log warning but proceed
            if (sessionIdRef.current) {
              console.warn("Session may still exist after sign out, proceeding with sign up");
            }
          } catch (signOutErr) {
            console.warn("Failed to sign out existing session:", signOutErr);
            // Even if sign out fails, wait a bit to avoid race conditions
            await new Promise(resolve => setTimeout(resolve, 300));
          } finally {
            setIsSigningOutWithRef(false);
          }
        }
      }

      // Create sign up with phone number and name
      // Split fullName into firstName and lastName
      const nameParts = fullName?.trim().split(/\s+/) || [];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || undefined;

      console.log("[Auth] Attempting sign up with phone:", fullPhone, "Country:", selectedCountry, "Code:", countryCode);

      await signUp.create({
        phoneNumber: fullPhone,
        firstName: firstName,
        ...(lastName && { lastName }),
      });

      // Prepare phone verification
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });

      setShowVerificationForm(true);
      setError(null);
      setResendCooldown(30); // Start 30 second cooldown
    } catch (err: any) {
      console.error("[Auth] Sign up error:", err);
      let errorMessage = err.errors?.[0]?.message || err.message || "Failed to sign up";
      
      if (errorMessage.toLowerCase().includes("session") && errorMessage.toLowerCase().includes("already exists")) {
        errorMessage = "An account session already exists. Please sign out first.";
      }
      
      // Handle unsupported country code errors
      if (
        errorMessage.toLowerCase().includes("unsupported country code") ||
        (errorMessage.toLowerCase().includes("country code") && errorMessage.toLowerCase().includes("not supported")) ||
        (errorMessage.toLowerCase().includes("phone number") && errorMessage.toLowerCase().includes("not supported")) ||
        (errorMessage.toLowerCase().includes("country") && errorMessage.toLowerCase().includes("not available"))
      ) {
        errorMessage = `Phone verification is not available for ${selectedCountry} (+${countryCode.replace("+", "")}). Please try a different country or contact support for assistance.`;
        console.warn("[Auth] Unsupported country code detected:", countryCode, selectedCountry);
      }
      
      setError(errorMessage);
      setFailedAttempts((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    if (!signUp) {
      setError("Sign up session expired. Please try again.");
      return;
    }

    // Check if signUp is already complete
    if (signUp.status === "complete") {
      // If already complete, try to set active session
      if (signUp.createdSessionId && setActive) {
        try {
          await setActive({ session: signUp.createdSessionId });
          await setAuthMode("signedIn");
          router.push("/onboarding/trust");
          return;
        } catch (err) {
          console.warn("[Auth] Failed to set active session for already complete sign up:", err);
          setError("Your account is already verified. Please sign in or restart the app.");
          return;
        }
      } else {
        setError("Your account is already verified. Please sign in or restart the app.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    
    try {
      const completeResult = await signUp.attemptPhoneNumberVerification({
        code: verificationCode,
      });

      if (completeResult.status === "complete" && completeResult.createdSessionId && setActive) {
        await setActive({ session: completeResult.createdSessionId });
        await setAuthMode("signedIn");
        router.push("/onboarding/trust");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      console.error("[Auth] Verification error:", err);
      
      // Extract error message from Clerk
      let errorMessage = err.errors?.[0]?.message || err.message || "Invalid verification code";
      const errorCode = err.errors?.[0]?.code || err.code;
      
      // Handle specific Clerk error cases
      if (errorCode === "form_identifier_not_found" || errorMessage.toLowerCase().includes("not found")) {
        errorMessage = "Verification session expired. Please request a new code.";
      } else if (errorCode === "form_code_incorrect" || errorMessage.toLowerCase().includes("incorrect") || errorMessage.toLowerCase().includes("invalid")) {
        errorMessage = "The verification code is incorrect. Please check and try again.";
      } else if (errorCode === "form_param_format_invalid" || errorMessage.toLowerCase().includes("format")) {
        errorMessage = "Invalid code format. Please enter a 6-digit code.";
      } else if (errorMessage.toLowerCase().includes("expired") || errorMessage.toLowerCase().includes("timeout")) {
        errorMessage = "The verification code has expired. Please request a new code.";
      } else if (errorMessage.toLowerCase().includes("already") && errorMessage.toLowerCase().includes("verified")) {
        errorMessage = "This code has already been used. Please request a new code.";
      } else if (errorMessage.toLowerCase().includes("too many") || errorMessage.toLowerCase().includes("rate limit")) {
        errorMessage = "Too many attempts. Please wait a moment and request a new code.";
      } else if (errorMessage.toLowerCase().includes("session") && errorMessage.toLowerCase().includes("expired")) {
        errorMessage = "Your verification session has expired. Please start over.";
      }
      
      setError(errorMessage);
      setFailedAttempts((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    // Check if cooldown is active
    if (resendCooldown > 0) {
      return; // Don't allow resend during cooldown
    }

    if (!signUp) {
      setError("Sign up session expired. Please start over.");
      return;
    }

    // Check if signUp is already complete
    if (signUp.status === "complete") {
      if (signUp.createdSessionId && setActive) {
        try {
          await setActive({ session: signUp.createdSessionId });
          await setAuthMode("signedIn");
          router.push("/onboarding/trust");
          return;
        } catch (err) {
          console.warn("[Auth] Failed to set active session:", err);
          setError("Your account is already verified. Please sign in or restart the app.");
          return;
        }
      } else {
        setError("Your account is already verified. Please sign in or restart the app.");
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    setVerificationCode(""); // Clear existing code when resending
    
    try {
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      setResendCooldown(30); // Start 30 second cooldown
      Alert.alert("Code Sent", "A new verification code has been sent to your phone.");
    } catch (err: any) {
      console.error("[Auth] Resend code error:", err);
      let errorMessage = err.errors?.[0]?.message || err.message || "Failed to resend code";
      
      // Handle specific errors
      if (errorMessage.toLowerCase().includes("session") && errorMessage.toLowerCase().includes("expired")) {
        errorMessage = "Your verification session has expired. Please start over.";
      } else if (errorMessage.toLowerCase().includes("rate limit") || errorMessage.toLowerCase().includes("too many")) {
        errorMessage = "Too many requests. Please wait a moment before requesting a new code.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/trust");
  };

  // Country picker modal
  const renderCountryPicker = () => (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.radii.lg,
          padding: theme.spacing(2),
          width: "80%",
          maxHeight: "60%",
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.subheading,
            fontFamily: "Inter_600SemiBold",
            marginBottom: theme.spacing(2),
            textAlign: "center",
          }}
        >
          Select Country
        </Text>
        <ScrollView>
          {COUNTRY_CODES.map((item) => (
            <TouchableOpacity
              key={`${item.code}-${item.country}`}
              onPress={async () => {
                setCountryCodeLocal(item.code);
                setSelectedCountry(item.country);
                await setPhoneNumber(phoneNumber, item.code);
                setShowCountryPicker(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: theme.spacing(1.5),
                borderRadius: theme.radii.md,
                backgroundColor: countryCode === item.code && selectedCountry === item.country ? theme.colors.primary + "20" : "transparent",
              }}
            >
              <Text style={{ fontSize: 24, marginRight: theme.spacing(1.5) }}>{item.flag}</Text>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.typography.body,
                  fontFamily: "Inter_400Regular",
                  flex: 1,
                }}
              >
                {item.country}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.body,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {item.code}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          onPress={() => setShowCountryPicker(false)}
          style={{
            marginTop: theme.spacing(2),
            padding: theme.spacing(1.5),
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.body,
              fontFamily: "Inter_500Medium",
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Static elements - same position on all screens so they appear fixed */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={4} totalSteps={8} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton 
            onPress={() => {
              if (showVerificationForm) {
                setShowVerificationForm(false);
                setVerificationCode("");
                setError(null);
                setResendCooldown(0); // Reset cooldown when going back
                hasAttemptedAutoNavigateRef.current = false; // Reset navigation attempt ref when going back
              } else {
                router.back();
              }
            }}
          />
        </View>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <GlassCard
            intensity="medium"
            radius="lg"
            style={{
              ...styles.card,
              padding: theme.spacing(3),
            }}
          >
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: theme.typography.heading,
                  marginBottom: theme.spacing(3),
                },
              ]}
            >
              What's your phone number?
            </Text>

            {showVerificationForm ? (
              <View style={styles.phoneForm}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.text,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: theme.typography.subheading,
                      marginBottom: theme.spacing(1),
                    },
                  ]}
                >
                  Enter Verification Code
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: "Inter_400Regular",
                      fontSize: theme.typography.body,
                      marginBottom: theme.spacing(2),
                    },
                  ]}
                >
                  We sent a 6-digit code to {getFullPhoneNumber()}
                </Text>

                <TextInput
                  placeholder="000000"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[
                    styles.input,
                    styles.verificationInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                      borderRadius: theme.radii.md,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: theme.typography.heading,
                    },
                  ]}
                />

                <OnboardingCTA
                  label="Verify Code"
                  onPress={handleVerifyCode}
                  variant="primary"
                  loading={loading}
                  disabled={loading || verificationCode.length < 6}
                />

                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={loading || resendCooldown > 0}
                  style={{ marginTop: theme.spacing(2) }}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: theme.typography.caption,
                      textAlign: "center",
                      fontFamily: "Inter_500Medium",
                      opacity: loading || resendCooldown > 0 ? 0.5 : 1,
                    }}
                  >
                    {resendCooldown > 0 ? `Request again in ${resendCooldown}s` : "Resend Code"}
                  </Text>
                </TouchableOpacity>

                {error && (
                  <View
                    style={[
                      styles.errorContainer,
                      {
                        marginTop: theme.spacing(2),
                        padding: theme.spacing(1.5),
                        backgroundColor: theme.colors.danger + "20",
                        borderRadius: theme.radii.md,
                        borderWidth: 1,
                        borderColor: theme.colors.danger,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.errorText,
                        {
                          color: theme.colors.danger,
                          fontSize: theme.typography.caption,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {error}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.phoneForm}>
                {/* Phone Number Input */}
                <View style={{ flexDirection: "row", gap: theme.spacing(1), marginBottom: theme.spacing(2) }}>
                  <TouchableOpacity
                    onPress={() => setShowCountryPicker(true)}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radii.md,
                      padding: theme.spacing(2),
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing(0.5),
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>
                      {getDisplayFlag()}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      {countryCode}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    placeholder="Phone Number"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formatPhone(phoneNumber)}
                    onChangeText={async (text) => {
                      const cleaned = text.replace(/\D/g, "");
                      const maxLength = getMaxPhoneLength(countryCode);
                      const newPhone = cleaned.slice(0, maxLength);
                      setPhoneNumberLocal(newPhone);
                      await setPhoneNumber(newPhone, countryCode);
                    }}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    maxLength={getDisplayMaxLength(countryCode)}
                    style={{
                      flex: 1,
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radii.md,
                      padding: theme.spacing(2),
                      color: theme.colors.text,
                      fontSize: theme.typography.body,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      fontFamily: "Inter_400Regular",
                    }}
                  />
                </View>

                <OnboardingCTA
                  label="Continue with Phone"
                  onPress={handlePhoneSignUp}
                  variant="primary"
                  loading={loading}
                  disabled={loading || !phoneNumber}
                />

                {error && (
                  <View
                    style={[
                      styles.errorContainer,
                      {
                        marginTop: theme.spacing(2),
                        padding: theme.spacing(1.5),
                        backgroundColor: theme.colors.danger + "20",
                        borderRadius: theme.radii.md,
                        borderWidth: 1,
                        borderColor: theme.colors.danger,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.errorText,
                        {
                          color: theme.colors.danger,
                          fontSize: theme.typography.caption,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {error}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
              </View>
            )}
          </GlassCard>
        </ScrollView>
        </KeyboardAvoidingView>
        
        {/* Country Picker Modal */}
        {showCountryPicker && renderCountryPicker()}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  progressContainer: {
    width: "100%",
  },
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 8,
    justifyContent: "flex-start",
  },
  card: {
    width: "100%",
  },
  title: {
    textAlign: "left",
  },
  subtitle: {
    textAlign: "center",
  },
  errorContainer: {
    width: "100%",
  },
  errorText: {
    textAlign: "center",
  },
  skipText: {
    textDecorationLine: "underline",
  },
  phoneForm: {
    marginTop: 16,
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  input: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  verificationInput: {
    textAlign: "center",
    letterSpacing: 8,
  },
});
