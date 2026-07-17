import { registry } from '../../config/openapi-registry';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendOtpSchema,
  changePasswordSchema,
  refreshSessionSchema,
  oauthSchema,
} from './auth.validator';

// Register request schemas
const RegisterInput = registry.register('RegisterInput', registerSchema.body);
const LoginInput = registry.register('LoginInput', loginSchema.body);
const ForgotPasswordInput = registry.register('ForgotPasswordInput', forgotPasswordSchema.body);
const ResetPasswordInput = registry.register('ResetPasswordInput', resetPasswordSchema.body);
const VerifyEmailInput = registry.register('VerifyEmailInput', verifyEmailSchema.body);
const ResendOtpInput = registry.register('ResendOtpInput', resendOtpSchema.body);
const ChangePasswordInput = registry.register('ChangePasswordInput', changePasswordSchema.body);
const RefreshSessionInput = registry.register('RefreshSessionInput', refreshSessionSchema.body);
const OAuthInput = registry.register('OAuthInput', oauthSchema.body);

// Register path: /auth/register
registry.registerPath({
  method: 'post',
  path: '/auth/register',
  summary: 'Register a new user account',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterInput,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
    },
    400: {
      description: 'Validation error or email already in use',
    },
  },
});

// Register path: /auth/login
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  summary: 'Authenticate user and issue tokens',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
    },
    401: {
      description: 'Invalid credentials',
    },
  },
});

// Register path: /auth/verify-email
registry.registerPath({
  method: 'post',
  path: '/auth/verify-email',
  summary: 'Verify user email using OTP',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: VerifyEmailInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Email verified successfully',
    },
    400: {
      description: 'Invalid or expired OTP',
    },
  },
});

// Register path: /auth/forgot-password
registry.registerPath({
  method: 'post',
  path: '/auth/forgot-password',
  summary: 'Request password reset OTP',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ForgotPasswordInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password reset instructions sent',
    },
  },
});

// Register path: /auth/reset-password
registry.registerPath({
  method: 'post',
  path: '/auth/reset-password',
  summary: 'Reset password using OTP',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ResetPasswordInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password reset successfully',
    },
  },
});

// Register path: /auth/resend-otp
registry.registerPath({
  method: 'post',
  path: '/auth/resend-otp',
  summary: 'Resend OTP (verification or reset)',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ResendOtpInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'OTP sent successfully',
    },
  },
});

// Register path: /auth/refresh
registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  summary: 'Refresh access and refresh tokens',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: RefreshSessionInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Tokens refreshed successfully',
    },
  },
});

// Register path: /auth/logout
registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  summary: 'Log out user session',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: RefreshSessionInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Logged out successfully',
    },
  },
});

// Register path: /auth/change-password
registry.registerPath({
  method: 'post',
  path: '/auth/change-password',
  summary: 'Change user password (authenticated)',
  tags: ['Authentication'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChangePasswordInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password changed successfully',
    },
  },
});

// Register path: /auth/logout-all
registry.registerPath({
  method: 'post',
  path: '/auth/logout-all',
  summary: 'Log out from all user devices (authenticated)',
  tags: ['Authentication'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Logged out from all devices successfully',
    },
  },
});

// Register path: /auth/oauth
registry.registerPath({
  method: 'post',
  path: '/auth/oauth',
  summary: 'Social authentication (Google/Apple)',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: OAuthInput,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'OAuth authentication successful',
    },
  },
});
