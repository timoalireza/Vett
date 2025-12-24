import { useState, useEffect } from "react";
import { Text, TouchableOpacity, View, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSignIn, useSignUp, useOAuth, useUser } from "@clerk/clerk-expo";
import * as LinkingModule from "expo-linking";

import { useAppState } from "../src/state/app-state";
import { useTheme } from "../src/hooks/use-theme";
import { GradientBackground } from "../src/components/GradientBackground";
import { GlassCard } from "../src/components/GlassCard";
import { OnboardingBackButton } from "../src/components/Onboarding/OnboardingBackButton";
import { formatPhoneForDisplay, getMaxPhoneLength, getDisplayMaxLength } from "../src/utils/phone-formatter";

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
  { code: "+972", country: "Israel", flag: "🇮🇱" },
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

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { setAuthMode } = useAppState();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });
  const { user } = useUser();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [selectedCountry, setSelectedCountry] = useState("United States");
  const [verificationCode, setVerificationCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerificationCode, setShowVerificationCode] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown in seconds

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

  // Check if passkey is available
  const isPasskeyAvailable = signIn && typeof (signIn as any).authenticateWithPasskey === "function";

  // Handle passkey sign in
  const handlePasskeySignIn = async () => {
    if (!signInLoaded || !signIn) {
      Alert.alert("Error", "Authentication service is not ready. Please wait a moment and try again.");
      return;
    }

    if (!isPasskeyAvailable) {
      Alert.alert(
        "Passkey Not Available",
        "Passkey authentication is not available. Please sign in with your phone number or social login instead."
      );
      return;
    }

    setLoading(true);
    try {
      // Use Clerk's passkey authentication
      const result = await (signIn as any).authenticateWithPasskey();

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        await setAuthMode("signedIn");
        router.replace("/(tabs)/analyze");
      } else {
        Alert.alert("Error", "Passkey authentication incomplete. Please try again.");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || err.message || "Failed to authenticate with passkey.";
      
      // Check if passkey is not available on this device
      if (errorMessage.toLowerCase().includes("not supported") || 
          errorMessage.toLowerCase().includes("not available") ||
          errorMessage.toLowerCase().includes("no passkey")) {
        Alert.alert(
          "Passkey Not Available",
          "Passkeys are not available on this device. Please sign in with your phone number instead."
        );
      } else {
        Alert.alert("Authentication Error", errorMessage);
      }
      console.error("Passkey sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle phone sign in
  const handlePhoneSignIn = async () => {
    if (!signInLoaded || !signIn) {
      const errorMsg = "Authentication service is not ready. Please wait a moment and try again.";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      return;
    }

    const fullPhone = getFullPhoneNumber();
    const cleaned = phoneNumber.replace(/\D/g, "");
    const maxLength = getMaxPhoneLength(countryCode);
    const minLength = Math.max(7, Math.floor(maxLength * 0.7)); // At least 70% of max length or 7 digits
    
    if (!cleaned || cleaned.length < minLength || cleaned.length > maxLength) {
      const errorMsg = `Please enter a valid phone number (${minLength}-${maxLength} digits)`;
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      return;
    }

    setError("");
    setLoading(true);
    try {
      // Create sign in with phone number
      const result = await signIn.create({
        identifier: fullPhone,
      });

      console.log("[SignIn] Sign in created:", {
        status: result.status,
        supportedFirstFactors: result.supportedFirstFactors?.map((f: any) => f.strategy),
        identifier: fullPhone
      });

      // Prepare phone code verification
      const phoneCodeFactor = result.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "phone_code"
      );

      if (phoneCodeFactor) {
        const prepareResult = await signIn.prepareFirstFactor({
          strategy: "phone_code",
          phoneNumberId: (phoneCodeFactor as any).phoneNumberId,
        });

        console.log("[SignIn] Prepare first factor result:", {
          status: prepareResult.status,
          signInStatus: signIn.status
        });

        setShowVerificationCode(true);
        setError("");
        setResendCooldown(60); // Start 60 second cooldown (matches Clerk's rate limit)
        Alert.alert(
          "Verification Code Sent",
          `We sent a 6-digit code to ${fullPhone}`
        );
      } else {
        console.warn("[SignIn] No phone_code factor available:", result.supportedFirstFactors);
        const errorMsg = "Phone verification is not available for this account. Please try signing up instead.";
        setError(errorMsg);
        Alert.alert("Error", errorMsg);
      }
    } catch (err: any) {
      console.error("[SignIn] Phone sign in error:", err);
      let errorMessage = err.errors?.[0]?.message || err.message || "Failed to sign in. Please try again.";
      const errorCode = err.errors?.[0]?.code;
      
      // Handle "identifier not found" - user doesn't exist, suggest sign up
      if (errorCode === "form_identifier_not_found" || errorMessage.toLowerCase().includes("couldn't find your account") || errorMessage.toLowerCase().includes("identifier not found")) {
        errorMessage = "No account found with this phone number. Please sign up instead.";
      }
      
      setError(errorMessage);
      Alert.alert("Sign In Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle phone sign up
  const handlePhoneSignUp = async () => {
    if (!signUpLoaded || !signUp) {
      const errorMsg = "Authentication service is not ready. Please wait a moment and try again.";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      return;
    }

    const fullPhone = getFullPhoneNumber();
    const cleaned = phoneNumber.replace(/\D/g, "");
    const maxLength = getMaxPhoneLength(countryCode);
    const minLength = Math.max(7, Math.floor(maxLength * 0.7)); // At least 70% of max length or 7 digits
    
    if (!cleaned || cleaned.length < minLength || cleaned.length > maxLength) {
      const errorMsg = `Please enter a valid phone number (${minLength}-${maxLength} digits)`;
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      return;
    }

    if (!firstName.trim()) {
      const errorMsg = "Please enter your first name";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      return;
    }

    setError("");
    setLoading(true);
    try {
      // Create sign up with phone number
      await signUp.create({
        phoneNumber: fullPhone,
        firstName: firstName.trim(),
      });

      // Prepare phone verification
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });

      setShowVerificationCode(true);
      setError("");
      setResendCooldown(60); // Start 60 second cooldown (matches Clerk's rate limit)
      Alert.alert(
        "Verification Code Sent",
        `We sent a 6-digit code to ${fullPhone}`
      );
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || err.message || "Failed to sign up. Please try again.";
      setError(errorMessage);
      Alert.alert("Sign Up Error", errorMessage);
      console.error("Phone sign up error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code submission
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      const errorMsg = "Please enter a valid 6-digit verification code";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      return;
    }

    console.log("[SignIn] Attempting verification:", {
      isSignUp,
      codeLength: verificationCode.length,
      signInStatus: signIn?.status,
      signUpStatus: signUp?.status,
      hasSignIn: !!signIn,
      hasSignUp: !!signUp
    });

    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        // Verify sign up
        if (!signUp) {
          const errorMsg = "Sign up session expired. Please try again.";
          setError(errorMsg);
          Alert.alert("Error", errorMsg);
          return;
        }

        // Check if signUp is already complete
        if (signUp.status === "complete") {
          // If already complete, try to set active session
          if (signUp.createdSessionId && setActive) {
            try {
              await setActive({ session: signUp.createdSessionId });
              await setAuthMode("signedIn");
              setShowVerificationCode(false);
              setVerificationCode("");
              router.replace("/(tabs)/analyze");
              return;
            } catch (err) {
              console.warn("Failed to set active session for already complete sign up:", err);
              const errorMsg = "Your account is already verified. Please sign in or restart the app.";
              setError(errorMsg);
              Alert.alert("Error", errorMsg);
              return;
            }
          } else {
            const errorMsg = "Your account is already verified. Please sign in or restart the app.";
            setError(errorMsg);
            Alert.alert("Error", errorMsg);
            return;
          }
        }

        const completeResult = await signUp.attemptPhoneNumberVerification({
          code: verificationCode,
        });

        console.log("[SignIn] Sign up verification result:", {
          resultStatus: completeResult.status,
          hasSessionId: !!completeResult.createdSessionId,
          signUpStatus: signUp.status,
          signUpSessionId: signUp.createdSessionId
        });

        // Use the verification attempt result as the sole source of truth
        const isComplete = completeResult.status === "complete";
        const sessionId = completeResult.createdSessionId;

        if (isComplete && sessionId) {
          if (!setActive) {
            const errorMsg = "Unable to activate session. Please try again.";
            setError(errorMsg);
            Alert.alert("Error", errorMsg);
            console.error("[SignIn] setActive is not available");
            return;
          }
          
          try {
            await setActive({ session: sessionId });
            await setAuthMode("signedIn");
            setShowVerificationCode(false);
            setVerificationCode("");
            router.replace("/(tabs)/analyze");
          } catch (activeErr: any) {
            console.error("[SignIn] Failed to set active session:", activeErr);
            const errorMsg = activeErr.errors?.[0]?.message || activeErr.message || "Failed to activate session. Please try again.";
            setError(errorMsg);
            Alert.alert("Error", errorMsg);
          }
        } else {
          // Log the actual result to help debug
          console.warn("[SignIn] Verification incomplete:", {
            resultStatus: completeResult.status,
            signUpStatus: signUp.status,
            hasSessionId: !!sessionId,
            hasSetActive: !!setActive
          });
          const errorMsg = "Verification incomplete. Please try again.";
          setError(errorMsg);
          Alert.alert("Error", errorMsg);
        }
      } else {
        // Verify sign in
        if (!signIn) {
          const errorMsg = "Sign in session expired. Please try again.";
          setError(errorMsg);
          Alert.alert("Error", errorMsg);
          return;
        }

        // Check if signIn is already complete (shouldn't happen, but handle it)
        if (signIn.status === "complete") {
          console.log("[SignIn] Sign in already complete, activating session");
          if (signIn.createdSessionId && setActive) {
            try {
              await setActive({ session: signIn.createdSessionId });
              await setAuthMode("signedIn");
              setShowVerificationCode(false);
              setVerificationCode("");
              router.replace("/(tabs)/analyze");
              return;
            } catch (err) {
              console.warn("[SignIn] Failed to activate already-complete session:", err);
              const errorMsg = "Your account is already verified. Please restart the app.";
              setError(errorMsg);
              Alert.alert("Error", errorMsg);
              return;
            }
          } else {
            // SignIn is complete but missing session ID or setActive - can't proceed
            console.warn("[SignIn] Sign in complete but missing session ID or setActive:", {
              hasSessionId: !!signIn.createdSessionId,
              hasSetActive: !!setActive
            });
            const errorMsg = "Your account is already verified but we couldn't activate your session. Please restart the app.";
            setError(errorMsg);
            Alert.alert("Error", errorMsg);
            return;
          }
        }

        // Verify signIn is in correct state for verification
        if (signIn.status !== "needs_first_factor") {
          console.warn("[SignIn] Unexpected signIn status before verification:", signIn.status);
        }

        const completeResult = await signIn.attemptFirstFactor({
          strategy: "phone_code",
          code: verificationCode,
        });

        console.log("[SignIn] Sign in verification result:", {
          resultStatus: completeResult.status,
          resultSessionId: completeResult.createdSessionId,
          signInStatus: signIn.status,
          signInSessionId: signIn.createdSessionId
        });

        // Check for completion - session ID can be on either the result or signIn object
        const isComplete = completeResult.status === "complete" || signIn.status === "complete";
        const sessionId = completeResult.createdSessionId || signIn.createdSessionId;

        if (isComplete && sessionId) {
          if (!setActive) {
            const errorMsg = "Unable to activate session. Please try again.";
            setError(errorMsg);
            Alert.alert("Error", errorMsg);
            console.error("[SignIn] setActive is not available");
            return;
          }
          
          try {
            await setActive({ session: sessionId });
            await setAuthMode("signedIn");
            setShowVerificationCode(false);
            setVerificationCode("");
            router.replace("/(tabs)/analyze");
          } catch (activeErr: any) {
            console.error("[SignIn] Failed to set active session:", activeErr);
            const errorMsg = activeErr.errors?.[0]?.message || activeErr.message || "Failed to activate session. Please try again.";
            setError(errorMsg);
            Alert.alert("Error", errorMsg);
          }
        } else if (completeResult.status === "needs_second_factor") {
          const errorMsg = "Please complete additional verification steps.";
          setError(errorMsg);
          Alert.alert(
            "Two-Factor Authentication",
            errorMsg
          );
        } else if (isComplete && !sessionId) {
          // Verification complete but no session - this shouldn't happen but let's handle it
          console.warn("[SignIn] Verification complete but no session ID:", {
            resultStatus: completeResult.status,
            signInStatus: signIn.status
          });
          const errorMsg = "Verification succeeded but session creation failed. Please try signing in again.";
          setError(errorMsg);
          Alert.alert("Error", errorMsg);
        } else if (completeResult.status === "needs_identifier") {
          // Session was reset, need to start over
          console.warn("[SignIn] Session needs identifier - was reset");
          const errorMsg = "Your sign-in session was reset. Please go back and try again.";
          setError(errorMsg);
          Alert.alert("Session Expired", errorMsg);
        } else if (completeResult.status === "needs_first_factor") {
          // Code might be wrong, but Clerk didn't throw - try requesting new code
          console.warn("[SignIn] Still needs first factor after verification attempt");
          const errorMsg = "The verification code may be incorrect or expired. Please request a new code.";
          setError(errorMsg);
          Alert.alert("Verification Failed", errorMsg);
        } else {
          // Log the actual result to help debug
          console.warn("[SignIn] Verification returned unexpected status:", {
            resultStatus: completeResult.status,
            signInStatus: signIn.status,
            hasResultSessionId: !!completeResult.createdSessionId,
            hasSignInSessionId: !!signIn.createdSessionId,
            hasSetActive: !!setActive,
            fullResult: JSON.stringify(completeResult, null, 2)
          });
          const errorMsg = `Verification failed (status: ${completeResult.status}). Please try again or request a new code.`;
          setError(errorMsg);
          Alert.alert("Error", errorMsg);
        }
      }
    } catch (err: any) {
      console.error("[SignIn] Verification error:", err);
      
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
      } else if (errorMessage.toLowerCase().includes("session") && errorMessage.toLowerCase().includes("expired")) {
        errorMessage = "Your verification session has expired. Please start over.";
      } else if (errorMessage.toLowerCase().includes("expired") || errorMessage.toLowerCase().includes("timeout")) {
        errorMessage = "The verification code has expired. Please request a new code.";
      } else if (errorMessage.toLowerCase().includes("already") && errorMessage.toLowerCase().includes("verified")) {
        errorMessage = "This code has already been used. Please request a new code.";
      } else if (errorMessage.toLowerCase().includes("too many") || errorMessage.toLowerCase().includes("rate limit")) {
        errorMessage = "Too many attempts. Please wait a moment and request a new code.";
      }
      
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
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

    setError("");
    setLoading(true);
    try {
      if (isSignUp && signUp) {
        await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      } else if (!isSignUp && signIn) {
        const phoneCodeFactor = signIn.supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "phone_code"
        );
        if (phoneCodeFactor) {
          await signIn.prepareFirstFactor({
            strategy: "phone_code",
            phoneNumberId: (phoneCodeFactor as any).phoneNumberId,
          });
        }
      }
      setResendCooldown(60); // Start 60 second cooldown (matches Clerk's rate limit)
      Alert.alert("Code Sent", "A new verification code has been sent to your phone.");
    } catch (err: any) {
      console.error("[SignIn] Resend code error:", err);
      let errorMessage = err.errors?.[0]?.message || err.message || "Failed to resend code";
      const errorCode = err.errors?.[0]?.code || err.code;
      
      // Handle rate limiting - extract retry-after or use default 60 seconds
      if (
        errorCode === "rate_limit_exceeded" ||
        errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.toLowerCase().includes("too many") ||
        errorMessage.toLowerCase().includes("too many requests")
      ) {
        // Try to extract retry-after from error metadata or use default 60 seconds
        const retryAfter = err.retryAfter || err.retry_after || err.metadata?.retryAfter || 60;
        setResendCooldown(Math.max(60, retryAfter)); // Use at least 60 seconds
        errorMessage = `Too many requests. Please wait ${Math.max(60, retryAfter)} seconds before requesting a new code.`;
      } else if (errorMessage.toLowerCase().includes("session") && errorMessage.toLowerCase().includes("expired")) {
        errorMessage = "Your verification session has expired. Please start over.";
      }
      
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    try {
      setLoading(true);
      const startOAuth = strategy === "oauth_google" ? startGoogleOAuth : startAppleOAuth;

      const { createdSessionId } = await startOAuth({
        redirectUrl: LinkingModule.createURL("/(tabs)/analyze", { scheme: "vett" })
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await setAuthMode("signedIn");
        router.replace("/(tabs)/analyze");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || err.message || `Failed to sign in with ${strategy === "oauth_google" ? "Google" : "Apple"}`;
      Alert.alert("Error", errorMessage);
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
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
              onPress={() => {
                setCountryCode(item.code);
                setSelectedCountry(item.country);
                setShowCountryPicker(false);
                setError("");
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
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: theme.spacing(2.5), paddingTop: theme.spacing(2), paddingBottom: theme.spacing(1) }}>
          <OnboardingBackButton onPress={() => router.back()} />
        </View>
        <View
          style={{
            flex: 1,
            padding: theme.spacing(4),
            justifyContent: "center"
          }}
        >
          <GlassCard
            style={{
              padding: theme.spacing(3),
              gap: theme.spacing(2)
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.heading + 8,
                fontFamily: "Inter_600SemiBold",
                textAlign: "center",
                marginBottom: theme.spacing(2)
              }}
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </Text>

            {/* Verification Code Input */}
            {showVerificationCode ? (
              <>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.typography.subheading,
                    fontFamily: "Inter_600SemiBold",
                    marginBottom: theme.spacing(1)
                  }}
                >
                  Enter Verification Code
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.body,
                    fontFamily: "Inter_400Regular",
                    marginBottom: theme.spacing(2)
                  }}
                >
                  We sent a 6-digit code to {getFullPhoneNumber()}
                </Text>
                <TextInput
                  placeholder="000000"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: theme.radii.md,
                    padding: theme.spacing(2),
                    color: theme.colors.text,
                    fontSize: theme.typography.heading,
                    fontFamily: "Inter_600SemiBold",
                    letterSpacing: 8,
                    textAlign: "center",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    marginBottom: theme.spacing(2)
                  }}
                />
                <TouchableOpacity
                  onPress={handleVerifyCode}
                  disabled={loading || verificationCode.length < 6}
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radii.pill,
                    padding: theme.spacing(2),
                    alignItems: "center",
                    opacity: loading || verificationCode.length < 6 ? 0.5 : 1,
                    marginBottom: theme.spacing(1)
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: theme.typography.body,
                        fontFamily: "Inter_500Medium"
                      }}
                    >
                      Verify Code
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={loading || resendCooldown > 0}
                  style={{ marginBottom: theme.spacing(1) }}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: theme.typography.caption,
                      textAlign: "center",
                      fontFamily: "Inter_500Medium",
                      opacity: loading || resendCooldown > 0 ? 0.5 : 1
                    }}
                  >
                    {resendCooldown > 0 ? `Request again in ${resendCooldown}s` : "Resend Code"}
                  </Text>
                </TouchableOpacity>

                {error && showVerificationCode && (
                  <TouchableOpacity
                    onPress={() => setError("")}
                    style={{
                      backgroundColor: "#FF3B30",
                      borderRadius: theme.radii.md,
                      padding: theme.spacing(2),
                      alignItems: "center",
                      marginTop: theme.spacing(1)
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: theme.typography.body,
                        fontFamily: "Inter_500Medium",
                        textAlign: "center"
                      }}
                    >
                      {error}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setShowVerificationCode(false);
                    setVerificationCode("");
                    setError("");
                    setResendCooldown(0); // Reset cooldown when going back
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.caption,
                      textAlign: "center",
                      fontFamily: "Inter_400Regular"
                    }}
                  >
                    Back
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Sign Up Form */}
                {isSignUp ? (
                  <>
                      <TextInput
                      placeholder="First Name"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(text);
                        if (error) setError("");
                      }}
                      autoCapitalize="words"
                      autoComplete="given-name"
                      style={{
                        backgroundColor: theme.colors.card,
                        borderRadius: theme.radii.md,
                        padding: theme.spacing(2),
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        borderWidth: 1,
                        borderColor: theme.colors.border
                      }}
                    />

                    {/* Phone Number Input */}
                    <View style={{ flexDirection: "row", gap: theme.spacing(1) }}>
                      <TouchableOpacity
                        onPress={() => setShowCountryPicker(true)}
                        style={{
                          backgroundColor: theme.colors.card,
                          borderRadius: theme.radii.md,
                          padding: theme.spacing(2),
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: theme.spacing(0.5)
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>
                          {getDisplayFlag()}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: theme.typography.body,
                            fontFamily: "Inter_400Regular"
                          }}
                        >
                          {countryCode}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TextInput
                        placeholder="Phone Number"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formatPhone(phoneNumber)}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/\D/g, "");
                          const maxLength = getMaxPhoneLength(countryCode);
                          setPhoneNumber(cleaned.slice(0, maxLength));
                          if (error) setError("");
                        }}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        maxLength={getDisplayMaxLength(countryCode)}
                        style={{
                          flex: 1,
                          backgroundColor: theme.colors.card,
                          borderRadius: theme.radii.md,
                          padding: theme.spacing(2),
                          color: theme.colors.text,
                          fontSize: theme.typography.body,
                          borderWidth: 1,
                          borderColor: theme.colors.border
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handlePhoneSignUp}
                      disabled={loading || !phoneNumber || !firstName}
                      style={{
                        backgroundColor: theme.colors.primary,
                        borderRadius: theme.radii.pill,
                        padding: theme.spacing(2),
                        alignItems: "center",
                        opacity: loading || !phoneNumber || !firstName ? 0.5 : 1
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#000000" />
                      ) : (
                        <Text
                          style={{
                            color: "#000000",
                            fontSize: theme.typography.body,
                            fontFamily: "Inter_500Medium"
                          }}
                        >
                          Continue with Phone
                        </Text>
                      )}
                    </TouchableOpacity>

                    {error && !showVerificationCode && (
                      <TouchableOpacity
                        onPress={() => setError("")}
                        style={{
                          backgroundColor: "#FF3B30",
                          borderRadius: theme.radii.md,
                          padding: theme.spacing(2),
                          alignItems: "center",
                          marginTop: theme.spacing(1)
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: theme.typography.body,
                            fontFamily: "Inter_500Medium",
                            textAlign: "center"
                          }}
                        >
                          {error}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* OR Separator */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing(2),
                        marginVertical: theme.spacing(1)
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor: theme.colors.border
                        }}
                      />
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.caption
                        }}
                      >
                        OR
                      </Text>
                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor: theme.colors.border
                        }}
                      />
                    </View>

                    {/* Social Login Buttons - Secondary Options */}
                    <View style={{ flexDirection: "row", gap: theme.spacing(2) }}>
                      <SocialButton
                        icon="logo-apple"
                        iconColor="#000000"
                        onPress={() => handleOAuth("oauth_apple")}
                        disabled={loading}
                      />
                      <SocialButton
                        icon="logo-google"
                        iconColor="#000000"
                        onPress={() => handleOAuth("oauth_google")}
                        disabled={loading}
                      />
                    </View>

                    <TouchableOpacity onPress={() => {
                      setIsSignUp(false);
                      setError("");
                    }}>
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.caption,
                          textAlign: "center",
                          fontFamily: "Inter_400Regular"
                        }}
                      >
                        Already have an account? Sign in
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Phone Number Input - Primary Option */}
                    <View style={{ flexDirection: "row", gap: theme.spacing(1) }}>
                      <TouchableOpacity
                        onPress={() => setShowCountryPicker(true)}
                        style={{
                          backgroundColor: theme.colors.card,
                          borderRadius: theme.radii.md,
                          padding: theme.spacing(2),
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: theme.spacing(0.5)
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>
                          {getDisplayFlag()}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: theme.typography.body,
                            fontFamily: "Inter_400Regular"
                          }}
                        >
                          {countryCode}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TextInput
                        placeholder="Phone Number"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formatPhone(phoneNumber)}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/\D/g, "");
                          const maxLength = getMaxPhoneLength(countryCode);
                          setPhoneNumber(cleaned.slice(0, maxLength));
                          if (error) setError("");
                        }}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        maxLength={getDisplayMaxLength(countryCode)}
                        style={{
                          flex: 1,
                          backgroundColor: theme.colors.card,
                          borderRadius: theme.radii.md,
                          padding: theme.spacing(2),
                          color: theme.colors.text,
                          fontSize: theme.typography.body,
                          borderWidth: 1,
                          borderColor: theme.colors.border
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handlePhoneSignIn}
                      disabled={loading || !phoneNumber}
                      style={{
                        backgroundColor: theme.colors.primary,
                        borderRadius: theme.radii.pill,
                        padding: theme.spacing(2),
                        alignItems: "center",
                        opacity: loading || !phoneNumber ? 0.5 : 1
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#000000" />
                      ) : (
                        <Text
                          style={{
                            color: "#000000",
                            fontSize: theme.typography.body,
                            fontFamily: "Inter_500Medium"
                          }}
                        >
                          Continue with Phone
                        </Text>
                      )}
                    </TouchableOpacity>

                    {error && !showVerificationCode && (
                      <TouchableOpacity
                        onPress={() => setError("")}
                        style={{
                          backgroundColor: "#FF3B30",
                          borderRadius: theme.radii.md,
                          padding: theme.spacing(2),
                          alignItems: "center",
                          marginTop: theme.spacing(1)
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: theme.typography.body,
                            fontFamily: "Inter_500Medium",
                            textAlign: "center"
                          }}
                        >
                          {error}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* OR Separator */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing(2),
                        marginVertical: theme.spacing(1)
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor: theme.colors.border
                        }}
                      />
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.caption
                        }}
                      >
                        OR
                      </Text>
                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor: theme.colors.border
                        }}
                      />
                    </View>

                    {/* Social Login Buttons - Secondary Options */}
                    <View style={{ flexDirection: "row", gap: theme.spacing(2) }}>
                      <SocialButton
                        icon="logo-apple"
                        iconColor="#000000"
                        onPress={() => handleOAuth("oauth_apple")}
                        disabled={loading}
                      />
                      <SocialButton
                        icon="logo-google"
                        iconColor="#000000"
                        onPress={() => handleOAuth("oauth_google")}
                        disabled={loading}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        setIsSignUp(true);
                        setError("");
                      }}
                      style={{ marginTop: theme.spacing(1) }}
                    >
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.caption,
                          textAlign: "center",
                          fontFamily: "Inter_400Regular"
                        }}
                      >
                        Don't have an account?{" "}
                        <Text style={{ color: theme.colors.text, fontFamily: "Inter_500Medium" }}>
                          Sign up
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </GlassCard>
        </View>
        
        {/* Country Picker Modal */}
        {showCountryPicker && renderCountryPicker()}
      </SafeAreaView>
    </GradientBackground>
  );
}

function SocialButton({
  icon,
  iconColor,
  onPress,
  disabled
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: theme.spacing(1.5),
        borderRadius: theme.radii.pill,
        backgroundColor: "#FFFFFF",
        opacity: disabled ? 0.5 : 1
      }}
      accessibilityLabel={icon === "logo-apple" ? "Continue with Apple" : "Continue with Google"}
    >
      <Ionicons name={icon} size={24} color={iconColor} />
    </TouchableOpacity>
  );
}
