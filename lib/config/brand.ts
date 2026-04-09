export const BrandConfig = {
  // Brand details
  name: 'M&G Jewelry',

  // Service Naming (Replaces White-Glove)
  SERVICE_NAME_EN: 'White-Glove',
  SERVICE_NAME_ES: 'Servicio White-Glove',

  // Aesthetics 
  PATTERN_ENABLED: true,
  PATTERN_OPACITY: 0.08,

  // Feature Toggles
  FEATURE_SUBSCRIPTION_ENABLED: false,

  // Contact Information
  CONTACT: {
    instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://instagram.com/mgjewelry',
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+1234567890',
    phoneNumber: process.env.NEXT_PUBLIC_PHONE_NUMBER || '+1234567890',
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@mgjewelry.com',
  }
}

