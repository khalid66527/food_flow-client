"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  FileText,
  UserCheck,
  Users,
  ShoppingBag,
  Bike,
  XCircle,
  Tag,
  Copyright,
  ShieldAlert,
  Scale,
  RefreshCw,
  Mail,
  Eye,
  ChevronRight,
  AlertTriangle,
  Star,
  Ban,
  Leaf,
  CloudLightning,
  Accessibility,
  List,
  ChevronDown,
} from "lucide-react";

const lastUpdated = "August 19, 2026";

const sections = [
  {
    icon: FileText,
    title: "Acceptance of Terms",
    content: [
      {
        subtitle: "",
        text: 'By accessing or using the Food Flow platform (the "Platform"), including our website, mobile applications and related services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must not access or use the Platform. These terms constitute a legally binding agreement between you ("User", "you" or "your") and Food Flow ("we", "us" or "our").',
      },
      {
        subtitle: "Updates to Terms",
        text: "We reserve the right to modify these Terms at any time. When we make material changes, we will notify you via email or an in-app banner at least 14 days before the changes take effect. Your continued use of the Platform after the effective date constitutes acceptance of the updated Terms.",
      },
    ],
  },
  {
    icon: UserCheck,
    title: "Account Registration & Eligibility",
    content: [
      {
        subtitle: "Eligibility",
        text: "You must be at least 13 years old to create an account and use the Platform. By registering, you represent that you meet this age requirement and have the legal capacity to enter into these Terms.",
      },
      {
        subtitle: "Account Security",
        text: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately at support@foodflow.com if you suspect any unauthorised access to your account.",
      },
      {
        subtitle: "Accurate Information",
        text: "You agree to provide accurate, current and complete information during registration and to keep your account information up to date. Providing false or misleading information may result in account suspension or termination.",
      },
      {
        subtitle: "One Account Per Person",
        text: "Each individual may maintain only one active account on the Platform. Duplicate accounts may be merged or removed at our discretion.",
      },
    ],
  },
  {
    icon: Users,
    title: "User Roles & Responsibilities",
    content: [
      {
        subtitle: "Customers",
        text: "Customers may browse menus, place orders, make payments and track deliveries. Customers are responsible for providing accurate delivery addresses, being available to receive orders and inspecting food upon delivery.",
      },
      {
        subtitle: "Restaurant Partners",
        text: "Restaurant Partners are responsible for maintaining accurate menu listings (including prices, descriptions and allergen information), preparing orders to the standard described, meeting food safety and hygiene requirements, and fulfilling orders within the estimated preparation time.",
      },
      {
        subtitle: "Delivery Partners (Riders)",
        text: "Delivery Partners are responsible for picking up orders from restaurants and delivering them to customers promptly and safely. Riders must maintain valid identification, comply with traffic laws and treat customers and restaurant staff with respect.",
      },
      {
        subtitle: "Admin Users",
        text: "Admin Users have elevated access to the Platform for management and moderation purposes. Admin access is not publicly available and is granted only by invitation from Food Flow management.",
      },
    ],
  },
  {
    icon: ShoppingBag,
    title: "Ordering & Payments",
    content: [
      {
        subtitle: "Placing Orders",
        text: "When you place an order through the Platform, you are making an offer to purchase food items from the selected restaurant. Orders are subject to restaurant acceptance, item availability and price accuracy. We reserve the right to cancel orders in cases of pricing errors, suspected fraud or restaurant unavailability.",
      },
      {
        subtitle: "Pricing",
        text: "All prices displayed on the Platform are in Bangladeshi Taka (BDT) unless otherwise indicated. Prices include applicable taxes. Delivery fees, service charges and any applicable tips are displayed at checkout before you confirm your order. Restaurant partners set their own prices and may change them without prior notice.",
      },
      {
        subtitle: "Payment Methods",
        text: "We accept payments via SSLCommerz and Stripe, supporting bKash, Nagad, Rocket, credit/debit cards and other methods as displayed at checkout. All payment information is processed securely by our PCI-DSS compliant payment partners. We do not store your full card details on our servers.",
      },
      {
        subtitle: "Payment Authorization",
        text: "By providing a payment method, you represent and warrant that you are authorised to use the designated payment method and that you authorise us to charge your payment method for the total amount of your order (including delivery fees, service charges and applicable taxes).",
      },
      {
        subtitle: "Promotional Credits",
        text: "Any promotional credits, bonuses or referral rewards issued by Food Flow are non-transferable, have no cash value and may expire. We reserve the right to modify or revoke promotional credits at any time with reasonable notice.",
      },
    ],
  },
  {
    icon: Bike,
    title: "Delivery Terms",
    content: [
      {
        subtitle: "Delivery Areas",
        text: "Food Flow currently serves select areas within Chattogram, Bangladesh. Delivery availability depends on your location and the operating areas of our partner restaurants and riders. We do not guarantee delivery to all addresses within listed areas.",
      },
      {
        subtitle: "Estimated Delivery Times",
        text: "Delivery time estimates shown on the Platform are approximations and not guarantees. Actual delivery times may vary due to weather, traffic, restaurant preparation times, rider availability and other factors. We are not liable for delays beyond our reasonable control.",
      },
      {
        subtitle: "Order Pickup",
        text: "For successful delivery, a valid address and contact number must be provided. If the rider is unable to reach you after reasonable attempts, the order may be marked as delivered or returned to the restaurant. Additional charges may apply for redelivery.",
      },
      {
        subtitle: "Contactless Delivery",
        text: "Where available, you may request contactless delivery by adding instructions in the order notes. The rider will leave your order at the specified location and notify you upon arrival.",
      },
    ],
  },
  {
    icon: XCircle,
    title: "Cancellation & Refunds",
    content: [
      {
        subtitle: "Customer Cancellation",
        text: "You may cancel an order within 5 minutes of placing it, provided the restaurant has not yet begun preparation. After this window, cancellation is at the restaurant's discretion. If an order is cancelled after payment, a refund will be processed to your original payment method within 5\u20137 business days.",
      },
      {
        subtitle: "Restaurant Cancellation",
        text: "If a restaurant cancels your order (e.g., due to item unavailability or closure), you will receive a full refund to your original payment method. You will be notified via email and in-app notification.",
      },
      {
        subtitle: "Refund Eligibility",
        text: "You may be eligible for a full or partial refund if your order is significantly different from what was described, items are missing, the food quality is unacceptable or the order is severely delayed. Refund requests must be submitted within 24 hours of delivery through the Order Details page or by contacting support.",
      },
      {
        subtitle: "Refund Processing",
        text: "Approved refunds are processed to the original payment method. Processing times depend on your bank or payment provider, typically between 5\u201314 business days. Promotional discounts or coupon-based orders will be refunded at the actual amount paid after discounts.",
      },
    ],
  },
  {
    icon: Tag,
    title: "Coupons & Promotions",
    content: [
      {
        subtitle: "",
        text: "Food Flow may offer coupons, discount codes and promotional offers from time to time. These promotions are subject to their specific terms and conditions, including expiry dates, minimum order amounts and applicable restaurants. Coupons are non-transferable, cannot be combined with other offers (unless stated) and have no cash value. We reserve the right to modify, suspend or terminate any promotion at any time. Abuse of promotional offers, including creating multiple accounts to redeem the same promotion, may result in account suspension.",
      },
    ],
  },
  {
    icon: Copyright,
    title: "Intellectual Property",
    content: [
      {
        subtitle: "",
        text: 'All content on the Platform \u2014 including but not limited to logos, trademarks, text, graphics, images, software, designs and UI elements \u2014 is the property of Food Flow or its licensors and is protected under Bangladeshi and international intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to access and use the Platform for personal, non-commercial purposes. You may not copy, modify, distribute, sell or lease any part of our Platform or its content without our prior written consent.',
      },
      {
        subtitle: "User-Generated Content",
        text: "By submitting reviews, ratings, photos or other content to the Platform, you grant Food Flow a non-exclusive, worldwide, royalty-free licence to use, display, reproduce and distribute that content in connection with operating and promoting the Platform. You retain ownership of your content but warrant that it does not infringe on any third-party rights.",
      },
    ],
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    content: [
      {
        subtitle: "",
        text: "You may leave reviews and ratings for restaurants and food items after completing an order. Reviews must be honest, relevant and respectful. We reserve the right to remove reviews that contain offensive language, false information, spam or content that violates these Terms. Restaurant partners may respond to reviews but are prohibited from retaliating against customers who leave negative feedback. Food Flow does not guarantee the accuracy of user reviews and is not responsible for statements made by users.",
      },
    ],
  },
  {
    icon: Ban,
    title: "Prohibited Conduct",
    content: [
      {
        subtitle: "",
        text: "You agree not to: (a) use the Platform for any unlawful purpose; (b) create fake accounts or submit false information; (c) attempt to gain unauthorised access to other user accounts or our systems; (d) use automated tools (bots, scrapers) to access the Platform; (e) interfere with or disrupt the Platform or its servers; (f) harass, threaten or abuse other users, riders or restaurant staff; (g) use the Platform to resell food items or for commercial purposes without authorisation; or (h) circumvent any security features, rate limits or payment mechanisms. Violation of these prohibitions may result in immediate account suspension or termination without prior notice.",
      },
    ],
  },
  {
    icon: ShieldAlert,
    title: "Limitation of Liability",
    content: [
      {
        subtitle: "",
        text: "To the maximum extent permitted by law, Food Flow, its directors, employees and partners shall not be liable for any indirect, incidental, special, consequential or punitive damages arising out of or related to your use of the Platform. This includes, but is not limited to, loss of profits, data, goodwill or other intangible losses. Our total aggregate liability for any claim arising out of or relating to these Terms or the Platform shall not exceed the amount you paid to Food Flow in the 12 months immediately preceding the claim.",
      },
      {
        subtitle: "Third-Party Services",
        text: "The Platform relies on third-party services (payment processors, mapping providers, cloud hosting) that are not under our control. We are not liable for the acts, omissions or failures of these third-party providers, including payment processing errors, map inaccuracies or service outages.",
      },
    ],
  },
  {
    icon: Scale,
    title: "Indemnification",
    content: [
      {
        subtitle: "",
        text: "You agree to indemnify, defend and hold harmless Food Flow and its officers, directors, employees and agents from and against any and all claims, liabilities, damages, losses and expenses (including reasonable legal fees) arising out of or in any way connected with your use of the Platform, your violation of these Terms, or your violation of any rights of a third party.",
      },
    ],
  },
  {
    icon: Scale,
    title: "Governing Law & Disputes",
    content: [
      {
        subtitle: "Governing Law",
        text: "These Terms shall be governed by and construed in accordance with the laws of Bangladesh, without regard to its conflict of law provisions. Any disputes arising under these Terms shall first be attempted to be resolved through good-faith negotiation.",
      },
      {
        subtitle: "Dispute Resolution",
        text: "If a dispute cannot be resolved through negotiation within 30 days, either party may escalate the matter to mediation or, if necessary, to the competent courts of Chattogram, Bangladesh. You agree to submit to the exclusive jurisdiction of such courts.",
      },
      {
        subtitle: "Class Action Waiver",
        text: "To the extent permitted by law, you agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated or representative action.",
      },
    ],
  },
  {
    icon: AlertTriangle,
    title: "Termination",
    content: [
      {
        subtitle: "",
        text: "We reserve the right to suspend or terminate your account and access to the Platform at our sole discretion, without prior notice, for conduct that we believe violates these Terms, is harmful to other users, restaurants or riders, or is otherwise detrimental to the Platform. Upon termination, your right to use the Platform ceases immediately. We may retain certain data as required by law or for legitimate business purposes (e.g., financial records required under Bangladeshi tax law).",
      },
    ],
  },
  {
    icon: RefreshCw,
    title: "Changes to These Terms",
    content: [
      {
        subtitle: "",
        text: "We may update these Terms from time to time to reflect changes in our practices, technologies, legal requirements or other factors. When we make material changes, we will notify you via email or an in-app banner at least 14 days before the changes take effect. Your continued use of Food Flow after the effective date constitutes acceptance of the updated Terms. If you do not agree with the updated Terms, you must stop using the Platform and close your account.",
      },
    ],
  },
  {
    icon: Leaf,
    title: "Food Safety & Allergen Disclaimer",
    content: [
      {
        subtitle: "",
        text: "Food Flow acts as an intermediary between customers and restaurant partners. We do not prepare, cook or handle food. While we require restaurant partners to provide accurate allergen information, we cannot guarantee that all allergen data is complete or error-free. Customers with food allergies or dietary restrictions should contact the restaurant directly before placing an order. Food Flow is not liable for allergic reactions, food-borne illnesses or adverse health outcomes resulting from food purchased through the Platform.",
      },
    ],
  },
  {
    icon: CloudLightning,
    title: "Force Majeure",
    content: [
      {
        subtitle: "",
        text: "Food Flow shall not be held liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from circumstances beyond our reasonable control, including but not limited to natural disasters, pandemics, government restrictions, civil unrest, power outages, internet or telecommunications failures, cyber-attacks, or severe weather conditions. In such events, we will make reasonable efforts to resume services as soon as practicable and will notify affected users of any service disruptions.",
      },
    ],
  },
  {
    icon: Scale,
    title: "Severability",
    content: [
      {
        subtitle: "",
        text: "If any provision of these Terms is found to be invalid, illegal or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid or unenforceable provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving its original intent.",
      },
    ],
  },
  {
    icon: FileText,
    title: "Entire Agreement",
    content: [
      {
        subtitle: "",
        text: "These Terms, together with our Privacy Policy and any additional terms or policies referenced herein, constitute the entire agreement between you and Food Flow regarding your use of the Platform. They supersede all prior and contemporaneous agreements, understandings, representations and warranties, whether oral or written, relating to the Platform.",
      },
    ],
  },
  {
    icon: Accessibility,
    title: "Accessibility",
    content: [
      {
        subtitle: "",
        text: "Food Flow is committed to making our Platform accessible to all users, including those with disabilities. We strive to comply with WCAG 2.1 Level AA guidelines and continuously work to improve the accessibility of our website and dashboards. If you encounter any accessibility barriers while using the Platform, please contact us at support@foodflow.com and we will make reasonable efforts to address the issue.",
      },
    ],
  },
];

