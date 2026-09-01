import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Food Flow",
  description:
    "Get in touch with Food Flow. Reach our support team for order help, partnership inquiries, rider onboarding, or general questions.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
