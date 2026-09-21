"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { syncJwtToken, removeAuthToken, getAuthToken } from "@/lib/jwt";

export default function JwtTokenSync() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;

    if (session?.user) {
      const u = session.user as {
        id?: string;
        userId?: string;
        email?: string;
        name?: string;
        role?: string;
        phone?: string;
      };

      if (u.email || u.id) {
        syncJwtToken({
          id: u.id || u.userId || "",
          userId: u.userId || u.id || "",
          email: u.email || "",
          name: u.name || "User",
          role: u.role || "Customer",
          phone: u.phone || "",
        });
      }
    } else {
      // If user is explicitly logged out
      if (!isPending && !session) {
        removeAuthToken();
      }
    }
  }, [session, isPending]);

  return null;
}
