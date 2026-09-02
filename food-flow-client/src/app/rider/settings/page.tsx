"use client";

import React, { useState } from "react";
import { ArrowLeft, Bell, Moon, MapPin, HelpCircle, Info, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [locationShare, setLocationShare] = useState(true);

  return (
    <div className="p-4 md:ml-0 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg">Settings</h1>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Order Alerts</span>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${notifications ? "bg-orange-500" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Sound Effects</span>
            <button
              onClick={() => setSound(!sound)}
              className={`w-12 h-6 rounded-full transition-colors ${sound ? "bg-orange-500" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${sound ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">Location</h3>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700">Auto-Share Location</span>
          <button
            onClick={() => setLocationShare(!locationShare)}
            className={`w-12 h-6 rounded-full transition-colors ${locationShare ? "bg-orange-500" : "bg-gray-300"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${locationShare ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Help */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-900">Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <div className="border-t border-gray-50" />
        <button className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-900">About</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">Version 1.0.0</p>
    </div>
  );
}