function TableOfContents({
  sections,
}: {
  sections: { icon: React.ElementType; title: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (title: string) => {
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-5 py-4 text-left transition-all hover:border-orange-200 hover:bg-orange-50/50 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <List className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Table of Contents
              </h2>
              <p className="text-xs text-gray-500">
                {sections.length} sections — jump to any topic
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 grid gap-1.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
                {sections.map((section, i) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.title}
                      onClick={() => scrollToSection(section.title)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-gray-600 transition-all hover:bg-orange-50 hover:text-orange-600"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate font-medium">
                        {i + 1}. {section.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

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

export default function TermsPage() {
  return (
    <div className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-orange-100/40 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-amber-50/60 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-[350px] w-[350px] rounded-full bg-orange-50/50 blur-[90px]" />

      <section className="relative border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24 lg:px-8">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600">
                <FileText className="h-3.5 w-3.5" />
                Legal
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
            >
              Terms &{" "}
              <span className="relative text-orange-500">
                Conditions
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
                  className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-orange-200"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg"
            >
              Please read these Terms and Conditions carefully before using the
              Food Flow platform. They govern your access to and use of our
              services, including ordering, delivery and account management.
            </motion.p>

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

      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <TableOfContents sections={sections} />
        </div>
      </section>

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
                  icon: UserCheck,
                  title: "You must be 13+ to use Food Flow",
                  desc: "By using the Platform, you agree to these Terms and confirm you meet the minimum age requirement.",
                },
                {
                  icon: ShieldAlert,
                  title: "We limit our liability",
                  desc: "Food Flow connects you with restaurants and riders. We are not responsible for food quality or third-party actions.",
                },
                {
                  icon: Scale,
                  title: "Disputes are governed by Bangladeshi law",
                  desc: "Any legal disputes fall under the jurisdiction of the courts of Chattogram, Bangladesh.",
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

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-4xl space-y-20">
          {sections.map((section, sIdx) => {
            const Icon = section.icon;
            return (
              <AnimatedSection key={section.title} delay={sIdx === 0 ? 0.1 : 0}>
                <div>
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
                      <h2
                        id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}
                        className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl scroll-mt-24"
                      >
                        {section.title}
                      </h2>
                      <div className="mt-1 h-0.5 w-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-200" />
                    </div>
                  </div>

                  <div className="mt-7 ml-[2.75rem] space-y-5 border-l-2 border-orange-100 pl-6">
                    {section.content.map((item, iIdx) => (
                      <AnimatedItem key={item.subtitle || iIdx} index={iIdx}>
                        <div className="group relative">
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
              Questions about our terms?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              If you have any questions, concerns or requests regarding these
              Terms and Conditions, our team is here to help.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Link
                  href="mailto:support@foodflow.com"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-orange-600"
                >
                  <Mail className="h-4 w-4" />
                  support@foodflow.com
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Link
                  href="/privacy"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                >
                  Read our Privacy Policy
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
