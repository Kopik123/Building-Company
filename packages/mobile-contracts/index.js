const { z } = require('zod');
const sharedV2 = require('../../shared/contracts/v2');

const APP_VARIANTS = Object.freeze(['client', 'company']);
const MOBILE_PLATFORMS = Object.freeze(['android', 'ios', 'web']);
const MOBILE_PUSH_PROVIDERS = Object.freeze(['expo', 'fcm', 'apns', 'webpush']);
const CLIENT_APP_ROLES = Object.freeze(['client']);
const COMPANY_APP_ROLES = Object.freeze(['employee', 'manager', 'admin']);
const CLIENT_APP_ROUTES = Object.freeze(['auth', 'submit_quote', 'claim_quote', 'overview', 'quotes', 'projects', 'inbox', 'notifications', 'account']);
const COMPANY_APP_ROUTES = Object.freeze(['auth', 'overview', 'projects', 'quotes', 'estimates', 'inbox', 'notifications', 'crm', 'inventory', 'account']);

const toPlainObject = (value) => (value && typeof value === 'object' ? value : {});
const toNullableString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const resolveAppVariantForRole = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  return normalizedRole === 'client' ? 'client' : 'company';
};

const getAllowedRolesForVariant = (appVariant) => (String(appVariant) === 'company' ? COMPANY_APP_ROLES : CLIENT_APP_ROLES);
const isRoleAllowedForVariant = (role, appVariant) =>
  getAllowedRolesForVariant(appVariant).includes(String(role || '').trim().toLowerCase());

const mobileSessionSchema = z.object({
  user: sharedV2.userSummarySchema.extend({
    role: z.string().min(1)
  }),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  legacyToken: z.string().nullable()
});

const pushRegistrationSchema = z.object({
  appVariant: z.enum(APP_VARIANTS),
  platform: z.enum(MOBILE_PLATFORMS),
  provider: z.enum(MOBILE_PUSH_PROVIDERS),
  pushToken: z.string().min(16),
  deviceId: z.string().nullable().optional(),
  deviceName: z.string().nullable().optional(),
  appVersion: z.string().nullable().optional()
});

const clientAppRouteSchema = z.enum(CLIENT_APP_ROUTES);
const companyAppRouteSchema = z.enum(COMPANY_APP_ROUTES);

const normalizeMobileSession = (value) => {
  const plain = toPlainObject(value);
  const nestedSession = toPlainObject(plain.v2Session);
  const sourceUser = plain.user || nestedSession.user;
  const normalizedUser = sharedV2.normalizeUserSummary(sourceUser);
  const resolvedRole = String(sourceUser?.role || normalizedUser.role || '').trim().toLowerCase() || 'client';
  const payload = {
    user: {
      ...normalizedUser,
      role: resolvedRole
    },
    accessToken: String(plain.accessToken || nestedSession.accessToken || ''),
    refreshToken: String(plain.refreshToken || nestedSession.refreshToken || ''),
    legacyToken: toNullableString(plain.legacyToken || plain.token || nestedSession.legacyToken)
  };

  return mobileSessionSchema.parse(payload);
};

module.exports = {
  ...sharedV2,
  APP_VARIANTS,
  MOBILE_PLATFORMS,
  MOBILE_PUSH_PROVIDERS,
  CLIENT_APP_ROLES,
  COMPANY_APP_ROLES,
  CLIENT_APP_ROUTES,
  COMPANY_APP_ROUTES,
  mobileSessionSchema,
  pushRegistrationSchema,
  clientAppRouteSchema,
  companyAppRouteSchema,
  resolveAppVariantForRole,
  isRoleAllowedForVariant,
  normalizeMobileSession
};

module.exports.default = module.exports;
