"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Search,
    ShoppingBag,
    MapPin,
    UtensilsCrossed,
    Zap,
} from "lucide-react";

const steps = [
    {
        number: "01",
        title: "Browse",
        description:
            "Explore a wide range of restaurants and cuisines near you. Filter by rating, delivery time, or your favorite food type.",
        icon: Search,
    },
    {
        number: "02",
        title: "Choose",
        description:
            "Pick your favorite dishes, customize your order, and add everything to your cart in seconds.",
        icon: ShoppingBag,
    },
    {
        number: "03",
        title: "Track",
        description:
            "Place your order and follow it in real time — from the restaurant kitchen to your doorstep.",
        icon: MapPin,
    },
    {
        number: "04",
        title: "Enjoy",
        description:
            "Receive your fresh, hot meal at your door. Sit back, relax, and savor every bite.",
        icon: UtensilsCrossed,
    },
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.15,
        },
    },
};

const cardVariants = {
    hidden: {
        opacity: 0,
        y: 30,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
        },
    },
};

const lineVariants = {
    hidden: {
        scaleX: 0,
    },
    visible: {
        scaleX: 1,
        transition: {
            duration: 0.8,
            ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
            delay: 0.3,
        },
    },
};

const verticalLineVariants = {
    hidden: {
        scaleY: 0,
    },
    visible: {
        scaleY: 1,
        transition: {
            duration: 1,
            ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
            delay: 0.2,
        },
    },
};

const HowItWorks = () => {
    return (
        <section className="relative overflow-hidden bg-white">
            <div className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-orange-100/40 blur-3xl" />
            <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/60 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
                {/* ================= HEADER ================= */}
                <div className="text-center">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600 sm:text-sm"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        How It Works
                    </motion.span>

                    <motion.h2
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                    >
                        Order in{" "}
                        <span className="text-orange-500">4 Simple Steps</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-500 sm:text-base"
                    >
                        Getting your favorite food has never been easier.
                        From browsing to biting — it&apos;s just a few taps away.
                    </motion.p>
                </div>

                {/* ================= DESKTOP HORIZONTAL TIMELINE (lg+) ================= */}
                <div className="relative mt-16 hidden lg:block">
                    {/* Connecting Line */}
                    <motion.div
                        variants={lineVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        className="absolute left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] top-[52px] h-[2px] origin-left"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(90deg, #f97316 0, #f97316 8px, transparent 8px, transparent 16px)",
                        }}
                    />

                    {/* Step Cards */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        className="grid grid-cols-4 gap-8"
                    >
                        {steps.map((step) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={step.number}
                                    variants={cardVariants}
                                    whileHover={{ y: -6 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 20,
                                    }}
                                    className="relative flex flex-col items-center text-center"
                                >
                                    {/* Number Badge */}
                                    <div className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-orange-500 text-sm font-bold text-white shadow-lg shadow-orange-500/25">
                                        <Icon className="h-6 w-6" />
                                    </div>

                                    {/* Step Number */}
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">
                                        Step {step.number}
                                    </p>

                                    {/* Title */}
                                    <h3 className="mt-2 text-lg font-bold text-gray-900">
                                        {step.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="mt-2 max-w-[240px] text-sm leading-6 text-gray-500">
                                        {step.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>

                {/* ================= MOBILE / TABLET VERTICAL TIMELINE (<lg) ================= */}
                <div className="relative mt-12 space-y-0 lg:hidden">
                    {/* Vertical Connecting Line */}
                    <motion.div
                        variants={verticalLineVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.1 }}
                        className="absolute left-[27px] top-6 bottom-6 w-[2px] origin-top"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(180deg, #f97316 0, #f97316 8px, transparent 8px, transparent 16px)",
                        }}
                    />

                    {/* Step Cards */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.1 }}
                        className="space-y-8"
                    >
                        {steps.map((step) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={step.number}
                                    variants={cardVariants}
                                    className="relative flex items-start gap-5"
                                >
                                    {/* Number Badge */}
                                    <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-orange-500 text-white shadow-lg shadow-orange-500/25">
                                        <Icon className="h-6 w-6" />
                                    </div>

                                    {/* Content */}
                                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">
                                            Step {step.number}
                                        </p>
                                        <h3 className="mt-1 text-lg font-bold text-gray-900">
                                            {step.title}
                                        </h3>
                                        <p className="mt-1.5 text-sm leading-6 text-gray-500">
                                            {step.description}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>

                {/* ================= BOTTOM CTA ================= */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mt-14 text-center"
                >
                    <a
                        href="/restaurants"
                        className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30"
                    >
                        Start Ordering Now
                        <UtensilsCrossed className="h-4 w-4" />
                    </a>
                </motion.div>
            </div>
        </section>
    );
};

export default HowItWorks;
