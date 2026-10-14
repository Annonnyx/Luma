import { SiteHeader } from "@/components/layout/SiteHeader";
import { Companion } from "@/sections/Companion";
import { ContactLens } from "@/sections/ContactLens";
import { FinalCta } from "@/sections/FinalCta";
import { FloatingWindows } from "@/sections/FloatingWindows";
import { Hero } from "@/sections/Hero";
import { LensPassage } from "@/sections/LensPassage";
import { Prologue } from "@/sections/Prologue";
import { Ring } from "@/sections/Ring";
import { SpatialMemory } from "@/sections/SpatialMemory";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="contenu">
        <Prologue>
          <Hero />
          <LensPassage />
        </Prologue>
        <FloatingWindows />
        <SpatialMemory />
        <ContactLens />
        <Ring />
        <Companion />
        <FinalCta />
      </main>
    </>
  );
}
