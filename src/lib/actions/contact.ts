"use server";

import nodemailer from "nodemailer";
import { IContactMessage, ApiResponse, TContactStatus } from "@/lib/api/contact";

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

const SUPPORT_EMAIL = "support.foodflow@gmail.com";

/**
 * Helper to create nodemailer transporter safely
 */
function getEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  category: string;
  subject: string;
  message: string;
}

/**
 * 1. Submit Contact Form (Saves to MongoDB and Sends Notification & Confirmation Emails)
 */
export async function submitContactForm(
  formData: ContactFormData
): Promise<ApiResponse<IContactMessage>> {
  try {
    const ticketId = `FF-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Save into Backend Database
    let savedDoc: IContactMessage | undefined;
    try {
      const dbRes = await fetch(`${API_BASE_URL}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || "",
          category: formData.category || "Other",
          subject: formData.subject,
          message: formData.message,
        }),
      });

      if (dbRes.ok) {
        const json = await dbRes.json();
        savedDoc = json.data;
      }
    } catch (dbErr) {
      console.warn("Could not save contact message directly to backend:", dbErr);
    }

    // 2. Send Emails via Nodemailer
    const transporter = getEmailTransporter();
    if (transporter) {
      const fromSender = process.env.EMAIL_FROM || `"Food Flow Support" <${SUPPORT_EMAIL}>`;

      // Email A: Send notification to support.foodflow@gmail.com
      const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Support Ticket #${ticketId}</title></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 8px 30px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);padding:24px 32px;color:#ffffff;">
              <h2 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.5px;">Food Flow — New Support Ticket</h2>
              <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">Ticket ID: <strong>#${ticketId}</strong> | ${formData.category}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <div style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#C2410C;font-weight:700;">Subject: ${formData.subject}</p>
              </div>

              <table width="100%" cellpadding="6" cellspacing="0" style="font-size:13px;color:#475569;margin-bottom:20px;">
                <tr><td width="100" style="font-weight:700;color:#1E293B;">Sender Name:</td><td>${formData.name}</td></tr>
                <tr><td style="font-weight:700;color:#1E293B;">Email Address:</td><td><a href="mailto:${formData.email}" style="color:#FF6B35;text-decoration:none;font-weight:600;">${formData.email}</a></td></tr>
                ${formData.phone ? `<tr><td style="font-weight:700;color:#1E293B;">Phone:</td><td><a href="tel:${formData.phone}" style="color:#FF6B35;text-decoration:none;">${formData.phone}</a></td></tr>` : ''}
                <tr><td style="font-weight:700;color:#1E293B;">Category:</td><td><span style="background:#F1F5F9;padding:3px 10px;border-radius:6px;font-weight:600;color:#0F172A;">${formData.category}</span></td></tr>
                <tr><td style="font-weight:700;color:#1E293B;">Received At:</td><td>${new Date().toLocaleString()}</td></tr>
              </table>

              <div style="border-top:1px solid #F1F5F9;padding-top:16px;">
                <h4 style="margin:0 0 8px 0;color:#0F172A;font-size:14px;">Customer Inquiry / Message:</h4>
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">${formData.message}</div>
              </div>

              <div style="margin-top:24px;text-align:center;">
                <a href="mailto:${formData.email}?subject=Re: [Ticket %23${ticketId}] ${encodeURIComponent(formData.subject)}" style="display:inline-block;background:#FF6B35;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;box-shadow:0 4px 12px rgba(255,107,53,0.3);">Reply to Customer</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Email B: Send confirmation receipt to the customer
      const userHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>We Received Your Request #${ticketId}</title></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:540px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 8px 30px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);padding:24px 32px;color:#ffffff;">
              <h2 style="margin:0;font-size:20px;font-weight:800;">Food Flow Customer Support</h2>
              <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">We're on it!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="font-size:15px;margin:0 0 14px 0;color:#0F172A;">Hello <strong>${formData.name}</strong>,</p>
              <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px 0;">
                Thank you for contacting Food Flow Support. We have received your inquiry regarding <strong>"${formData.subject}"</strong>. Our dedicated support team is actively reviewing your message and will get back to you shortly.
              </p>

              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:16px;margin-bottom:20px;">
                <table width="100%" style="font-size:13px;color:#475569;">
                  <tr><td width="110" style="font-weight:700;color:#1E293B;">Ticket Number:</td><td style="font-weight:800;color:#FF6B35;">#${ticketId}</td></tr>
                  <tr><td style="font-weight:700;color:#1E293B;">Category:</td><td>${formData.category}</td></tr>
                  <tr><td style="font-weight:700;color:#1E293B;">Status:</td><td><span style="color:#0284C7;font-weight:700;">Under Review</span></td></tr>
                </table>
              </div>

              <p style="font-size:13px;color:#64748B;line-height:1.5;margin:0;">
                If you have additional details to share, simply reply directly to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center;">
              © ${new Date().getFullYear()} Food Flow Platform • Dhaka, Bangladesh
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Dispatch Support Notification
      try {
        await transporter.sendMail({
          from: fromSender,
          to: SUPPORT_EMAIL,
          replyTo: `"${formData.name}" <${formData.email}>`,
          subject: `[Food Flow Support] [Ticket #${ticketId}] ${formData.subject} (${formData.category})`,
          html: adminHtml,
        });
      } catch (mailErr) {
        console.error("Error dispatching admin notification email:", mailErr);
      }

      // Dispatch Customer Confirmation
      try {
        await transporter.sendMail({
          from: fromSender,
          to: formData.email,
          replyTo: SUPPORT_EMAIL,
          subject: `We've received your request #${ticketId} — Food Flow Support`,
          html: userHtml,
        });
      } catch (userMailErr) {
        console.error("Error dispatching user confirmation email:", userMailErr);
      }
    }

    return {
      success: true,
      message: `Your inquiry has been submitted! Ticket ID: #${ticketId}`,
      data: savedDoc || ({
        _id: ticketId,
        ticketId,
        name: formData.name,
        email: formData.email,
        category: formData.category,
        subject: formData.subject,
        message: formData.message,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IContactMessage),
    };
  } catch (err: any) {
    console.error("Error submitting contact form:", err);
    return {
      success: false,
      message: err.message || "Failed to submit your message. Please try again.",
    };
  }
}

