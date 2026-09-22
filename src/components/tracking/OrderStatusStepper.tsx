"use client";

import React from "react";
import { Check, ChefHat, Flame, PackageCheck, Bike, Home, X } from "lucide-react";

export const ORDER_STATUS_STEPS = [
  { key: "Pending", label: "Pending", description: "Order received", icon: Flame },
  { key: "Preparing", label: "Preparing", description: "Chef is cooking", icon: ChefHat },
  { key: "Ready", label: "Ready", description: "Ready to leave", icon: PackageCheck },
  { key: "Out for Delivery", label: "Out for Delivery", description: "Rider on the way", icon: Bike },
  { key: "Delivered", label: "Delivered", description: "Enjoy your meal", icon: Home },
] as const;

export type TOrderStepKey = (typeof ORDER_STATUS_STEPS)[number]["key"];

const STATUS_ALIASES: Record<string, number> = {
  pending: 0,
  placed: 0,
  confirmed: 1,
  preparing: 1,
  processing: 1,
  cooking: 1,
  ready: 2,
  readyforpickup: 2,
  "ready for pickup": 2,
  "out for delivery": 3,
  "outfordelivery": 3,
  assigned: 3,
  ontheway: 3,
  "on the way": 3,
  enroute: 3,
  "en route": 3,
  delivered: 4,
  completed: 4,
};

export function resolveStepIndex(status?: string): number {
  const s = (status || "pending").toLowerCase().trim();
  const aliased = STATUS_ALIASES[s];
  if (typeof aliased === "number") return aliased;

  const idx = ORDER_STATUS_STEPS.findIndex((step) => step.key.toLowerCase() === s);
  return idx === -1 ? 0 : idx;
}

interface OrderStatusStepperProps {
  currentStatus?: string;
  cancelled?: boolean;
}

export default function OrderStatusStepper({
  currentStatus,
  cancelled = false,
}: OrderStatusStepperProps) {
  const activeIndex = resolveStepIndex(currentStatus);
  const isDelivered = ["delivered", "completed"].includes(
    (currentStatus || "").toLowerCase().trim()
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {ORDER_STATUS_STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const done = isDelivered ? true : activeIndex > i;
          const active = isDelivered ? false : i === activeIndex;
          const isLast = i === ORDER_STATUS_STEPS.length - 1;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <div
                  className={[
                    "relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    done
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                      : active
                        ? "bg-gradient-to-r from-[#FF6B35] to-amber-500 border-[#FF6B35] text-white shadow-lg shadow-orange-500/40 animate-pulse"
                        : "bg-white border-gray-200 text-gray-300",
                  ].join(" ")}
                >
                  {done ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
                  ) : active && cancelled ? (
                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" strokeWidth={3} />
                  ) : (
                    <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                  {active && !cancelled && !isDelivered && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B35] opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FF6B35]" />
                    </span>
                  )}
                </div>

                <div className="text-center space-y-0.5">
                  <p
                    className={[
                      "text-[11px] sm:text-xs font-extrabold tracking-wide whitespace-nowrap",
                      done
                        ? "text-emerald-600"
                        : active
                          ? "text-[#FF6B35]"
                          : "text-gray-400",
                    ].join(" ")}
                  >
                    {step.label}
                  </p>
                  <p
                    className={[
                      "hidden sm:block text-[10px] font-medium",
                      done
                        ? "text-emerald-500"
                        : active
                          ? "text-gray-600"
                          : "text-gray-300",
                    ].join(" ")}
                  >
                    {done && step.key === "Delivered"
                      ? "Delivered successfully"
                      : active
                        ? step.description
                        : ""}
                  </p>
                </div>
              </div>

              {!isLast && (
                <div className="flex-1 min-w-4 -mt-7 px-1">
                  <div className="relative h-1 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={[
                        "absolute inset-y-0 left-0 transition-all duration-700 ease-out",
                        done || isDelivered
                          ? "bg-emerald-500 w-full"
                          : active && !cancelled
                            ? "w-1/2 animate-pulse bg-gradient-to-r from-[#FF6B35] to-amber-500"
                            : "w-0",
                      ].join(" ")}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}