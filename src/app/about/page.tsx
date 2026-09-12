import type { Metadata } from "next";
import Link from "next/link";
import {
  Bike,
  Clock,
  HeartHandshake,
  Leaf,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Utensils,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us — Food Flow",
  description:
    "Learn how Food Flow connects hungry customers, local restaurants and riders to deliver fresh food fast.",
};

const stats = [
  { value: "1,200+", label: "Partner restaurants" },
  { value: "50K+", label: "Orders delivered" },
  { value: "800+", label: "Active riders" },
  { value: "28 min", label: "Average delivery" },
];

const values = [
  {
    icon: Clock,
    title: "Fast, honest delivery",
    description:
      "Live tracking from the kitchen to your door, with delivery times we actually keep instead of ones that look good on a banner.",
  },
  {
    icon: Leaf,
    title: "Fresh every time",
    description:
      "Partner kitchens are checked for hygiene and packaging standards so your food arrives hot, sealed and exactly as ordered.",
  },
  {
    icon: HeartHandshake,
    title: "Fair to our riders",
    description:
      "Transparent earnings, flexible shifts and full tip pass-through. The people who bring your food deserve a real living.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    description:
      "Protected accounts, encrypted payments and no surprise charges at checkout — the price you see is the price you pay.",
  },
];

const steps = [
  {
    icon: Search,
    title: "Discover",
    description:
      "Browse restaurants near you, filter by cuisine or budget, and see live offers before you commit.",
  },
  {
    icon: ShoppingBag,
    title: "Order",
    description:
      "Build your cart, apply a coupon and check out in seconds with your saved address and payment method.",
  },
  {
    icon: Bike,
    title: "Track",
    description:
      "Follow your rider on the map in real time and get a heads-up right before they knock on your door.",
  },
];

const audiences = [
  {
    icon: Utensils,
    title: "For customers",
    description:
      "Thousands of dishes from the restaurants you already love, plus the ones you have not discovered yet.",
    href: "/restaurants",
    cta: "Browse restaurants",
  },
  {
    icon: Store,
    title: "For restaurants",
    description:
      "Reach new customers, manage your menu and track orders from one simple dashboard.",
    href: "/auth/register",
    cta: "Partner with us",
  },
  {
    icon: Bike,
    title: "For riders",
    description:
      "Ride on your own schedule, pick up the deliveries you want and get paid weekly.",
    href: "/auth/register",
    cta: "Start riding",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-linear-to-b from-orange-50/80 to-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600">
              <MapPin className="h-3.5 w-3.5" />
              Proudly serving Chattogram &amp; beyond
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Good food, moving{" "}
              <span className="text-orange-500">a little faster</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              Food Flow started with a simple frustration: ordering dinner
              should not be a gamble. We built one platform where customers,
              restaurants and riders all see the same order, at the same time —
              so nothing gets lost between the kitchen and your table.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dishes"
                className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-orange-600"
              >
                Order now
              </Link>
              <Link
                href="/dishes?featured=true"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                See today&apos;s offers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden bg-gray-100 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white px-4 py-8 text-center">
              <p className="text-2xl font-extrabold text-orange-500 sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Our story
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                We began as a handful of people who ate too much late-night
                takeaway and got tired of cold food, vague delivery windows and
                orders that quietly went missing.
              </p>
              <p>
                Instead of another listing site, we built the whole flow: a menu
                system restaurants can actually keep up to date, a rider app
                that routes sensibly, and a tracking page that tells you the
                truth about where your food is.
              </p>
              <p>
                Today Food Flow works with local family kitchens and larger
                chains alike. The goal has not changed — help great food travel
                well, and make sure everyone along the way is treated fairly.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50/50 p-8">
            <h3 className="text-lg font-bold text-gray-900">Our mission</h3>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              To make ordering food effortless for customers, profitable for
              local restaurants, and genuinely worth it for the riders who make
              delivery possible.
            </p>
            <div className="mt-6 border-t border-orange-100 pt-6">
              <h3 className="text-lg font-bold text-gray-900">
                What we measure ourselves on
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm text-gray-600">
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  Orders that arrive within the time we promised
                </li>
                <li className="flex items-start gap-2.5">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  Repeat customers for our partner restaurants
                </li>
                <li className="flex items-start gap-2.5">
                  <Bike className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  Rider earnings per hour, not just per delivery
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-gray-100 bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              What we stand for
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Four things we refuse to compromise on, however busy the dinner
              rush gets.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-gray-900">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            How Food Flow works
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Three steps from craving to doorstep.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative rounded-2xl border border-gray-100 bg-white p-6"
              >
                <span className="absolute right-6 top-6 text-4xl font-extrabold text-orange-50">
                  0{index + 1}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Audiences */}
      <section className="border-t border-gray-100 bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Built for everyone at the table
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Whichever side of the order you are on, there is a place for you
              here.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <div
                  key={audience.title}
                  className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-xs"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-gray-900">
                    {audience.title}
                  </h3>
                  <p className="mt-2 grow text-sm leading-relaxed text-gray-600">
                    {audience.description}
                  </p>
                  <Link
                    href={audience.href}
                    className="mt-5 inline-flex items-center text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
                  >
                    {audience.cta}
                    <span aria-hidden="true" className="ml-1">
                      &rarr;
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="rounded-3xl bg-orange-500 px-6 py-12 text-center shadow-xl shadow-orange-500/20 sm:px-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Hungry yet?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-orange-50 sm:text-base">
            Find something you love from a restaurant near you — most orders
            arrive in under half an hour.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/restaurants"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-orange-600 shadow-md transition-colors hover:bg-orange-50"
            >
              Browse restaurants
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
