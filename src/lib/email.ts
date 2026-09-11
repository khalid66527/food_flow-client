import nodemailer from "nodemailer";

export interface TOrderEmailItem {
  name: string;
  quantity: number;
  price: number;
  discountPrice?: number;
  image?: string;
  restaurantName?: string;
}

export interface TOrderEmailPayload {
  orderId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  items: TOrderEmailItem[];
  deliveryAddress: {
    fullName: string;
    phoneNumber: string;
    streetAddress: string;
    area: string;
    city?: string;
    postalCode?: string;
    building?: string;
  };
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  totalAmount: number;
  paymentMethod: "COD" | "STRIPE" | string;
  paymentStatus?: "Pending" | "Paid" | string;
  orderStatus?: string;
  createdAt?: string;
}

export interface TGenericEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Universal High-Deliverability Email Dispatcher.
 * Priority:
 * 1. Resend API (RESEND_API_KEY)
 * 2. SendGrid API (SENDGRID_API_KEY)
 * 3. Anti-Spam Optimized Nodemailer SMTP (Gmail / Custom SMTP)
 */
export async function sendEmail(payload: TGenericEmailPayload): Promise<boolean> {
  const { to, subject, html, text, replyTo } = payload;
  const normalizedTo = to.trim().toLowerCase();

  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL || "support@foodflow.app";

  const defaultSupportEmail = "support.foodflow@gmail.com";
  const effectiveReplyTo = replyTo || process.env.SMTP_USER || defaultSupportEmail;

  // 1. Resend API Flow (Highest Inbox Rate)
  if (resendApiKey) {
    try {
      const fromFormatted = resendFromEmail.includes("<")
        ? resendFromEmail
        : `Food Flow <${resendFromEmail}>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromFormatted,
          to: [normalizedTo],
          subject: subject,
          html: html,
          text: text || html.replace(/<[^>]+>/g, " ").trim(),
          reply_to: effectiveReplyTo,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.id) {
        console.log(`✉️ [RESEND API] Email delivered to ${normalizedTo} (ID: ${resData.id})`);
        return true;
      } else {
        console.warn("⚠️ [RESEND API] Delivery warning:", resData);
      }
    } catch (resendErr) {
      console.error("⚠️ Resend API Exception:", resendErr);
    }
  }

  // 2. SendGrid API Flow
  if (sendgridApiKey) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: normalizedTo }] }],
          from: { email: sendgridFromEmail, name: "Food Flow" },
          reply_to: { email: effectiveReplyTo, name: "Food Flow Support" },
          subject: subject,
          content: [
            { type: "text/plain", value: text || html.replace(/<[^>]+>/g, " ").trim() },
            { type: "text/html", value: html },
          ],
        }),
      });

      if (res.ok || res.status === 202) {
        console.log(`✉️ [SENDGRID API] Email delivered to ${normalizedTo}`);
        return true;
      } else {
        const errorText = await res.text();
        console.warn("⚠️ [SENDGRID API] Error response:", errorText);
      }
    } catch (sgErr) {
      console.error("⚠️ SendGrid API Exception:", sgErr);
    }
  }

  // 3. Optimized Nodemailer SMTP (Gmail / Custom SMTP with Anti-Spam Headers)
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const cleanFromUser = smtpUser.trim();
      const fromSender = `"Food Flow Support" <${cleanFromUser}>`;

      await transporter.sendMail({
        from: fromSender,
        to: normalizedTo,
        replyTo: cleanFromUser,
        subject: subject,
        text: text || html.replace(/<[^>]+>/g, " ").trim(), // Plain-text fallback prevents spam categorization
        html: html,
        headers: {
          "X-Mailer": "FoodFlow Transactional Mailer v1.0",
          "X-Auto-Response-Suppress": "All",
          "Precedence": "bulk",
        },
      });

      console.log(`✉️ [SMTP INBOX OPTIMIZED] Email delivered to ${normalizedTo}`);
      return true;
    } catch (smtpError) {
      console.error("⚠️ SMTP delivery error:", smtpError);
    }
  }

  // Fallback log for local dev without credentials
  console.log("=================================================");
  console.log(`✉️ [LOCAL DEV EMAIL DISPATCH] To: ${normalizedTo}`);
  console.log(`Subject: ${subject}`);
  console.log("=================================================");
  return true;
}

/**
 * Send an automated order confirmation summary email to the customer.
 */
export async function sendOrderConfirmationEmail(order: TOrderEmailPayload): Promise<boolean> {
  try {
    if (!order || !order.userEmail) {
      console.warn("⚠️ Cannot send order confirmation email: Missing userEmail.");
      return false;
    }

    const normalizedEmail = order.userEmail.trim().toLowerCase();

    const paymentMethodLabel =
      order.paymentMethod === "STRIPE"
        ? "Online Payment"
        : order.paymentMethod === "COD"
        ? "Cash on Delivery (COD)"
        : order.paymentMethod;

    const paymentStatusBadgeColor =
      order.paymentStatus === "Paid"
        ? "#059669" // Emerald-600
        : "#D97706"; // Amber-600

    const paymentStatusBg =
      order.paymentStatus === "Paid"
        ? "#ECFDF5" // Emerald-50
        : "#FFFBEB"; // Amber-50

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        });

    // Build Items List HTML
    const itemsHtml = (order.items || [])
      .map((item) => {
        const unitPrice = item.discountPrice || item.price;
        const itemTotal = unitPrice * item.quantity;
        return `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1E293B;">
              ${item.name}
              ${
                item.restaurantName
                  ? `<br/><span style="font-size: 11px; font-weight: 500; color: #64748B;">Store: ${item.restaurantName}</span>`
                  : ""
              }
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: #475569; text-align: center;">
              x${item.quantity}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0F172A; text-align: right;">
              $${itemTotal.toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join("");

    const subtotalCalc = order.subtotal ?? (order.totalAmount - (order.deliveryFee || 0) + (order.discount || 0));
    const deliveryFeeCalc = order.deliveryFee || 0;
    const discountCalc = order.discount || 0;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodFlow - Order Confirmation Summary #${order.orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          
          <!-- Signature Orange Header with Premium Text Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B35 0%, #FF7843 50%, #FF8C42 100%); padding: 36px 32px 30px 32px; text-align: center;">
              <div style="margin-bottom: 12px;">
                <span style="font-size: 28px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px; text-transform: uppercase; font-family: 'Segoe UI', Arial, sans-serif;">
                  FOOD<span style="color: #FFE8DF; font-weight: 400;">FLOW</span>
                </span>
              </div>
              <div style="display: inline-block; background-color: rgba(255,255,255,0.22); padding: 4px 16px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.3);">
                <span style="font-size: 11px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; text-transform: uppercase;">Instant Order Confirmation</span>
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Order Placed Successfully!</h1>
              <p style="margin: 6px 0 0 0; color: #FFE8DF; font-size: 13px; font-weight: 500;">
                Thank you for choosing FoodFlow. Your order is being processed by the kitchen.
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">

              <!-- Order Overview Card (Order Reference, Date, Payment Method, Status) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF7ED; border-radius: 16px; border: 1px solid #FFEDD5; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 12px; color: #9A3412; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                          Order Reference
                        </td>
                        <td align="right" style="font-size: 12px; color: #9A3412; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                          Date & Time
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 18px; font-weight: 900; color: #C2410C; padding-top: 4px;">
                          #${order.orderId}
                        </td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #475569; padding-top: 4px;">
                          ${formattedDate}
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #FDBA74; display: flex; align-items: center; justify-content: space-between;">
                      <div style="font-size: 13px; color: #475569;">
                        <strong>Payment Method:</strong> ${paymentMethodLabel}
                      </div>
                      <div style="margin-top: 4px;">
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; background-color: ${paymentStatusBg}; color: ${paymentStatusBadgeColor}; border: 1px solid ${paymentStatusBadgeColor}40;">
                          Payment Status: ${order.paymentStatus || "Pending"}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Delivery Address Section -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
                  📍 Delivery Address
                </h3>
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px; font-size: 13px; color: #334155; line-height: 1.6;">
                  <strong style="font-size: 14px; color: #0F172A;">${order.deliveryAddress?.fullName || order.userName || "Customer"}</strong><br/>
                  📞 Phone: <strong>${order.deliveryAddress?.phoneNumber || "N/A"}</strong><br/>
                  🏠 Address: ${order.deliveryAddress?.streetAddress || ""}, ${order.deliveryAddress?.area || ""}${
                    order.deliveryAddress?.city ? `, ${order.deliveryAddress.city}` : ""
                  }${order.deliveryAddress?.postalCode ? ` - ${order.deliveryAddress.postalCode}` : ""}
                </div>
              </div>

              <!-- Ordered Items Summary Table -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
                  🍔 Ordered Items Summary
                </h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase;">
                      <th align="left" style="padding: 10px 16px;">Item</th>
                      <th align="center" style="padding: 10px 16px;">Qty</th>
                      <th align="right" style="padding: 10px 16px;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Total Amount Breakdown -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="right">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 240px; font-size: 13px; color: #475569;">
                      <tr>
                        <td style="padding: 4px 0;">Subtotal:</td>
                        <td align="right" style="font-weight: 600; color: #1E293B;">$${subtotalCalc.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">Delivery Fee:</td>
                        <td align="right" style="font-weight: 600; color: #1E293B;">$${deliveryFeeCalc.toFixed(2)}</td>
                      </tr>
                      ${
                        discountCalc > 0
                          ? `
                      <tr>
                        <td style="padding: 4px 0; color: #059669;">Discount:</td>
                        <td align="right" style="font-weight: 700; color: #059669;">-$${discountCalc.toFixed(2)}</td>
                      </tr>
                      `
                          : ""
                      }
                      <tr style="border-top: 2px solid #E2E8F0;">
                        <td style="padding: 10px 0 0 0; font-size: 16px; font-weight: 900; color: #0F172A;">Total Paid:</td>
                        <td align="right" style="padding: 10px 0 0 0; font-size: 20px; font-weight: 900; color: #FF6B35;">$${order.totalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 14px 18px; font-size: 12px; color: #1E40AF; line-height: 1.5;">
                ℹ️ <strong>Instant Order Notification:</strong> This email is an instant summary of your placed order. Your official invoice receipt will be unlocked upon successful delivery.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #F1F5F9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #0F172A; font-weight: 700;">
                Food Flow &bull; Fast, Fresh & Reliable Food Delivery
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                Need help with your order? Contact customer support at <a href="mailto:support.foodflow@gmail.com" style="color: #FF6B35; text-decoration: none; font-weight: 700;">support.foodflow@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Plain text representation for anti-spam filters
    const emailText = `
Food Flow - Order Confirmation Summary

Order Reference: #${order.orderId}
Date & Time: ${formattedDate}
Payment Method: ${paymentMethodLabel}
Payment Status: ${order.paymentStatus || "Pending"}

Delivery Address:
Customer: ${order.deliveryAddress?.fullName || order.userName || "Customer"}
Phone: ${order.deliveryAddress?.phoneNumber || "N/A"}
Address: ${order.deliveryAddress?.streetAddress || ""}, ${order.deliveryAddress?.area || ""}${
      order.deliveryAddress?.city ? `, ${order.deliveryAddress.city}` : ""
    }${order.deliveryAddress?.postalCode ? ` - ${order.deliveryAddress.postalCode}` : ""}

Ordered Items Summary:
${(order.items || [])
  .map(
    (item) =>
      `- ${item.quantity}x ${item.name} ($${((item.discountPrice || item.price) * item.quantity).toFixed(2)})`
  )
  .join("\n")}

Subtotal: $${subtotalCalc.toFixed(2)}
Delivery Fee: $${deliveryFeeCalc.toFixed(2)}
${discountCalc > 0 ? `Discount: -$${discountCalc.toFixed(2)}\n` : ""}
Total Paid: $${order.totalAmount.toFixed(2)}

Note: This email is an instant summary of your placed order. Your official invoice receipt will be unlocked upon successful delivery.

Need help? Contact support.foodflow@gmail.com
    `.trim();

    return await sendEmail({
      to: normalizedEmail,
      subject: `🎉 Food Flow Order Confirmation #${order.orderId}`,
      html: emailHtml,
      text: emailText,
    });
  } catch (err) {
    console.error("⚠️ Error sending order confirmation email:", err);
    return false;
  }
}

/**
 * Send an automated order cancellation email to the customer (for Cash on Delivery orders).
 */
export async function sendOrderCancellationEmail(
  order: TOrderEmailPayload,
  reason?: string
): Promise<boolean> {
  try {
    if (!order || !order.userEmail) {
      console.warn("⚠️ Cannot send cancellation email: Missing userEmail.");
      return false;
    }

    const normalizedEmail = order.userEmail.trim().toLowerCase();

    const paymentMethodLabel =
      order.paymentMethod === "STRIPE"
        ? "Online Payment"
        : order.paymentMethod === "COD"
        ? "Cash on Delivery (COD)"
        : order.paymentMethod;

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        });

    const itemsHtml = (order.items || [])
      .map((item) => {
        const unitPrice = item.discountPrice || item.price;
        const itemTotal = unitPrice * item.quantity;
        return `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1E293B;">
              ${item.name}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: #475569; text-align: center;">
              x${item.quantity}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0F172A; text-align: right;">
              $${itemTotal.toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join("");

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodFlow - Order Cancellation #${order.orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          
          <!-- Header with Red/Dark Accent for Cancellation -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%); padding: 36px 32px 30px 32px; text-align: center;">
              <div style="margin-bottom: 12px;">
                <span style="font-size: 28px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px; text-transform: uppercase; font-family: 'Segoe UI', Arial, sans-serif;">
                  FOOD<span style="color: #FEE2E2; font-weight: 400;">FLOW</span>
                </span>
              </div>
              <div style="display: inline-block; background-color: rgba(255,255,255,0.22); padding: 4px 16px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.3);">
                <span style="font-size: 11px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; text-transform: uppercase;">🚫 Order Cancelled</span>
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Your Order Has Been Cancelled</h1>
              <p style="margin: 6px 0 0 0; color: #FEE2E2; font-size: 13px; font-weight: 500;">
                We're sorry to inform you that your order #${order.orderId} was cancelled.
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">

              <!-- Order Reference Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FEF2F2; border-radius: 16px; border: 1px solid #FECACA; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 12px; color: #991B1B; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                          Order Reference
                        </td>
                        <td align="right" style="font-size: 12px; color: #991B1B; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                          Date & Time
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 18px; font-weight: 900; color: #DC2626; padding-top: 4px;">
                          #${order.orderId}
                        </td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #475569; padding-top: 4px;">
                          ${formattedDate}
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #FCA5A5; display: flex; align-items: center; justify-content: space-between;">
                      <div style="font-size: 13px; color: #475569;">
                        <strong>Payment Method:</strong> ${paymentMethodLabel}
                      </div>
                      <div style="margin-top: 4px;">
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; background-color: #FEF2F2; color: #DC2626; border: 1px solid #FCA5A5;">
                          Status: Cancelled
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Cancellation Notice Box -->
              <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 14px; padding: 16px; font-size: 13px; color: #9F1239; line-height: 1.6; margin-bottom: 24px;">
                <strong>ℹ️ Cancellation Information:</strong><br/>
                ${
                  reason
                    ? `Reason: <em>${reason}</em><br/>`
                    : "This Cash on Delivery (COD) order was cancelled. No charges were incurred.<br/>"
                }
                If you did not request this cancellation or have any questions, please feel free to reach out to our support team.
              </div>

              <!-- Ordered Items Summary Table -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
                  🍔 Cancelled Items Summary
                </h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase;">
                      <th align="left" style="padding: 10px 16px;">Item</th>
                      <th align="center" style="padding: 10px 16px;">Qty</th>
                      <th align="right" style="padding: 10px 16px;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #F1F5F9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #0F172A; font-weight: 700;">
                Food Flow &bull; Fast, Fresh & Reliable Food Delivery
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                Questions? Contact customer support at <a href="mailto:support.foodflow@gmail.com" style="color: #FF6B35; text-decoration: none; font-weight: 700;">support.foodflow@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailText = `
Food Flow - Order Cancellation Notification

Order Reference: #${order.orderId}
Date & Time: ${formattedDate}
Payment Method: ${paymentMethodLabel}
Order Status: Cancelled

${reason ? `Cancellation Reason: ${reason}\n` : "This Cash on Delivery order was cancelled. No charges were incurred.\n"}
Cancelled Items:
${(order.items || [])
  .map(
    (item) =>
      `- ${item.quantity}x ${item.name} ($${((item.discountPrice || item.price) * item.quantity).toFixed(2)})`
  )
  .join("\n")}

If you have questions, please contact support.foodflow@gmail.com
    `.trim();

    return await sendEmail({
      to: normalizedEmail,
      subject: `🚫 Food Flow Order Cancelled #${order.orderId}`,
      html: emailHtml,
      text: emailText,
    });
  } catch (err) {
    console.error("⚠️ Error sending order cancellation email:", err);
    return false;
  }
}

/**
 * Send Delivery Verification OTP email to customer when order is out for delivery.
 */
export async function sendDeliveryOtpEmail(params: {
  orderId: string;
  userEmail: string;
  userName?: string;
  otp: string;
  restaurantName?: string;
  totalAmount?: number;
}): Promise<boolean> {
  try {
    const { orderId, userEmail, userName, otp, restaurantName, totalAmount } = params;
    if (!userEmail || !otp) {
      console.warn("⚠️ Cannot send delivery OTP email: Missing userEmail or otp.");
      return false;
    }

    const normalizedEmail = userEmail.trim().toLowerCase();
    const formattedDate = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodFlow - Delivery Verification OTP #${orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B35 0%, #EA580C 50%, #D97706 100%); padding: 36px 32px 30px 32px; text-align: center;">
              <div style="margin-bottom: 12px;">
                <span style="font-size: 28px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px; text-transform: uppercase;">
                  FOOD<span style="color: #FFE8DF; font-weight: 400;">FLOW</span>
                </span>
              </div>
              <div style="display: inline-block; background-color: rgba(255,255,255,0.22); padding: 5px 18px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.3);">
                <span style="font-size: 11px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; text-transform: uppercase;">🚴 Out for Delivery</span>
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Your Delivery Verification OTP</h1>
              <p style="margin: 6px 0 0 0; color: #FFE8DF; font-size: 13px; font-weight: 500;">
                Share this secure code with your rider upon receiving your order.
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.5;">
                Hello <strong>${userName || "Valued Customer"}</strong>,<br/>
                Your rider is currently on the way with your delicious order from <strong>${restaurantName || "FoodFlow Restaurant"}</strong>!
              </p>

              <!-- OTP Highlight Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-radius: 20px; border: 2px dashed #F97316; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 26px 20px;">
                    <div style="font-size: 12px; font-weight: 800; color: #C2410C; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      Secure Delivery OTP Code
                    </div>
                    <div style="font-size: 38px; font-weight: 900; color: #EA580C; letter-spacing: 8px; font-family: monospace; background-color: #FFFFFF; display: inline-block; padding: 10px 24px; border-radius: 14px; border: 1px solid #FDBA74; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.1);">
                      ${otp}
                    </div>
                    <div style="font-size: 12px; color: #9A3412; font-weight: 600; margin-top: 10px;">
                      ⚡ Please provide this 6-digit OTP code to the rider to confirm delivery.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Order Summary Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Order Reference:</td>
                        <td align="right" style="font-size: 13px; font-weight: 800; color: #0F172A;">#${orderId}</td>
                      </tr>
                      ${
                        restaurantName
                          ? `
                      <tr>
                        <td style="font-size: 13px; color: #64748B; padding-top: 8px;">Restaurant:</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #0F172A; padding-top: 8px;">${restaurantName}</td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        typeof totalAmount === "number"
                          ? `
                      <tr>
                        <td style="font-size: 13px; color: #64748B; padding-top: 8px;">Total Amount:</td>
                        <td align="right" style="font-size: 14px; font-weight: 800; color: #FF6B35; padding-top: 8px;">Tk ${totalAmount.toFixed(2)}</td>
                      </tr>
                      `
                          : ""
                      }
                      <tr>
                        <td style="font-size: 13px; color: #64748B; padding-top: 8px;">Generated Time:</td>
                        <td align="right" style="font-size: 12px; font-weight: 600; color: #475569; padding-top: 8px;">${formattedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 14px 16px; font-size: 12px; color: #1E40AF; line-height: 1.5;">
                🔒 <strong>Delivery Security Notice:</strong> Never share this OTP before the rider arrives with your food. Once the rider inputs this code, the order will be finalized as delivered.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #F1F5F9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #0F172A; font-weight: 700;">
                Food Flow &bull; Fast, Fresh & Reliable Food Delivery
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                Need help with your delivery? Contact customer support at <a href="mailto:support.foodflow@gmail.com" style="color: #FF6B35; text-decoration: none; font-weight: 700;">support.foodflow@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailText = `
Food Flow - Delivery Verification OTP

Order Reference: #${orderId}
Hello ${userName || "Customer"},

Your order is out for delivery!
Your Delivery Verification OTP is: ${otp}

Please give this 6-digit code to your delivery rider when you receive your order to confirm delivery.

Order Details:
- Order Reference: #${orderId}
- Restaurant: ${restaurantName || "FoodFlow Kitchen"}
${typeof totalAmount === "number" ? `- Total Amount: Tk ${totalAmount.toFixed(2)}\n` : ""}

Never share this code until the rider has arrived with your food package.
Need help? Contact support.foodflow@gmail.com
    `.trim();

    return await sendEmail({
      to: normalizedEmail,
      subject: `🔑 Your Food Flow Delivery OTP [${otp}] for Order #${orderId}`,
      html: emailHtml,
      text: emailText,
    });
  } catch (err) {
    console.error("⚠️ Error sending delivery OTP email:", err);
    return false;
  }
}

/**
 * Send a Delivery Success / Order Completed confirmation email to the customer.
 */
export async function sendDeliverySuccessEmail(order: TOrderEmailPayload): Promise<boolean> {
  try {
    if (!order || !order.userEmail) {
      console.warn("⚠️ Cannot send delivery success email: Missing userEmail.");
      return false;
    }

    const normalizedEmail = order.userEmail.trim().toLowerCase();

    const paymentMethodLabel =
      order.paymentMethod === "STRIPE"
        ? "Online Payment"
        : order.paymentMethod === "COD"
        ? "Cash on Delivery (COD)"
        : order.paymentMethod;

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        });

    const deliveredDate = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const itemsHtml = (order.items || [])
      .map((item) => {
        const unitPrice = item.discountPrice || item.price;
        const itemTotal = unitPrice * item.quantity;
        return `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1E293B;">
              ${item.name}
              ${
                item.restaurantName
                  ? `<br/><span style="font-size: 11px; font-weight: 500; color: #64748B;">Store: ${item.restaurantName}</span>`
                  : ""
              }
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: #475569; text-align: center;">
              x${item.quantity}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0F172A; text-align: right;">
              $${itemTotal.toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join("");

    const subtotalCalc = order.subtotal ?? (order.totalAmount - (order.deliveryFee || 0) + (order.discount || 0));
    const deliveryFeeCalc = order.deliveryFee || 0;
    const discountCalc = order.discount || 0;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodFlow - Delivery Completed #${order.orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          
          <!-- Header with Emerald/Green Accent for Delivery Success -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%); padding: 36px 32px 30px 32px; text-align: center;">
              <div style="margin-bottom: 12px;">
                <span style="font-size: 28px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px; text-transform: uppercase; font-family: 'Segoe UI', Arial, sans-serif;">
                  FOOD<span style="color: #D1FAE5; font-weight: 400;">FLOW</span>
                </span>
              </div>
              <div style="display: inline-block; background-color: rgba(255,255,255,0.22); padding: 4px 16px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.3);">
                <span style="font-size: 11px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; text-transform: uppercase;">✅ Order Delivered Successfully</span>
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Your Order Has Been Delivered!</h1>
              <p style="margin: 6px 0 0 0; color: #D1FAE5; font-size: 13px; font-weight: 500;">
                Thank you for ordering with FoodFlow. We hope you enjoy your meal!
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">

              <!-- Order Reference Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ECFDF5; border-radius: 16px; border: 1px solid #A7F3D0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 12px; color: #065F46; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                          Order Reference
                        </td>
                        <td align="right" style="font-size: 12px; color: #065F46; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                          Delivered At
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 18px; font-weight: 900; color: #059669; padding-top: 4px;">
                          #${order.orderId}
                        </td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #475569; padding-top: 4px;">
                          ${deliveredDate}
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #6EE7B7;">
                      <div style="font-size: 13px; color: #475569;">
                        <strong>Payment Method:</strong> ${paymentMethodLabel}
                      </div>
                      <div style="margin-top: 4px;">
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; background-color: #ECFDF5; color: #059669; border: 1px solid #6EE7B7;">
                          Status: Delivered &amp; Paid ✅
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Delivery Address Section -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
                  📍 Delivery Address
                </h3>
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px; font-size: 13px; color: #334155; line-height: 1.6;">
                  <strong style="font-size: 14px; color: #0F172A;">${order.deliveryAddress?.fullName || order.userName || "Customer"}</strong><br/>
                  📞 Phone: <strong>${order.deliveryAddress?.phoneNumber || "N/A"}</strong><br/>
                  🏠 Address: ${order.deliveryAddress?.streetAddress || ""}, ${order.deliveryAddress?.area || ""}${
                    order.deliveryAddress?.city ? `, ${order.deliveryAddress.city}` : ""
                  }${order.deliveryAddress?.postalCode ? ` - ${order.deliveryAddress.postalCode}` : ""}
                </div>
              </div>

              <!-- Ordered Items Summary Table -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
                  🍔 Delivered Items Summary
                </h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase;">
                      <th align="left" style="padding: 10px 16px;">Item</th>
                      <th align="center" style="padding: 10px 16px;">Qty</th>
                      <th align="right" style="padding: 10px 16px;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Total Amount Breakdown -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="right">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 240px; font-size: 13px; color: #475569;">
                      <tr>
                        <td style="padding: 4px 0;">Subtotal:</td>
                        <td align="right" style="font-weight: 600; color: #1E293B;">$${subtotalCalc.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">Delivery Fee:</td>
                        <td align="right" style="font-weight: 600; color: #1E293B;">$${deliveryFeeCalc.toFixed(2)}</td>
                      </tr>
                      ${
                        discountCalc > 0
                          ? `
                      <tr>
                        <td style="padding: 4px 0; color: #059669;">Discount:</td>
                        <td align="right" style="font-weight: 700; color: #059669;">-$${discountCalc.toFixed(2)}</td>
                      </tr>
                      `
                          : ""
                      }
                      <tr style="border-top: 2px solid #E2E8F0;">
                        <td style="padding: 10px 0 0 0; font-size: 16px; font-weight: 900; color: #0F172A;">Total Paid:</td>
                        <td align="right" style="padding: 10px 0 0 0; font-size: 20px; font-weight: 900; color: #059669;">$${order.totalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 14px 18px; font-size: 12px; color: #065F46; line-height: 1.5;">
                🎉 <strong>Delivery Complete:</strong> Your order has been successfully delivered and marked as paid. You can now view and download your official invoice from your FoodFlow dashboard. Thank you for choosing FoodFlow!
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #F1F5F9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #0F172A; font-weight: 700;">
                Food Flow &bull; Fast, Fresh &amp; Reliable Food Delivery
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                Need help? Contact customer support at <a href="mailto:support.foodflow@gmail.com" style="color: #FF6B35; text-decoration: none; font-weight: 700;">support.foodflow@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailText = `
Food Flow - Delivery Completed Successfully

Order Reference: #${order.orderId}
Delivered At: ${deliveredDate}
Payment Method: ${paymentMethodLabel}
Order Status: Delivered & Paid

Delivery Address:
Customer: ${order.deliveryAddress?.fullName || order.userName || "Customer"}
Phone: ${order.deliveryAddress?.phoneNumber || "N/A"}
Address: ${order.deliveryAddress?.streetAddress || ""}, ${order.deliveryAddress?.area || ""}${
      order.deliveryAddress?.city ? `, ${order.deliveryAddress.city}` : ""
    }${order.deliveryAddress?.postalCode ? ` - ${order.deliveryAddress.postalCode}` : ""}

Delivered Items:
${(order.items || [])
  .map(
    (item) =>
      `- ${item.quantity}x ${item.name} ($${((item.discountPrice || item.price) * item.quantity).toFixed(2)})`
  )
  .join("\n")}

Subtotal: $${subtotalCalc.toFixed(2)}
Delivery Fee: $${deliveryFeeCalc.toFixed(2)}
${discountCalc > 0 ? `Discount: -$${discountCalc.toFixed(2)}\n` : ""}
Total Paid: $${order.totalAmount.toFixed(2)}

Your official invoice is now available on your FoodFlow dashboard.
Need help? Contact support.foodflow@gmail.com
    `.trim();

    return await sendEmail({
      to: normalizedEmail,
      subject: `✅ Food Flow Order Delivered #${order.orderId} — Enjoy Your Meal!`,
      html: emailHtml,
      text: emailText,
    });
  } catch (err) {
    console.error("⚠️ Error sending delivery success email:", err);
    return false;
  }
}

