import { CallToAction } from "@/components/marketing/CallToAction";
import { CoreFeatures } from "@/components/marketing/CoreFeatures";
import { Footer } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ProductHighlights } from "@/components/marketing/ProductHighlights";
import { Security } from "@/components/marketing/Security";

export default function HomePage() {
  return (
    <>
      <MarketingNav />
      <main id="main">
        <Hero />
        <ProductHighlights />
        <CoreFeatures />
        <HowItWorks />
        <Security />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
