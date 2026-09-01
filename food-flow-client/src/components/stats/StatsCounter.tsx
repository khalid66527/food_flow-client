"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Store, ShoppingBag, Bike, Clock } from "lucide-react";

function useCountUp(end: number, duration: number, inView: boolean) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!inView) {
            setCount(0);
            return;
        }

        let startTime: number | null = null;
        let animationFrame: number;

        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOut(progress);

            setCount(Math.floor(easedProgress * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, inView]);

    return count;
}

const stats = [
    {
        raw: 1200,
        suffix: "+",
        label: "Partner Restaurants",
        icon: Store,
        format: (n: number) => n.toLocaleString(),
    },
    {
        raw: 50000,
        suffix: "+",
        label: "Orders Delivered",
        icon: ShoppingBag,
        format: (n: number) => {
            if (n >= 1000) return `${Math.floor(n / 1000)}K`;
            return n.toLocaleString();
        },
    },
    {
        raw: 800,
        suffix: "+",
        label: "Active Riders",
        icon: Bike,
        format: (n: number) => n.toLocaleString(),
    },
    {
        raw: 28,
        suffix: " min",
        label: "Average Delivery",
        icon: Clock,
        format: (n: number) => `${n}`,
    },
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.12,
        },
    },
};

const statVariants = {
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut" as const,
        },
    },
};

const iconVariants = {
    hidden: { scale: 0 },
    visible: {
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 260,
            damping: 20,
            delay: 0.2,
        },
    },
};

const StatsCounter = () => {
    const ref = useRef(null);
    const inView = useInView(ref, { once: false, amount: 0.3 });

    return (
        <section
            ref={ref}
            className="relative bg-slate-50 py-16 sm:py-20 lg:py-24"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Trusted by Thousands
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500 sm:text-base">
                        Real numbers, real customers, real fast deliveries — every
                        day.
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4"
                >
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        const animatedValue = useCountUp(
                            stat.raw,
                            2000,
                            inView
                        );

                        return (
                            <motion.div
                                key={stat.label}
                                variants={statVariants}
                                className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white px-6 py-8 text-center shadow-sm transition-shadow hover:shadow-md"
                            >
                                {/* Icon */}
                                <motion.div
                                    variants={iconVariants}
                                    className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50"
                                >
                                    <Icon className="h-7 w-7 text-orange-500" />
                                </motion.div>

                                {/* Number */}
                                <p className="mt-5 text-4xl font-extrabold text-orange-500 sm:text-5xl">
                                    {stat.format(animatedValue)}
                                    <span className="text-2xl sm:text-3xl">
                                        {stat.suffix}
                                    </span>
                                </p>

                                {/* Label */}
                                <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
                                    {stat.label}
                                </p>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
};

export default StatsCounter;
