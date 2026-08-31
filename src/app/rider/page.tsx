"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RiderPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/rider/dashboard"); }, [router]);
  return null;
}
