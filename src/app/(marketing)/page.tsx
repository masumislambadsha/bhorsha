import { CallToAction } from "@/components/marketing/CallToAction";
import { CoreFeatures } from "@/components/marketing/CoreFeatures";
import { Footer } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ProductHighlights } from "@/components/marketing/ProductHighlights";
import { Security } from "@/components/marketing/Security";
import { getServerSession, homeForRole, roleOf } from "@/server/auth/session";

export default async function HomePage() {
  const session = await getServerSession();
  const dashboardHref = session ? homeForRole(roleOf(session)) : null;
  return (
    <>
      <MarketingNav dashboardHref={dashboardHref} />
      <main id="main">
        <Hero dashboardHref={dashboardHref} />
        <ProductHighlights />
        <CoreFeatures />
        <HowItWorks />
        <Security />
        <CallToAction dashboardHref={dashboardHref} />
      </main>
      <Footer dashboardHref={dashboardHref} />
    </>
  );
}
