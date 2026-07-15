import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../core/logger/logger';

class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.initTransporter();
  }

  private async initTransporter() {
    try {
      // In development or test, we can use an Ethereal mock account if SMTP details are default
      const useEthereal =
        env.NODE_ENV !== 'production' &&
        (env.SMTP_USER === 'smtp-username' || !env.SMTP_USER);

      if (useEthereal) {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        logger.info(`📧 Ethereal Email Service initialized. User: ${testAccount.user}`);
      } else {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: env.SMTP_USER && env.SMTP_PASS ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          } : undefined,
        });
        logger.info('📧 Production SMTP Email Service initialized');
      }
    } catch (error) {
      logger.error(error as Error, '❌ Failed to initialize email transporter');
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.initTransporter();
      }

      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
      });

      logger.info(`✉️ Email sent successfully: ${info.messageId} to ${to}`);

      // If Ethereal, print the message URL
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`🔗 Ethereal preview link: ${previewUrl}`);
      }

      return true;
    } catch (error) {
      logger.error(error as Error, `❌ Failed to send email to ${to}`);
      return false;
    }
  }

  // Welcome Email
  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4A90E2;">Welcome to Enterprise, ${name}!</h2>
        <p>We are excited to have you on board. You now have access to your workspace dashboard.</p>
        <p>If you have any questions, feel free to reply to this email.</p>
        <br/>
        <p>Best Regards,<br/>The Enterprise Team</p>
      </div>
    `;
    return this.sendEmail(to, 'Welcome to Enterprise!', html);
  }

  // Verify Email (OTP or Link)
  async sendVerificationEmail(to: string, code: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4A90E2;">Verify Your Email Address</h2>
        <p>Thank you for registering. Please use the following One-Time Password (OTP) to verify your email address:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 10px 20px; background: #f4f4f4; display: inline-block; margin: 20px 0; border-radius: 4px; color: #333;">
          ${code}
        </div>
        <p>This verification code is valid for 15 minutes.</p>
        <p>If you did not make this request, you can safely ignore this email.</p>
        <br/>
        <p>Best Regards,<br/>The Enterprise Team</p>
      </div>
    `;
    return this.sendEmail(to, 'Verify Your Email Address', html);
  }

  // Forgot Password / OTP
  async sendForgotPasswordEmail(to: string, code: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #E24A4A;">Reset Your Password</h2>
        <p>You requested a password reset. Use the following code to reset your account credentials:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 10px 20px; background: #f4f4f4; display: inline-block; margin: 20px 0; border-radius: 4px; color: #333;">
          ${code}
        </div>
        <p>This password reset code will expire in 15 minutes.</p>
        <p>If you did not request this, please secure your account immediately.</p>
        <br/>
        <p>Best Regards,<br/>The Enterprise Team</p>
      </div>
    `;
    return this.sendEmail(to, 'Reset Your Password OTP', html);
  }

  // Reset Password Notification
  async sendPasswordResetConfirmation(to: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #2ecc71;">Password Changed Successfully</h2>
        <p>This is a confirmation email that the password for your account has been successfully changed.</p>
        <p>If you did not perform this change, please contact our support department immediately.</p>
        <br/>
        <p>Best Regards,<br/>The Enterprise Team</p>
      </div>
    `;
    return this.sendEmail(to, 'Security Alert: Password Changed', html);
  }

  // Generic OTP
  async sendOtpEmail(to: string, code: string, actionName: string = 'your action'): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4A90E2;">One-Time Password (OTP)</h2>
        <p>Please enter the following code to authorize ${actionName}:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 10px 20px; background: #f4f4f4; display: inline-block; margin: 20px 0; border-radius: 4px; color: #333;">
          ${code}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <br/>
        <p>Best Regards,<br/>The Enterprise Team</p>
      </div>
    `;
    return this.sendEmail(to, 'Authorize Action - OTP', html);
  }

  // Login Alert
  async sendLoginAlert(to: string, info: { ip: string; userAgent: string; time: string }): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #f39c12;">New Login Alert</h2>
        <p>We detected a new login to your account. Details are listed below:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">IP Address:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${info.ip}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">User Agent:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${info.userAgent}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Time:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${info.time}</td>
          </tr>
        </table>
        <p>If this was you, you can ignore this alert. Otherwise, change your password immediately.</p>
        <br/>
        <p>Best Regards,<br/>The Enterprise Team</p>
      </div>
    `;
    return this.sendEmail(to, 'Security Alert: New Account Login', html);
  }
}

export const emailService = new EmailService();
