/**
 * Profile & payment-receiving details copy.
 * UPI is for receiving payments only — never a login identifier.
 */

export const PROFILE_COPY = {
  title: 'Profile',
  personalSection: 'Personal Information',
  paymentSection: 'Payment Information',
  communicationSection: 'Communication',
  nameLabel: 'Full Name',
  namePlaceholder: 'Your full name',
  mobileLabel: 'Mobile Number',
  mobilePlaceholder: '9876543210',
  countryCodeLabel: 'Code',
  phoneVerified: 'Verified',
  phoneUnverified: 'Unverified',
  emailLabel: 'Email',
  upiLabel: 'UPI ID for Receiving Payments',
  upiPlaceholder: 'username@bank',
  upiHelper:
    'This UPI ID is used only to receive payments. It is not a login credential.',
  telegramLabel: 'Telegram Account',
  telegramConnected: 'Connected',
  telegramNotConnected: 'Not Connected',
  connectTelegram: 'Connect Telegram',
  disconnectTelegram: 'Disconnect Telegram',
  checkTelegram: 'Check Verification',
  openTelegramBot: 'Open Telegram Bot',
  telegramUsernamePlaceholder: 'your_telegram_username',
  telegramHelper:
    'Connect via the Clearpay Telegram bot, then verify your username.',
  save: 'Save Changes',
  saving: 'Saving…',
  saveSuccessTitle: 'Profile updated',
  saveSuccessBody: 'Your profile and payment receiving details were saved.',
  logout: 'Log out',
  logoutConfirmTitle: 'Log out?',
  logoutConfirmBody: 'You will need to sign in again to access your account.',
  logoutConfirmAction: 'Log out',
  logoutCancel: 'Cancel',
  loadError: 'Unable to load your profile. Pull to refresh or try again.',
} as const;

export const ACCOUNT_SETTINGS_COPY = {
  pageTitle: 'Account Settings',
  headerTitle: 'Profile',
  performanceTitle: 'Your Performance',
  periods: {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    custom: 'Custom',
  },
  traderScore: 'Trader Score',
  lastUpdated: 'Last updated',
  accountStatus: 'Account Status',
  statusManaged:
    'Status is managed by the system and cannot be changed manually.',
  profileInformation: 'Profile Information',
  paymentReceiving: 'Payment Receiving Details',
  upiUsedFor: 'Used for receiving payments',
  workingHours: 'Working Hours',
  editWorkingHours: 'Edit Working Hours',
  hoursManagedByAdmin: 'Working hours are managed by Admin.',
  myEmployees: 'My Employees',
  addEmployee: 'Add employee',
  security: 'Security',
  changePassword: 'Change Password',
  twoFactor: 'Two-Factor Authentication',
  enabled: 'Enabled',
  disabled: 'Disabled',
  enable: 'Enable',
  feeStructure: 'Fee Structure',
  feesLocked:
    'Fees are set based on your trader status and cannot be modified.',
  feesAdmin: 'Fee structure is configured by Admin.',
  apps: 'Apps',
  downloadAndroid: 'Download App for Android',
  downloadForwarder: 'Download Forwarder app',
  downloadMissing: 'This download link is not available right now.',
  dangerZone: 'Danger Zone',
  retry: 'Retry',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  change: 'Change',
  active: 'Active',
  inactive: 'Inactive',
  noEmployees: 'No employees yet.',
  noShifts: 'No shifts are configured.',
  cardError: 'Unable to load this section.',
} as const;

/** Common dial codes for the mobile country-code picker. */
export const PROFILE_COUNTRY_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+971', label: 'AE +971' },
  { code: '+65', label: 'SG +65' },
] as const;

export type ProfileCountryCode =
  (typeof PROFILE_COUNTRY_CODES)[number]['code'];