/**
 * 2. Admin Replies to a Contact Message (Sends Email directly to Customer + Saves Reply in DB)
 */
export async function replyToContactMessageAction(payload: {
  messageId: string;
  toEmail: string;
  recipientName: string;
  ticketId: string;
  subject: string;
  replyText: string;
  adminName?: string;
  adminEmail?: string;
}): Promise<ApiResponse<IContactMessage>> {
  try {
    const {
      messageId,
      toEmail,
      recipientName,
      ticketId,
      subject,
      replyText,
      adminName = "Food Flow Support Team",
    } = payload;

    // 1. Send Email to Customer
    const transporter = getEmailTransporter();
    if (transporter) {
      const fromSender = process.env.EMAIL_FROM || `"Food Flow Support" <${SUPPORT_EMAIL}>`;

      const replyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Response to Support Ticket #${ticketId}</title></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 8px 30px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);padding:24px 32px;color:#ffffff;">
              <h2 style="margin:0;font-size:20px;font-weight:800;">Food Flow Support Response</h2>
              <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">Ticket #${ticketId}: ${subject}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="font-size:15px;margin:0 0 16px 0;color:#0F172A;">Hello <strong>${recipientName}</strong>,</p>
              
              <div style="background:#FFF7ED;border-left:4px solid #FF6B35;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#1E293B;white-space:pre-wrap;">${replyText}</p>
              </div>

              <div style="border-top:1px solid #F1F5F9;padding-top:16px;font-size:13px;color:#64748B;">
                <p style="margin:0 0 4px 0;">Best regards,</p>
                <p style="margin:0;font-weight:700;color:#0F172A;">${adminName}</p>
                <p style="margin:0;color:#FF6B35;font-weight:600;">Food Flow Customer Care</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center;">
              Need more help? Simply reply to this email or visit our Help Center.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      try {
        await transporter.sendMail({
          from: fromSender,
          to: toEmail,
          replyTo: SUPPORT_EMAIL,
          subject: `Re: [Ticket #${ticketId}] ${subject}`,
          html: replyHtml,
        });
      } catch (mailErr) {
        console.error("Error sending reply email to customer:", mailErr);
      }
    }

    // 2. Record Reply in Server Database
    const res = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(messageId)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replyMessage: replyText,
        repliedBy: adminName,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.message || "Failed to update reply record on server.",
      };
    }

    const data: ApiResponse<IContactMessage> = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error sending contact reply:", err);
    return {
      success: false,
      message: err.message || "Failed to send reply.",
    };
  }
}

/**
 * 3. Update Contact Message Status
 */
export async function updateContactStatusAction(
  messageId: string,
  status: TContactStatus
): Promise<ApiResponse<IContactMessage>> {
  try {
    const res = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(messageId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.message || "Failed to update status",
      };
    }

    return await res.json();
  } catch (err: any) {
    console.error("Error updating contact status:", err);
    return {
      success: false,
      message: err.message || "Failed to update status.",
    };
  }
}

/**
 * 4. Delete Contact Message
 */
export async function deleteContactMessageAction(
  messageId: string
): Promise<ApiResponse<{ id: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(messageId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.message || "Failed to delete message",
      };
    }

    return await res.json();
  } catch (err: any) {
    console.error("Error deleting contact message:", err);
    return {
      success: false,
      message: err.message || "Failed to delete message.",
    };
  }
}
