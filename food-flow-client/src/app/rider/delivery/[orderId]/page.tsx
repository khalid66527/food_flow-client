"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, MapPin, Navigation, CheckCircle, Package, Truck, CircleCheck } from "lucide-react";
import { deliveryAPI } from "@/lib/api";
import { DeliveryAssignment } from "@/types/rider";

const STATUS_STEPS = ["accepted", "picked_up", "on_the_way", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  picked_up: "Picked Up",
  on_the_way: "On The Way",
  delivered: "Delivered",
};

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [delivery, setDelivery] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDelivery = useCallback(async () => {
    try {
      const res = await deliveryAPI.getActive();
      const active = res.data.data;
      if (active && active.orderId === orderId) {
        setDelivery(active);
      } else {
        setDelivery(null);
      }
    } catch {}
    setLoading(false);
  }, [orderId]);

  useEffect(() => { fetchDelivery(); }, [fetchDelivery]);

  const getStepIndex = (status: string) => STATUS_STEPS.indexOf(status);

  const handleAction = async (action: "pickup" | "on-the-way" | "delivered") => {
    setActionLoading(true);
    try {
      if (action === "pickup") await deliveryAPI.pickup(orderId);
      else if (action === "on-the-way") await deliveryAPI.onTheWay(orderId);
      else if (action === "delivered") await deliveryAPI.delivered(orderId);
      await fetchDelivery();
    } catch {}
    setActionLoading(false);
  };

  const getNextAction = () => {
    if (!delivery) return null;
    switch (delivery.status) {
      case "accepted": return { label: "Pick Up Order", action: "pickup" as const, icon: Package };
      case "picked_up": return { label: "Start Delivery", action: "on-the-way" as const, icon: Truck };
      case "on_the_way": return { label: "Mark Delivered", action: "delivered" as const, icon: CircleCheck };
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="p-4 md:ml-0">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 mb-4">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active delivery found</p>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(delivery.status);
  const nextAction = getNextAction();

  return (
    <div className="p-4 md:ml-0 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">{delivery.orderId}</h1>
          <span className="text-xs text-green-600 font-semibold">{STATUS_LABELS[delivery.status]}</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= currentStep ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-[10px] text-gray-500 mt-1">{STATUS_LABELS[step]}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? "bg-orange-500" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Pickup */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-green-600 font-semibold mb-1">PICKUP FROM</p>
            <p className="text-sm font-bold text-gray-900">{delivery.pickupRestaurant.name}</p>
            <p className="text-xs text-gray-500">{delivery.pickupRestaurant.address}</p>
            {delivery.pickupRestaurant.phone && (
              <a href={`tel:${delivery.pickupRestaurant.phone}`} className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                <Phone className="w-3 h-3" /> {delivery.pickupRestaurant.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Dropoff */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-red-600 font-semibold mb-1">DROP OFF TO</p>
            <p className="text-sm font-bold text-gray-900">{delivery.dropoffCustomer.name}</p>
            <p className="text-xs text-gray-500">{delivery.dropoffCustomer.address}</p>
            <a href={`tel:${delivery.dropoffCustomer.phone}`} className="flex items-center gap-1 text-xs text-orange-600 mt-1">
              <Phone className="w-3 h-3" /> {delivery.dropoffCustomer.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Map Link */}
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.dropoffCustomer.lat},${delivery.dropoffCustomer.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
      >
        <Navigation className="w-4 h-4" /> Open Navigation
      </a>

      {/* Action Button */}
      {nextAction && (
        <button
          onClick={() => handleAction(nextAction.action)}
          disabled={actionLoading}
          className="w-full py-3.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {actionLoading ? "Processing..." : nextAction.label}
        </button>
      )}

      {/* Fare */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
        <p className="text-xs text-gray-500">Delivery Fee</p>
        <p className="text-2xl font-bold text-green-600">&#2547;{delivery.deliveryFee}</p>
      </div>
    </div>
  );
}
