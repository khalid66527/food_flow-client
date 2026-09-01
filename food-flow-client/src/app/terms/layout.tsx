import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Food Flow",
  description:
    "Read the Terms and Conditions governing your use of the Food Flow platform, including ordering, delivery, payments, cancellations and account management.",
  openGraph: {
    title: "Terms & Conditions — Food Flow",
    description:
      "Read the Terms and Conditions governing your use of the Food Flow platform.",
    url: "https://foodflow.com/terms",
    siteName: "Food Flow",
    type: "website",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
