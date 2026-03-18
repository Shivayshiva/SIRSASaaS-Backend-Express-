import { Resend } from "resend";

import { env } from "../../config/env";

interface SendRegistrationEmailInput {
  to: string;
  name: string;
  businessName: string;
  shopName: string;
}

interface SendLeadApprovalCredentialsEmailInput {
  to: string;
  name: string;
  email: string;
  temporaryPassword: string;
  resetPasswordLink: string;
  businessName: string;
  shopName: string;
}

const resend = new Resend(env.RESEND_API_KEY);

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const buildRegistrationEmailHtml = (input: SendRegistrationEmailInput): string => {
  const name = escapeHtml(input.name);
  const businessName = escapeHtml(input.businessName);
  const shopName = escapeHtml(input.shopName);

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;line-height:1.6;color:#111827;">
      <h2 style="margin-bottom:16px;">Welcome to Shop Management SaaS</h2>
      <p>Hi ${name},</p>
      <p>Your account has been created successfully.</p>
      <p>
        <strong>Business:</strong> ${businessName}<br />
        <strong>Primary Shop:</strong> ${shopName}
      </p>
      <p>You can now log in and start managing your store operations.</p>
      <p>Thanks,<br />Shop Management Team</p>
    </div>
  `;
};

const buildLeadApprovalCredentialsEmailHtml = (
  input: SendLeadApprovalCredentialsEmailInput
): string => {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const temporaryPassword = escapeHtml(input.temporaryPassword);
  const resetPasswordLink = escapeHtml(input.resetPasswordLink);
  const businessName = escapeHtml(input.businessName);
  const shopName = escapeHtml(input.shopName);

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;line-height:1.6;color:#111827;">
      <h2 style="margin-bottom:16px;">Your Shop Management Account Is Approved</h2>
      <p>Hi ${name},</p>
      <p>Your lead has been approved and your admin account is now active.</p>
      <p>
        <strong>Business:</strong> ${businessName}<br />
        <strong>Primary Shop:</strong> ${shopName}
      </p>
      <p><strong>Login Credentials</strong></p>
      <p>
        <strong>Email:</strong> ${email}<br />
        <strong>Temporary Password:</strong> ${temporaryPassword}
      </p>
      <p>
        Please reset your password immediately using this link:<br />
        <a href="${resetPasswordLink}" target="_blank" rel="noopener noreferrer">${resetPasswordLink}</a>
      </p>
      <p>Thanks,<br />Shop Management Team</p>
    </div>
  `;
};

export const emailService = {
  async sendRegistrationEmail(input: SendRegistrationEmailInput) {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: "Welcome to Shop Management SaaS",
      html: buildRegistrationEmailHtml(input)
    });

    if (error) {
      const statusCode =
        "statusCode" in error && typeof error.statusCode === "number"
          ? error.statusCode
          : undefined;
      const name =
        "name" in error && typeof error.name === "string" ? error.name : "resend_error";
      const prefix = statusCode ? `[${statusCode}] ${name}` : name;
      throw new Error(`${prefix}: ${error.message}`);
    }
  },

  async sendLeadApprovalCredentialsEmail(
    input: SendLeadApprovalCredentialsEmailInput
  ) {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: "Your Shop Management Login Credentials",
      html: buildLeadApprovalCredentialsEmailHtml(input)
    });

    if (error) {
      const statusCode =
        "statusCode" in error && typeof error.statusCode === "number"
          ? error.statusCode
          : undefined;
      const name =
        "name" in error && typeof error.name === "string" ? error.name : "resend_error";
      const prefix = statusCode ? `[${statusCode}] ${name}` : name;
      throw new Error(`${prefix}: ${error.message}`);
    }
  }
};
