// Phone number formatting configurations for different countries
// Format: { maxLength: number, format: (digits: string) => string }

export interface PhoneFormatConfig {
  maxLength: number;
  format: (digits: string) => string;
}

// Phone number formatting patterns by country code
export const PHONE_FORMATS: Record<string, PhoneFormatConfig> = {
  // North America (US, Canada) - 10 digits: (XXX) XXX-XXXX
  "+1": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return `(${digits}`;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    },
  },

  // UK - 10 digits: XXXX XXX XXXX
  "+44": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    },
  },

  // Germany - 11 digits: XXXX XXXXXXXXX or 0XXX XXXXXXXX
  "+49": {
    maxLength: 11,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9, 11)}`;
    },
  },

  // France - 9 digits: XX XX XX XX XX
  "+33": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      const parts: string[] = [];
      for (let i = 0; i < digits.length; i += 2) {
        parts.push(digits.slice(i, i + 2));
      }
      return parts.join(" ");
    },
  },

  // Italy - 9-10 digits: XXX XXX XXXX or XXXX XXX XXX
  "+39": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
      return digits;
    },
  },

  // Spain - 9 digits: XXX XXX XXX
  "+34": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
    },
  },

  // Australia - 9 digits: XXXX XXX XXX
  "+61": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)}`;
    },
  },

  // China - 11 digits: XXX XXXX XXXX
  "+86": {
    maxLength: 11,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
    },
  },

  // India - 10 digits: XXXXX XXXXX
  "+91": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 5) return digits;
      return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
    },
  },

  // Japan - 10-11 digits: XX-XXXX-XXXX or XXX-XXXX-XXXX
  "+81": {
    maxLength: 11,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    },
  },

  // Brazil - 10-11 digits: (XX) XXXX-XXXX or (XX) XXXXX-XXXX
  "+55": {
    maxLength: 11,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return `(${digits}`;
      if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    },
  },

  // Mexico - 10 digits: XX XXXX XXXX
  "+52": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
    },
  },

  // Russia - 10 digits: XXX XXX-XX-XX
  "+7": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
    },
  },

  // South Korea - 10-11 digits: XXX-XXXX-XXXX or XXX-XXXX-XXXX
  "+82": {
    maxLength: 11,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 10)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    },
  },

  // Netherlands - 9 digits: XX XXXXXXX
  "+31": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      return `${digits.slice(0, 2)} ${digits.slice(2, 9)}`;
    },
  },

  // Sweden - 9 digits: XX-XXX XX XX
  "+46": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 7) return `${digits.slice(0, 2)}-${digits.slice(2, 5)} ${digits.slice(5)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
    },
  },

  // Poland - 9 digits: XXX XXX XXX
  "+48": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
    },
  },

  // Turkey - 10 digits: XXX XXX XX XX
  "+90": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
    },
  },

  // Argentina - 10 digits: XX XXXX-XXXX
  "+54": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    },
  },

  // South Africa - 9 digits: XX XXX XXXX
  "+27": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
    },
  },

  // Egypt - 10 digits: XXXX XXX XXXX
  "+20": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    },
  },

  // Nigeria - 10 digits: XXXX XXX XXXX
  "+234": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    },
  },

  // Philippines - 10 digits: XXXX XXX XXXX
  "+63": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    },
  },

  // Indonesia - 9-11 digits: XXX-XXXX-XXXX or XXXX-XXXX-XXXX
  "+62": {
    maxLength: 11,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 10)}`;
      return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 11)}`;
    },
  },

  // Thailand - 9 digits: XX-XXX-XXXX
  "+66": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
    },
  },

  // Vietnam - 9-10 digits: XXX XXXX XXX or XXXX XXX XXX
  "+84": {
    maxLength: 10,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 10)}`;
      return digits;
    },
  },

  // Saudi Arabia - 9 digits: XX XXX XXXX
  "+966": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
    },
  },

  // UAE - 9 digits: XX XXX XXXX
  "+971": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
    },
  },

  // Israel - 9 digits: XX-XXX-XXXX
  "+972": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
    },
  },

  // Singapore - 8 digits: XXXX XXXX
  "+65": {
    maxLength: 8,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
    },
  },

  // Hong Kong - 8 digits: XXXX XXXX
  "+852": {
    maxLength: 8,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
    },
  },

  // New Zealand - 8-9 digits: XXXX XXXX or XXXX XXX XXXX
  "+64": {
    maxLength: 9,
    format: (digits: string) => {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return digits;
      if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)}`;
    },
  },
};

// Default format for countries not in the list
const DEFAULT_FORMAT: PhoneFormatConfig = {
  maxLength: 15, // ITU-T E.164 max length
  format: (digits: string) => {
    // Simple grouping: XXX XXX XXX XXX...
    if (digits.length === 0) return "";
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 3) {
      parts.push(digits.slice(i, i + 3));
    }
    return parts.join(" ");
  },
};

/**
 * Get phone format configuration for a country code
 */
export function getPhoneFormat(countryCode: string): PhoneFormatConfig {
  return PHONE_FORMATS[countryCode] || DEFAULT_FORMAT;
}

/**
 * Format phone number for display based on country code
 */
export function formatPhoneForDisplay(phone: string, countryCode: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const config = getPhoneFormat(countryCode);
  return config.format(cleaned);
}

/**
 * Get maximum length for a country code
 */
export function getMaxPhoneLength(countryCode: string): number {
  const config = getPhoneFormat(countryCode);
  return config.maxLength;
}

/**
 * Get display max length (including formatting characters)
 * This calculates the actual formatted length for known formats
 */
export function getDisplayMaxLength(countryCode: string): number {
  const config = getPhoneFormat(countryCode);
  
  // For known formats, calculate the actual formatted length
  if (PHONE_FORMATS[countryCode]) {
    // Format a number with max digits to get the actual formatted length
    const maxDigits = "9".repeat(config.maxLength);
    const formatted = config.format(maxDigits);
    return formatted.length;
  }
  
  // For default format, estimate: maxLength digits + spaces (roughly maxLength/3)
  // E.164 max is 15 digits, so worst case is about 20 characters with formatting
  return config.maxLength + 5;
}

