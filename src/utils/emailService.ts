import { generateReceiptPDF } from './receipt';
import emailjs from '@emailjs/browser';

export interface EmailData {
  to: string;
  from?: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface PaymentEmailData {
  username: string;
  userEmail: string;
  fromEmail?: string;
  paymentId: string;
  month: string;
  amount: number;
  adminUsername: string;
  reason?: string;
  status: 'approved' | 'rejected';
}

// Email service class
export class EmailService {
  private static instance: EmailService;
  private isInitialized = false;

  // EmailJS configuration
  private readonly SERVICE_ID = 'YOUR_EMAILJS_SERVICE_ID'; // Replace with your EmailJS service ID
  private readonly TEMPLATE_ID_APPROVAL = 'YOUR_APPROVAL_TEMPLATE_ID'; // Replace with your approval template ID
  private readonly TEMPLATE_ID_REJECTION = 'YOUR_REJECTION_TEMPLATE_ID'; // Replace with your rejection template ID
  private readonly PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'; // Replace with your EmailJS public key

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Initialize EmailJS
  private initializeEmailJS(): void {
    if (!this.isInitialized) {
      emailjs.init(this.PUBLIC_KEY);
      this.isInitialized = true;
    }
  }

  // Send payment approval email with receipt
  async sendPaymentApprovalEmail(data: PaymentEmailData): Promise<void> {
    try {
      this.initializeEmailJS();

      // Prepare template parameters for EmailJS
      const templateParams = {
        to_email: data.userEmail,
        from_email: data.fromEmail || 'noreply@groupcontribution.com',
        user_name: data.username,
        payment_id: data.paymentId,
        month: data.month,
        amount: data.amount.toLocaleString(),
        admin_username: data.adminUsername,
        approval_date: new Date().toLocaleDateString(),
        receipt_attachment: await this.generateReceiptBase64({
          userEmail: data.username,
          month: data.month,
          amount: data.amount,
          status: 'paid',
          paidDate: new Date().toLocaleDateString(),
          paymentID: data.paymentId,
        })
      };

      // Send email using EmailJS
      const result = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID_APPROVAL,
        templateParams
      );

      console.log(`Payment approval email sent successfully to ${data.userEmail}`, result);
    } catch (error) {
      console.error('Error sending payment approval email:', error);
      throw error;
    }
  }

  // Send payment rejection email
  async sendPaymentRejectionEmail(data: PaymentEmailData): Promise<void> {
    try {
      this.initializeEmailJS();

      // Prepare template parameters for EmailJS
      const templateParams = {
        to_email: data.userEmail,
        from_email: data.fromEmail || 'noreply@groupcontribution.com',
        user_name: data.username,
        payment_id: data.paymentId,
        month: data.month,
        amount: data.amount.toLocaleString(),
        admin_username: data.adminUsername,
        rejection_date: new Date().toLocaleDateString(),
        rejection_reason: data.reason || 'No reason provided'
      };

      // Send email using EmailJS
      const result = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID_REJECTION,
        templateParams
      );

      console.log(`Payment rejection email sent successfully to ${data.userEmail}`, result);
    } catch (error) {
      console.error('Error sending payment rejection email:', error);
      throw error;
    }
  }

  // Generate receipt as base64 for email attachment
  private async generateReceiptBase64(receiptData: any): Promise<string> {
    // This is a placeholder - in a real implementation, you'd generate the PDF
    // and convert it to base64. For now, we'll return a placeholder
    return 'base64_placeholder_for_receipt_pdf';
  }

  // Legacy method for backward compatibility
  private async sendEmail(emailData: EmailData): Promise<void> {
    // This method is kept for backward compatibility but now uses EmailJS
    console.log('Email would be sent via EmailJS:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      hasAttachments: !!emailData.attachments?.length
    });

    // For now, we'll simulate sending the email
    // In production, replace this with actual EmailJS integration
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Method to check if EmailJS is properly configured
  isConfigured(): boolean {
    return this.SERVICE_ID !== 'YOUR_EMAILJS_SERVICE_ID' && 
           this.TEMPLATE_ID_APPROVAL !== 'YOUR_APPROVAL_TEMPLATE_ID' &&
           this.TEMPLATE_ID_REJECTION !== 'YOUR_REJECTION_TEMPLATE_ID' &&
           this.PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY';
  }

  // Method to get configuration status
  getConfigurationStatus(): { configured: boolean; missing: string[] } {
    const missing: string[] = [];
    if (this.SERVICE_ID === 'YOUR_EMAILJS_SERVICE_ID') missing.push('Service ID');
    if (this.TEMPLATE_ID_APPROVAL === 'YOUR_APPROVAL_TEMPLATE_ID') missing.push('Approval Template ID');
    if (this.TEMPLATE_ID_REJECTION === 'YOUR_REJECTION_TEMPLATE_ID') missing.push('Rejection Template ID');
    if (this.PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') missing.push('Public Key');

    return {
      configured: missing.length === 0,
      missing
    };
  }
}

// Export convenience functions
export const sendPaymentApprovalEmail = (data: PaymentEmailData) => {
  return EmailService.getInstance().sendPaymentApprovalEmail(data);
};

export const sendPaymentRejectionEmail = (data: PaymentEmailData) => {
  return EmailService.getInstance().sendPaymentRejectionEmail(data);
}; 