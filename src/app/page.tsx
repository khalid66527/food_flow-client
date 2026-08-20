import Banner from "@/components/banner/Banner";
import FoodCategories from "@/components/categories/FoodCategories";
import SpecialOffer from "@/components/special-offer/SpecialOffer";
import HowItWorks from "@/components/how-it-works/HowItWorks";
import StatsCounter from "@/components/stats/StatsCounter";
import TestimonialsSection from "@/components/testimonials/TestimonialsSection";
import FaqSection from "@/components/faq/FaqSection";

export default function Home() {
  return (
    <div>
      <Banner />
      <FoodCategories />
      <SpecialOffer />
      <HowItWorks />
      <StatsCounter />
      <TestimonialsSection />
      <FaqSection />
    </div>
  );
}
