"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Shield,
  Database,
  Users,
  Share2,
  Lock,
  Mail,
  MapPin,
  CreditCard,
  Camera,
  Bell,
  Trash2,
  Edit3,
  AlertTriangle,
  ChevronRight,
  Eye,
} from "lucide-react";

const lastUpdated = "August 19, 2026";

/* ------------------------------------------------------------------ */
/*  Section data                                                       */
/* ------------------------------------------------------------------ */
const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    content: [
      {
        subtitle: "Account Information",
        text: "When you create an account, we collect your full name, email address, phone number (in Bangladeshi format), and password. Restaurant partners additionally provide business name, trade license details and bank account information. Delivery partners provide NID details, vehicle information and rider license.",
      },
      {
        subtitle: "Order & Transaction Data",
        text: "We store your order history, delivery addresses, payment method details (tokenised \u2014 we never store raw card numbers), transaction amounts and refund records.",
      },
      {
        subtitle: "Location Data",
        text: "With your permission, we collect real-time location data from your device to match you with nearby restaurants, assign riders and provide live order tracking.",
      },
      {
        subtitle: "Device & Usage Data",
        text: "We automatically collect IP address, browser type, device model, operating system, pages visited, time spent on pages, and referring URLs through cookies and similar technologies.",
      },
      {
        subtitle: "Communications",
        text: "Customer support messages, in-app chat logs, reviews, ratings and any feedback you voluntarily provide.",
      },
    ],
  },
  {
    icon: Users,
    title: "How We Use Your Information",
    content: [
      {
        subtitle: "Service Delivery",
        text: "Processing orders, calculating delivery times, routing riders, sending order confirmations and real-time tracking updates.",
      },
      {
        subtitle: "Account Management",
        text: "Creating and securing your account, verifying your identity, resetting passwords and managing your role (Customer, Restaurant Partner or Delivery Partner).",
      },
      {
        subtitle: "Payments",
        text: "Facilitating payments through our payment partners (SSLCommerz / Stripe), processing refunds, and generating invoices and earnings reports.",
      },
      {
        subtitle: "Communication",
        text: "Sending transactional emails (order confirmations, receipts), push notifications (delivery updates, promotions) and responding to your support queries.",
      },
      {
        subtitle: "Improvement & Analytics",
        text: "Analysing aggregated usage patterns to improve app performance, personalise your experience, optimise delivery routes and develop new features.",
      },
      {
        subtitle: "Legal Compliance",
        text: "Meeting regulatory obligations under Bangladeshi law, responding to lawful requests from government authorities, and enforcing our Terms of Service.",
      },
    ],
  },
  {
    icon: Share2,
    title: "How We Share Your Information",
    content: [
      {
        subtitle: "Restaurant Partners",
        text: "We share your name, delivery address, phone number and order details with the restaurant fulfilling your order.",
      },
      {
        subtitle: "Delivery Partners",
        text: "Your name, delivery address and phone number are shared with your assigned rider to complete delivery.",
      },
      {
        subtitle: "Payment Processors",
        text: "Payment information is securely transmitted to SSLCommerz or Stripe to process transactions. We do not store full card details on our servers.",
      },
      {
        subtitle: "Service Providers",
        text: "We share data with trusted third-party services for hosting (cloud infrastructure), analytics (Google Analytics), mapping (Google Maps API) and cloud storage (Cloudinary). These providers are contractually bound to protect your data.",
      },
      {
        subtitle: "Legal Requirements",
        text: "We may disclose information if required by law, court order or to protect the safety, rights or property of Food Flow, our users or the public.",
      },
    ],
  },
  {
    icon: Lock,
    title: "Data Security",
    content: [
      {
        subtitle: "",
        text: "We take data protection seriously. Your information is encrypted in transit (TLS 1.3) and at rest. We use industry-standard security practices including access controls, regular security audits and continuous monitoring. Authentication is handled through secure token-based sessions via Better Auth. While no system is 100% secure, we implement multiple layers of defence to safeguard your personal data against unauthorised access, alteration, disclosure or destruction.",
      },
    ],
  },
  {
    icon: MapPin,
    title: "Location Data",
    content: [
      {
        subtitle: "",
        text: "Location services are optional but enhance your experience. When enabled, we use your device\u2019s GPS to show nearby restaurants, provide accurate delivery estimates and enable real-time order tracking. You can disable location access at any time through your device settings. Disabling location may limit features like nearby restaurant suggestions and live tracking.",
      },
    ],
  },
  {
    icon: CreditCard,
    title: "Payment Security",
    content: [
      {
        subtitle: "",
        text: "All payment processing is handled by PCI-DSS compliant partners (SSLCommerz and Stripe). We use tokenisation to replace your card details with secure tokens, meaning your raw financial data never touches our servers. We do not store, read or have access to your full card number, CVV or PIN at any point.",
      },
    ],
  },
  {
    icon: Camera,
    title: "Cookies & Tracking Technologies",
    content: [
      {
        subtitle: "Essential Cookies",
        text: "Required for the platform to function \u2014 authentication sessions, security tokens and load balancing. These cannot be disabled.",
      },
      {
        subtitle: "Analytics Cookies",
        text: "Help us understand how users interact with the app so we can improve performance and usability. You can opt out through your browser settings.",
      },
      {
        subtitle: "Marketing Cookies",
        text: "Used to deliver relevant promotions and measure campaign effectiveness. These are optional and can be managed in your cookie preferences.",
      },
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    content: [
      {
        subtitle: "",
        text: "We send push notifications and emails for order updates, delivery status, promotional offers and account security alerts. You can manage your notification preferences in your account settings or through your device\u2019s notification settings. Opting out of promotional notifications will not affect transactional messages related to your active orders.",
      },
    ],
  },
  {
    icon: Edit3,
    title: "Your Rights",
    content: [
      {
        subtitle: "Access & Portability",
        text: "You have the right to request a copy of all personal data we hold about you in a structured, machine-readable format.",
      },
      {
        subtitle: "Correction",
        text: "You can update your name, email, phone number and other profile details at any time through your account settings. For changes that require verification, contact our support team.",
      },
      {
        subtitle: "Deletion",
        text: "You may request deletion of your account and associated personal data. Note that we may retain certain information for legal, financial or operational purposes (e.g., order records required under Bangladeshi tax law).",
      },
      {
        subtitle: "Restriction & Objection",
        text: "You may request that we limit or stop processing your personal data for certain purposes, subject to legal and contractual obligations.",
      },
      {
        subtitle: "Consent Withdrawal",
        text: "Where processing is based on your consent (e.g., marketing communications, location tracking), you may withdraw consent at any time without affecting the lawfulness of prior processing.",
      },
    ],
  },
  {
    icon: Trash2,
    title: "Data Retention",
    content: [
      {
        subtitle: "",
        text: "We retain your personal data for as long as your account is active or as needed to provide our services. Account data is kept for the lifetime of the account plus 30 days after deletion to allow for recovery. Order and transaction records are retained for 5 years in compliance with Bangladeshi financial regulations. Anonymised, aggregated data may be retained indefinitely for analytics purposes.",
      },
    ],
  },
  {
    icon: Share2,
    title: "Third-Party Links",
    content: [
      {
        subtitle: "",
        text: "Our platform may contain links to external websites (e.g., restaurant pages, social media, Google Maps). We are not responsible for the privacy practices of these external sites. We encourage you to read their privacy policies before sharing any personal information.",
      },
    ],
  },
  {
    icon: Users,
    title: "Children\u2019s Privacy",
    content: [
      {
        subtitle: "",
        text: "Food Flow is not intended for users under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take immediate steps to delete that information. If you are a parent or guardian and believe your child has shared information with us, please contact us immediately.",
      },
    ],
  },
  {
    icon: AlertTriangle,
    title: "Changes to This Policy",
    content: [
      {
        subtitle: "",
        text: "We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements or other factors. When we make material changes, we will notify you via email or an in-app banner at least 14 days before the changes take effect. Your continued use of Food Flow after the effective date constitutes acceptance of the updated policy.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Reusable animated section                                          */
/* ------------------------------------------------------------------ */
function AnimatedSection({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated sub-item (staggered paragraph entry)                      */
/* ------------------------------------------------------------------ */
function AnimatedItem({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{
        duration: 0.5,
        delay: index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PrivacyPage() {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* ============================================================ */}
      {/*  DECORATIVE BACKGROUND BLOBS                                 */}
      {/* ============================================================ */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-orange-100/40 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-amber-50/60 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-[350px] w-[350px] rounded-full bg-orange-50/50 blur-[90px]" />

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section className="relative border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24 lg:px-8">
          <div className="max-w-3xl">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600">
                <Shield className="h-3.5 w-3.5" />
                Legal
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
            >
              Privacy{" "}
              <span className="relative text-orange-500">
                Policy
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
                  className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-orange-200"
                />
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg"
            >
              Your privacy matters to us. This policy explains what data Food
              Flow collects, why we collect it, how we use it and the choices you
              have over your information.
            </motion.p>

            {/* Date + eye icon */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-7 flex items-center gap-3"
            >
              <div className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-sm text-gray-500 ring-1 ring-gray-100">
                <Eye className="h-3.5 w-3.5 text-orange-400" />
                <span className="font-medium text-gray-700">Last updated:</span>
                <time dateTime="2026-08-19">{lastUpdated}</time>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  QUICK SUMMARY                                                */}
      {/* ============================================================ */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50/80 via-orange-50/40 to-white p-6 shadow-sm shadow-orange-100/50 sm:p-8"
          >
            <h2 className="text-lg font-bold text-gray-900">
              In a nutshell
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {[
                {
                  icon: Database,
                  title: "We collect what we need",
                  desc: "Only the data required to deliver orders, process payments and keep your account secure.",
                },
                {
                  icon: Lock,
                  title: "We protect it seriously",
                  desc: "Encrypted in transit and at rest, with PCI-DSS compliant payment partners.",
                },
                {
                  icon: Edit3,
                  title: "You control your data",
                  desc: "Access, update, export or delete your information at any time from your account settings.",
                },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.15 + i * 0.12,
                      duration: 0.55,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(249,115,22,0.12)" }}
                    className="flex items-start gap-3.5 rounded-2xl bg-white/80 p-4 ring-1 ring-orange-50 backdrop-blur-sm transition-colors"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        delay: 0.3 + i * 0.12,
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600"
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {card.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">
                        {card.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  MAIN SECTIONS                                                */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-4xl space-y-20">
          {sections.map((section, sIdx) => {
            const Icon = section.icon;
            return (
              <AnimatedSection key={section.title} delay={sIdx === 0 ? 0.1 : 0}>
                <div>
                  {/* Section header */}
                  <div className="flex items-center gap-3.5">
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                        delay: 0.15,
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25"
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                        {section.title}
                      </h2>
                      <div className="mt-1 h-0.5 w-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-200" />
                    </div>
                  </div>

                  {/* Content items */}
                  <div className="mt-7 ml-[2.75rem] space-y-5 border-l-2 border-orange-100 pl-6">
                    {section.content.map((item, iIdx) => (
                      <AnimatedItem key={item.subtitle || iIdx} index={iIdx}>
                        <div className="group relative">
                          {/* Dot on the timeline */}
                          <div className="absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-orange-300 bg-white transition-colors group-hover:bg-orange-400 group-hover:border-orange-400" />

                          {item.subtitle && (
                            <h3 className="text-[0.95rem] font-semibold text-gray-900 transition-colors group-hover:text-orange-600">
                              {item.subtitle}
                            </h3>
                          )}
                          <p
                            className={`text-sm leading-relaxed text-gray-600 transition-all group-hover:text-gray-700 ${
                              item.subtitle ? "mt-1.5" : ""
                            }`}
                          >
                            {item.text}
                          </p>
                        </div>
                      </AnimatedItem>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CONTACT CTA                                                  */}
      {/* ============================================================ */}
      <section className="relative border-t border-gray-100 bg-gray-50/60">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-100/30 blur-[80px]" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-50/50 blur-[60px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Questions about your data?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              If you have any questions, concerns or requests regarding this
              Privacy Policy or how we handle your personal data, we are here to
              help.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Link
                  href="mailto:privacy@foodflow.com"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-orange-600"
                >
                  <Mail className="h-4 w-4" />
                  privacy@foodflow.com
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                >
                  Learn more about us
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}