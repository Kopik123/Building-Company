export type AppVariant = 'client' | 'company';
export type MobilePlatform = 'android' | 'ios' | 'web';
export type PushProvider = 'expo' | 'fcm' | 'apns' | 'webpush';

export interface MobileSession {
  user: {
    id: string;
    role: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    companyName: string | null;
  };
  accessToken: string;
  refreshToken: string;
  legacyToken: string | null;
}

export interface PushRegistration {
  appVariant: AppVariant;
  platform: MobilePlatform;
  provider: PushProvider;
  pushToken: string;
  deviceId?: string | null;
  deviceName?: string | null;
  appVersion?: string | null;
}

export function resolveAppVariantForRole(role: string | null | undefined): AppVariant;
export function isRoleAllowedForVariant(role: string | null | undefined, appVariant: AppVariant): boolean;
export function normalizeMobileSession(value: unknown): MobileSession;
