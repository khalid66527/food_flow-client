"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowRight,
    Flame,
    Fish,
    Beef,
    Soup,
    Leaf,
    Cake,
    Salad,
    Coffee,
} from "lucide-react";

const categories = [
    {
        name: "Pizza",
        icon: Flame,
        count: "120+",
        image:
            "https://i.ibb.co.com/wht1N8GQ/Pizza.avif",
    },
    {
        name: "Sushi",
        icon: Fish,
        count: "85+",
        image:
            "https://i.ibb.co.com/LDFM3Z6Q/Sushi.avif",
    },
    {
        name: "Burgers",
        icon: Beef,
        count: "95+",
        image:
            "https://i.ibb.co.com/Q7Q0qRpJ/Burgers.avif",
    },
    {
        name: "Chinese",
        icon: Soup,
        count: "110+",
        image:
            "https://i.ibb.co.com/nN14QMCf/Chinese.avif",
    },
    {
        name: "Thai",
        icon: Leaf,
        count: "70+",
        image:
            "https://i.ibb.co.com/sY7qR5x/Leaf.avif",
    },
    {
        name: "Desserts",
        icon: Cake,
        count: "60+",
        image:
            "https://i.ibb.co.com/SwcZrykb/Cake.avif",
    },
    {
        name: "Healthy",
        icon: Salad,
        count: "55+",
        image:
            "https://i.ibb.co.com/0yNPMTVf/Healthy-Pad-Thai-d069588.jpg",
    },
    {
        name: "Drinks",
        icon: Coffee,
        count: "45+",
        image:
            "https://i.ibb.co.com/gMrGh18Y/Drinks.jpg",
    },
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.08,
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

const FoodCategories = () => {
    return (
        <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* ================= HEADER ================= */}
                <div className="text-center">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600 sm:text-sm"
                    >
                        <Flame className="h-3.5 w-3.5" />
                        Browse by cuisine
                    </motion.span>

                    <motion.h2
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                    >
                        What Are You{" "}
                        <span className="text-orange-500">Craving?</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-500 sm:text-base"
                    >
                        Explore dishes from your favorite cuisines — fast
                        delivery, fresh flavors, and endless options.
                    </motion.p>
                </div>

                {/* ================= CATEGORY GRID ================= */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6"
                >
                    {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <motion.div
                                key={category.name}
                                variants={cardVariants}
                                whileHover={{ scale: 1.03 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20,
                                }}
                            >
                                <Link
                                    href={`/restaurants?cuisine=${category.name.toLowerCase()}`}
                                    className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-gray-100 shadow-sm transition-shadow duration-300 hover:shadow-xl"
                                >
                                    {/* Food Image */}
                                    <div className="absolute inset-0">
                                        <img
                                            src={category.image}
                                            alt={category.name}
                                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                                        />
                                    </div>

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                                    {/* Content */}
                                    <div className="absolute inset-x-0 bottom-0 flex flex-col p-4 sm:p-5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                                <Icon className="h-4.5 w-4.5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-white sm:text-lg">
                                                    {category.name}
                                                </h3>
                                                <p className="text-xs text-white/70">
                                                    {category.count} dishes
                                                </p>
                                            </div>
                                        </div>

                                        {/* Hover Arrow */}
                                        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-orange-300 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                                            Explore
                                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* ================= VIEW ALL BUTTON ================= */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mt-10 text-center"
                >
                    <Link
                        href="/restaurants"
                        className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-300 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 hover:shadow-md"
                    >
                        View All Cuisines
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};

export default FoodCategories;
