import Banner from "@/components/banner/Banner";
import FoodCategories from "@/components/categories/FoodCategories";
import HowItWorks from "@/components/how-it-works/HowItWorks";
import StatsCounter from "@/components/stats/StatsCounter";
import FaqSection from "@/components/faq/FaqSection";

export default function Home() {
  return (
    <div>
      <Banner />
      <FoodCategories />
      <HowItWorks />
      <StatsCounter />
      <FaqSection />
    </div>
  );
}
