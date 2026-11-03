import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import PhotoGallery from "@/components/PhotoGallery";
import { galleryPhotos } from "@/content/gallery";
import { church } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description: `Photos of the people and gatherings of ${church.name} in ${church.city}, ${church.state}.`,
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-10 md:pt-16">
        <p className="kicker">{church.name}</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">Photo Gallery</h1>
        <p className="mt-5 max-w-[42rem] text-[1.1rem] leading-relaxed text-ink-soft md:text-[1.2rem]">
          A look at our church family — fellowship nights, Sunday mornings and the people who make Flat Gap Baptist home.
          Tap any photo to see it larger.
        </p>
      </section>
      <section className="wrap pb-16 md:pb-24">
        <PhotoGallery photos={galleryPhotos} />
      </section>
      <SiteFooter />
    </>
  );
}
