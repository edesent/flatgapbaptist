/**
 * The photo gallery. Pastor Eric emailed ~20 photos of the church and
 * congregation on November 3, 2026 (two emails, "re: blog / photo gallery
 * edit" and "re: photo gallery") and said he might want to cull some once he
 * saw them together — so treat this list as a first working draft, not
 * final. Captions below are generic by design; Pastor Eric can tighten them
 * up (who, what, when) once he picks the keepers.
 *
 * Files live in public/gallery/gallery-01.jpg … gallery-46.jpg.
 */

export type GalleryPhoto = { file: string; alt: string };

function range(start: number, end: number, alt: string): GalleryPhoto[] {
  const out: GalleryPhoto[] = [];
  for (let i = start; i <= end; i++) {
    out.push({ file: `gallery-${String(i).padStart(2, "0")}.jpg`, alt });
  }
  return out;
}

export const galleryPhotos: GalleryPhoto[] = [
  ...range(1, 19, "Trunk or Treat at Flat Gap Baptist Church, October 31, 2026"),
  ...range(20, 20, "Flat Gap Baptist Church members together"),
  ...range(21, 25, "Fish fry fellowship at Flat Gap Baptist Church"),
  ...range(26, 27, "Fellowship time at Flat Gap Baptist Church"),
  ...range(28, 28, "Brother Eric's family"),
  ...range(29, 30, "We love babies!"),
  ...range(31, 31, "Praying for our pastor"),
  ...range(32, 32, "Welcoming the new pastor"),
  ...range(33, 35, "Flat Gap Baptist Church congregation and fellowship"),
  ...range(36, 36, "We are here to serve!"),
  ...range(37, 39, "Flat Gap Baptist Church congregation and fellowship"),
  ...range(41, 46, "Flat Gap Baptist Church congregation and fellowship"),
];
