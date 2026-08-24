"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Copy,
    Check,
    Clock3,
    ArrowRight,
    Sparkles,
    Percent,
} from "lucide-react";

const COUPON_CODE = "WELCOME30";

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.12,
        },
    },
};

const leftVariants = {
    hidden: { opacity: 0, x: -40 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
    },
};

const rightVariants = {
    hidden: { opacity: 0, x: 40 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
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

const SpecialOffer = () => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(COUPON_CODE);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textarea = document.createElement("textarea");
            textarea.value = COUPON_CODE;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    className="relative overflow-hidden rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50/80 shadow-xl shadow-orange-200/40"
                >
                    {/* Background glow effects */}
                    <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-100/40 blur-3xl" />

                    <div className="relative grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:gap-0 lg:p-0">
                        {/* ============ LEFT CONTENT ============ */}
                        <motion.div
                            variants={leftVariants}
                            className="flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-14"
                        >
                            {/* Limited Time Badge */}
                            <motion.div variants={itemVariants}>
                                <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-600 sm:text-sm">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Limited Time Offer
                                </div>
                            </motion.div>

                            {/* Heading */}
                            <motion.div variants={itemVariants}>
                                <h2 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                                    Get{" "}
                                    <span className="relative inline-block">
                                        <span className="relative z-10 text-orange-500">
                                            30% OFF
                                        </span>
                                        <span className="absolute bottom-1 left-0 z-0 h-3 w-full bg-orange-200/60 sm:h-4" />
                                    </span>{" "}
                                    Your First Order
                                </h2>
                            </motion.div>

                            {/* Description */}
                            <motion.p
                                variants={itemVariants}
                                className="max-w-md text-sm leading-7 text-gray-500 sm:text-base sm:leading-8"
                            >
                                Sign up today and enjoy a delicious discount on your
                                very first order. Fresh meals, fast delivery, and
                                unbeatable savings await!
                            </motion.p>

                            {/* Coupon Code Box */}
                            <motion.div variants={itemVariants}>
                                <div className="flex max-w-sm items-center gap-3">
                                    <div className="flex flex-1 items-center gap-2 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-3">
                                        <Percent className="h-4 w-4 text-orange-500" />
                                        <span className="font-mono text-lg font-bold tracking-widest text-gray-900 sm:text-xl">
                                            {COUPON_CODE}
                                        </span>
                                    </div>
                                    <motion.button
                                        onClick={handleCopy}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
                                            copied
                                                ? "border-emerald-300 bg-emerald-100 text-emerald-600"
                                                : "border-orange-200 bg-orange-100 text-orange-500 hover:bg-orange-200"
                                        }`}
                                        title="Copy coupon code"
                                    >
                                        {copied ? (
                                            <Check className="h-5 w-5" />
                                        ) : (
                                            <Copy className="h-5 w-5" />
                                        )}
                                    </motion.button>
                                </div>
                                {copied && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-2 text-xs font-medium text-emerald-600"
                                    >
                                        Copied to clipboard!
                                    </motion.p>
                                )}
                            </motion.div>

                            {/* CTA Buttons */}
                            <motion.div
                                variants={itemVariants}
                                className="flex flex-wrap items-center gap-4 pt-2"
                            >
                                <Link href="/offers">
                                    <motion.span
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-orange-600 sm:text-base"
                                    >
                                        Order Now
                                        <ArrowRight className="h-4 w-4" />
                                    </motion.span>
                                </Link>
                                <Link href="/terms">
                                    <motion.span
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-600 transition-colors hover:border-orange-300 hover:text-orange-600 sm:text-base"
                                    >
                                        View Terms
                                    </motion.span>
                                </Link>
                            </motion.div>
                        </motion.div>

                        {/* ============ RIGHT IMAGE CARD ============ */}
                        <motion.div
                            variants={rightVariants}
                            className="relative mx-6 my-6 sm:mx-10 sm:my-8 lg:mx-0 lg:my-0 lg:h-full"
                        >
                            <div className="relative overflow-hidden rounded-3xl lg:h-[420px]">
                                {/* Food Image */}
                                <img
                                    src="https://i.ibb.co.com/KxjqtRzs/food-img.jpg"
                                    alt="Delicious pizza with fresh toppings"
                                    className="h-full w-full object-cover"
                                />

                                {/* Light overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                                {/* Floating Discount Badge */}
                                <motion.div
                                    animate={{
                                        y: [0, -8, 0],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    className="absolute right-4 top-4 sm:right-6 sm:top-6"
                                >
                                    <div className="flex flex-col items-center rounded-2xl bg-orange-500 px-4 py-3 shadow-xl shadow-orange-500/30 sm:px-5 sm:py-4">
                                        <Sparkles className="mb-1 h-4 w-4 text-orange-100 sm:h-5 sm:w-5" />
                                        <span className="text-2xl font-extrabold leading-none text-white sm:text-3xl">
                                            30%
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100 sm:text-xs">
                                            OFF
                                        </span>
                                    </div>
                                </motion.div>

                                {/* Bottom info strip */}
                                <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-gradient-to-t from-black/50 to-transparent px-5 py-4 sm:px-6 sm:py-5">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/90">
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            Welcome Deal
                                        </p>
                                        <p className="text-xs text-white/80">
                                            Valid for new customers only
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default SpecialOffer;
