"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Clock3,
    ArrowRight,
    Sparkles,
    Tag,
} from "lucide-react";
import { getCoupons } from "@/lib/api/coupon";

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
    const [LottieComp, setLottieComp] = useState<any>(null);
    const [discount20Data, setDiscount20Data] = useState<any>(null);
    const [discountText, setDiscountText] = useState<string>("20% OFF");
    const [discountShort, setDiscountShort] = useState<string>("20%");

    useEffect(() => {
        let isMounted = true;

        getCoupons("active")
            .then((res) => {
                if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
                    const welcomeCoupon = res.data.find(
                        (c) => c.isFirstOrderOnly || (c.code || "").toUpperCase().startsWith("WELCOME")
                    );
                    if (welcomeCoupon) {
                        if (welcomeCoupon.discountType === "percentage") {
                            setDiscountText(`${welcomeCoupon.discountValue}% OFF`);
                            setDiscountShort(`${welcomeCoupon.discountValue}%`);
                        } else {
                            setDiscountText(`৳${welcomeCoupon.discountValue} OFF`);
                            setDiscountShort(`৳${welcomeCoupon.discountValue}`);
                        }
                    }
                }
            })
            .catch((err) => console.warn("Failed to fetch active coupon for SpecialOffer:", err));

        import("lottie-react").then((mod: any) => {
            if (isMounted) {
                const Comp = mod.Lottie || mod.default;
                if (Comp) setLottieComp(() => Comp);
            }
        }).catch((err) => console.warn("Lottie import error:", err));

        fetch("/lottie/20-percent-off.json")
            .then((res) => res.json())
            .then((data) => {
                if (isMounted) setDiscount20Data(data);
            })
            .catch((err) => console.warn("Failed to load 20-percent-off.json:", err));

        return () => {
            isMounted = false;
        };
    }, []);

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
                                            {discountText}
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

                            {/* CTA Buttons */}
                            <motion.div
                                variants={itemVariants}
                                className="flex flex-wrap items-center gap-4 pt-2"
                            >
                                <Link href="/dishes">
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

                        {/* ============ RIGHT LOTTIE ANIMATION & IMAGE CARD ============ */}
                        <motion.div
                            variants={rightVariants}
                            className="relative mx-6 my-6 sm:mx-10 sm:my-8 lg:mx-0 lg:my-0 lg:h-full"
                        >
                            <div className="relative overflow-hidden rounded-3xl lg:h-[420px] bg-gradient-to-tr from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center p-4">
                                {/* Food Image Background */}
                                <img
                                    src="https://i.ibb.co.com/KxjqtRzs/food-img.jpg"
                                    alt="Delicious pizza with fresh toppings"
                                    className="h-full w-full object-cover rounded-2xl opacity-90"
                                />

                                {/* Dark Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

                                {/* 🎬 Integrated 20% OFF Lottie Animation Center Component */}
                                {LottieComp && discount20Data && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                                        <div className="w-56 h-56 sm:w-64 sm:h-64 drop-shadow-2xl">
                                            <LottieComp
                                                animationData={discount20Data}
                                                loop={true}
                                                autoplay={true}
                                                className="w-full h-full"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Floating Dynamic Lottie Badge */}
                                <motion.div
                                    animate={{
                                        y: [0, -8, 0],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    className="absolute right-4 top-4 sm:right-6 sm:top-6 z-20"
                                >
                                    <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 px-4 py-3 shadow-xl shadow-orange-500/40 border border-white/20 backdrop-blur-xs sm:px-5 sm:py-4">
                                        <Sparkles className="mb-1 h-4 w-4 text-amber-200 animate-spin sm:h-5 sm:w-5" />
                                        <span className="text-2xl font-black leading-none text-white sm:text-3xl">
                                            {discountShort}
                                        </span>
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-100 sm:text-xs">
                                            OFF
                                        </span>
                                    </div>
                                </motion.div>

                                {/* Bottom info strip */}
                                <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-5 py-4 sm:px-6 sm:py-5 z-10">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/90 shadow-md">
                                        <Tag className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            Welcome {discountText} Deal
                                        </p>
                                        <p className="text-xs text-white/80">
                                            Valid for new customers on first order
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
