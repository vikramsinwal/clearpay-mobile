export type CustomerProfile = {
  displayName?: string;
  avatarUrl?: string;
  locale?: string;
  timezone?: string;
  /** Payment receiving UPI ID — not a login credential. */
  upiId?: string;
  /** Linked Telegram username without leading @. Empty when disconnected. */
  telegramUsername?: string;
};

export type CustomerPreferences = {
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
};

export type PublicCustomer = {
  publicId: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  profile?: CustomerProfile;
  preferences?: CustomerPreferences;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerAuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer' | string;
  expiresIn: number;
};

export type CustomerAuthPayload = {
  customer: PublicCustomer;
  tokens: CustomerAuthTokens;
};

export type RegisterCustomerInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  deviceLabel?: string;
};

export type CustomerLoginInput = {
  email: string;
  password: string;
  deviceLabel?: string;
};

export type UpdateCustomerProfileInput = {
  name?: string;
  /** E.164-style phone, or `null` to clear. */
  phone?: string | null;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    locale?: string;
    timezone?: string;
    upiId?: string;
    telegramUsername?: string;
  };
  preferences?: CustomerPreferences;
};
