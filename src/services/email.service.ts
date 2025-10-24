import sgMail from '@sendgrid/mail';
import { config } from '../config';

export class EmailService {
  constructor() {
    // Thiết lập SendGrid API key
    sgMail.setApiKey(config.sendgridApiKey);
  }

  // Send email verification
  async sendEmailVerification(email: string, token: string, fullName: string): Promise<void> {
    const verificationUrl = `${config.clientOrigin}/auth/verify-email?token=${token}`;

    const msg = {
      to: email,
      from: {
        name: 'AURA',
        email: config.smtpUser, // dùng email verified trong SendGrid
      },
      subject: 'Verify Your Email - AURA',
      html: this.getEmailVerificationTemplate(fullName, verificationUrl),
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Email verification sent to ${email}`);
    } catch (error: any) {
      console.error('❌ Error sending email verification:', error.response?.body || error);
      throw new Error('Failed to send email verification');
    }
  }

  // Send password reset email
  async sendPasswordReset(email: string, token: string, fullName: string): Promise<void> {
    const resetUrl = `${config.clientOrigin}/auth/reset-password?token=${token}`;

    const msg = {
      to: email,
      from: {
        name: 'AURA',
        email: config.smtpUser,
      },
      subject: 'Reset Your Password - AURA',
      html: this.getPasswordResetTemplate(fullName, resetUrl),
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (error: any) {
      console.error('❌ Error sending password reset email:', error.response?.body || error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send low balance alert to admin
  async sendLowBalanceAlert(
    adminEmail: string,
    adminName: string,
    requestType: 'refund' | 'withdrawal',
    requestedAmount: number,
    currentBalance: number,
    requestId: string
  ): Promise<void> {
    const msg = {
      to: adminEmail,
      from: {
        name: 'AURA System',
        email: config.smtpUser,
      },
      subject: `🚨 Low Balance Alert - ${requestType.toUpperCase()} Request Blocked`,
      html: this.getLowBalanceAlertTemplate(adminName, requestType, requestedAmount, currentBalance, requestId),
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Low balance alert sent to ${adminEmail}`);
    } catch (error: any) {
      console.error('❌ Error sending low balance alert:', error.response?.body || error);
      throw new Error('Failed to send low balance alert');
    }
  }

  // Send refund success notification to user
  async sendRefundSuccessNotification(
    userEmail: string,
    userName: string,
    refundAmount: number,
    bookingId: string,
    serviceName?: string,
    payoutId?: string
  ): Promise<void> {
    const msg = {
      to: userEmail,
      from: {
        name: 'AURA',
        email: config.smtpUser,
      },
      subject: '✅ Refund Processed Successfully - AURA',
      html: this.getRefundSuccessTemplate(userName, refundAmount, bookingId, serviceName, payoutId),
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Refund success email sent to ${userEmail}`);
    } catch (error: any) {
      console.error('❌ Error sending refund success email:', error.response?.body || error);
      throw new Error('Failed to send refund success notification');
    }
  }

  // Send withdrawal success notification
  async sendWithdrawalSuccessNotification(
    muaEmail: string,
    muaName: string,
    withdrawalAmount: number,
    muaId: string,
    payoutId?: string
  ): Promise<void> {
    const msg = {
      to: muaEmail,
      from: {
        name: 'AURA',
        email: config.smtpUser,
      },
      subject: '💰 Withdrawal Processed Successfully - AURA',
      html: this.getWithdrawalSuccessTemplate(muaName, withdrawalAmount, muaId, payoutId),
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Withdrawal success email sent to ${muaEmail}`);
    } catch (error: any) {
      console.error('❌ Error sending withdrawal success email:', error.response?.body || error);
      throw new Error('Failed to send withdrawal success notification');
    }
  }

  // === Các hàm getEmailVerificationTemplate, getPasswordResetTemplate, getRefundSuccessTemplate, getWithdrawalSuccessTemplate, getLowBalanceAlertTemplate ===
  // Giữ nguyên toàn bộ như bạn đã có (HTML template không cần thay đổi).
  // Chỉ cần copy nguyên phần đó từ code cũ sang.
  // ✅ Email verification template
  private getEmailVerificationTemplate(fullName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AURA!</h1>
            <p>Your Beauty Booking Platform</p>
          </div>
          <div class="content">
            <h2>Hi ${fullName}!</h2>
            <p>Thank you for registering with AURA. Please verify your email address to activate your account.</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, copy and paste this link:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
            <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>If you didn't create an account with AURA, please ignore this email.</p>
            <p>&copy; 2024 AURA. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ✅ Password reset template
  private getPasswordResetTemplate(fullName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>AURA - Your Beauty Booking Platform</p>
          </div>
          <div class="content">
            <h2>Hi ${fullName}!</h2>
            <p>We received a request to reset your password. Click below to continue:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, copy and paste this link:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${resetUrl}</p>
            <p><strong>Note:</strong> This password reset link will expire in 1 hour.</p>
            <p>If you didn’t request a reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AURA. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ✅ Refund success template
  private getRefundSuccessTemplate(
    userName: string,
    refundAmount: number,
    bookingId: string,
    serviceName?: string,
    payoutId?: string
  ): string {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(refundAmount);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Processed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details-box { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-item { display: flex; justify-content: space-between; margin: 10px 0; }
          .amount { color: #27ae60; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Refund Successful</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName}!</h2>
            <p>Your refund has been successfully processed.</p>
            <div class="details-box">
              <div class="detail-item"><b>Amount:</b> <span class="amount">${formattedAmount}</span></div>
              <div class="detail-item"><b>Booking ID:</b> ${bookingId.substring(0, 8)}...</div>
              ${serviceName ? `<div class="detail-item"><b>Service:</b> ${serviceName}</div>` : ''}
              ${payoutId ? `<div class="detail-item"><b>Transaction ID:</b> ${payoutId}</div>` : ''}
              <div class="detail-item"><b>Date:</b> ${new Date().toLocaleString()}</div>
            </div>
            <p>The refund may take 1–3 business days to appear in your account.</p>
            <p>Thank you for using AURA!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AURA. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ✅ Withdrawal success template
  private getWithdrawalSuccessTemplate(
    muaName: string,
    withdrawalAmount: number,
    muaId: string,
    payoutId?: string
  ): string {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(withdrawalAmount);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Withdrawal Successful</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details-box { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-item { display: flex; justify-content: space-between; margin: 10px 0; }
          .amount { color: #2980b9; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Withdrawal Successful</h1>
          </div>
          <div class="content">
            <h2>Hi ${muaName}!</h2>
            <p>Your withdrawal has been processed successfully.</p>
            <div class="details-box">
              <div class="detail-item"><b>Amount:</b> <span class="amount">${formattedAmount}</span></div>
              <div class="detail-item"><b>MUA ID:</b> ${muaId.substring(0, 8)}...</div>
              ${payoutId ? `<div class="detail-item"><b>Transaction ID:</b> ${payoutId}</div>` : ''}
              <div class="detail-item"><b>Date:</b> ${new Date().toLocaleString()}</div>
            </div>
            <p>Funds will appear in your account within 1–3 business days.</p>
            <p>Thank you for being part of AURA!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AURA. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ✅ Low balance alert template
  private getLowBalanceAlertTemplate(
    adminName: string, 
    requestType: 'refund' | 'withdrawal',
    requestedAmount: number,
    currentBalance: number,
    requestId: string
  ): string {
    const typeTitle = requestType === 'refund' ? 'Refund' : 'Withdrawal';
    const requested = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(requestedAmount);
    const balance = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentBalance);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Low Balance Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Low Balance Alert</h1>
          </div>
          <div class="content">
            <h2>Hi ${adminName},</h2>
            <p>The system blocked a <b>${typeTitle}</b> request due to low balance.</p>
            <div class="alert-box">
              <p><b>Request ID:</b> ${requestId}</p>
              <p><b>Requested:</b> ${requested}</p>
              <p><b>Current Balance:</b> ${balance}</p>
              <p><b>Shortfall:</b> ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(requestedAmount - currentBalance)}</p>
            </div>
            <p>Please top up your payout account to continue processing ${typeTitle.toLowerCase()} requests.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from AURA.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

}  
