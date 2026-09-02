"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    question: "How do I place an order on Food Flow?",
    answer:
      "Simply browse restaurants near you, select your favorite dishes, add them to your cart, and proceed to checkout. You can pay using bKash, Nagad, credit/debit cards, or cash on delivery. Once confirmed, you'll receive real-time tracking updates until your food arrives at your doorstep.",
  },
  {
    question: "What payment options are available?",
    answer:
      "We support a wide range of payment methods including bKash, Nagad, Rocket, Visa, Mastercard, and cash on delivery. All online transactions are encrypted and secured to ensure your financial information stays safe.",
  },
  {
    question: "How can I become a delivery partner?",
    answer:
      "We're always looking for reliable riders! Head to the Rider Registration page, fill out the application form with your details, and submit the required documents. Our team will review your application within 48 hours. Once approved, you'll receive training and can start accepting deliveries right away.",
  },
  {
    question: "Can I cancel my order after placing it?",
    answer:
      "Yes, you can cancel your order within 5 minutes of placing it from the Order Tracking page. After that window, the restaurant may have already started preparing your food. If you face any issues, contact our support team through the in-app chat or call us — we'll do our best to help.",
  },
  {
    question: "How do I track my order in real time?",
    answer:
      "Once your order is confirmed, you'll see a live tracking map on the Order Tracking page showing your rider's location in real time. You'll also receive SMS and in-app notifications at every stage — from restaurant preparation to out-for-delivery to doorstep arrival.",
  },
];

const headerVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

const AccordionItem = ({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <motion.div variants={itemVariants}>
      <div
        className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
          isOpen
            ? "border-orange-200 bg-orange-50/40 shadow-md shadow-orange-500/5"
            : "border-gray-100 bg-white shadow-xs hover:border-orange-100 hover:shadow-sm"
        }`}
      >
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
          aria-expanded={isOpen}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
              isOpen ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-500"
            }`}
          >
            <HelpCircle className="h-5 w-5" />
          </div>

          <span
            className={`flex-1 text-sm font-semibold sm:text-base transition-colors duration-200 ${
              isOpen ? "text-orange-600" : "text-gray-800"
            }`}
          >
            {item.question}
          </span>

          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown
              className={`h-5 w-5 transition-colors duration-200 ${
                isOpen ? "text-orange-500" : "text-gray-400"
              }`}
            />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="border-t border-orange-100/60 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                <div className="ml-14">
                  <p className="text-sm leading-relaxed text-gray-500 sm:text-[15px]">
                    {item.answer}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600 sm:text-sm"
          >
            <HelpCircle className="h-4 w-4" />
            Frequently Asked Questions
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          >
            Got Questions?{" "}
            <span className="text-orange-500">We&apos;ve Got Answers.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-4 text-sm leading-7 text-gray-500 sm:text-base sm:leading-8"
          >
            Everything you need to know about ordering, payments, delivery,
            and more. Can&apos;t find what you&apos;re looking for? Reach out to our
            support team.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mx-auto mt-10 max-w-2xl space-y-3 sm:mt-14 sm:space-y-4"
        >
          {faqData.map((item, index) => (
            <AccordionItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FaqSection;
