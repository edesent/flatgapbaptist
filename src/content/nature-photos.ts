/**
 * Nature photos for the "A Verse to Meditate On" page: one per day, changing at
 * midnight Eastern time, just like the verse. The page steps through them in a
 * scattered (but fixed) order, and the cycle repeats once all have been shown.
 *
 * Only photos whose licence we checked on the photographer's own page and that
 * need nothing beyond credit are used: Creative Commons BY or BY-SA, or work of
 * the U.S. government (public domain). Photos with "non-commercial" or "no
 * derivatives" licences were left out on purpose. Each photo is shown whole (not
 * cropped), with its title, photographer and licence linked underneath.
 *
 * To add a photo: open its page, confirm the licence there, then add a block with
 * the direct image address, a short description, its title, the photographer, the
 * photo's page, and the licence name and its link.
 * (16 photos, so the cycle repeats about every 16 days.)
 */

export type NaturePhoto = {
  src: string;
  alt: string;
  title: string;
  credit: string;
  creditUrl: string;
  license: string;
  licenseUrl: string;
};

const BY2 = { license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/" };
const BYSA2 = { license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/" };
const BYSA3 = { license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" };
const PUBLIC = { license: "Public domain", licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/" };
const GOV = { license: "Public domain (U.S. government work)", licenseUrl: "https://www.usa.gov/government-works" };

export const naturePhotos: NaturePhoto[] = [
  {
    src: "https://live.staticflickr.com/1318/576400077_2187664867_b.jpg",
    alt: "Layered mountain ridges at sunrise in the Joyce Kilmer Forest",
    title: "Easter Morning Mountain Sunrise",
    credit: "anoldent",
    creditUrl: "https://www.flickr.com/photos/anoldent/576400077",
    ...BYSA2,
  },
  {
    src: "https://live.staticflickr.com/5568/15117707696_8a944c33d4_b.jpg",
    alt: "Sunrise over Shadow Mountain Lake, with mist and mountain peaks in the distance",
    title: "Rocky Mountain Sunrise, CO 8-12",
    credit: "Don Graham",
    creditUrl: "https://www.flickr.com/photos/23155134@N06/15117707696",
    ...BYSA2,
  },
  {
    src: "https://live.staticflickr.com/4893/39940844373_6fc2763c7e_b.jpg",
    alt: "Morning light and clouds over Stone Mountain",
    title: "Stone Mountain Sunrise",
    credit: "formulanone",
    creditUrl: "https://www.flickr.com/photos/formulanone/39940844373",
    ...BYSA2,
  },
  {
    src: "https://live.staticflickr.com/7135/7747981944_8f255b770c_b.jpg",
    alt: "Sunrise and clouds over Cadillac Mountain in Acadia National Park",
    title: "Cadillac Mountain Sunrise",
    credit: "Chris Potako",
    creditUrl: "https://www.flickr.com/photos/chrispotako/7747981944",
    ...BY2,
  },
  {
    src: "https://live.staticflickr.com/4275/34502132490_bdc09575b1_b.jpg",
    alt: "Cutoff Mountain at sunrise, reflected in still water in Yellowstone National Park",
    title: "Cutoff Mountain sunrise reflection",
    credit: "NPS / Jacob W. Frank, Yellowstone National Park",
    creditUrl: "https://www.flickr.com/photos/yellowstonenps/34502132490",
    ...PUBLIC,
  },
  {
    src: "https://live.staticflickr.com/8019/7695199222_bd81bb445e_b.jpg",
    alt: "Trees in a forest",
    title: "Forest trees",
    credit: "Melissa Smith",
    creditUrl: "https://www.flickr.com/photos/69370495@N07/7695199222",
    ...BY2,
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Hoh_rain_forest_trees.jpg",
    alt: "Trees and roots in the Hoh Rain Forest",
    title: "Hoh rain forest trees",
    credit: "Goldom",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Hoh_rain_forest_trees.jpg",
    ...BYSA3,
  },
  {
    src: "https://live.staticflickr.com/5836/22997586376_3d18a385c4_b.jpg",
    alt: "White sea foam swirling over dark rocks on the Oregon coast",
    title: "Whip cream until soft peaks form",
    credit: "Sheila Sund",
    creditUrl: "https://www.flickr.com/photos/sheila_sund/22997586376",
    ...BY2,
  },
  {
    src: "https://live.staticflickr.com/3821/13567832225_ea1d8a3deb_b.jpg",
    alt: "Waves rolling onto Dalbeg Beach on the Isle of Lewis",
    title: "Dalbeg Beach",
    credit: "Chris Combe",
    creditUrl: "https://www.flickr.com/photos/cosmicherb70/13567832225",
    ...BY2,
  },
  {
    src: "https://live.staticflickr.com/7136/6997737191_5b63d642bb_b.jpg",
    alt: "Wildflowers in a mountain meadow above Paradise, Mount Rainier National Park",
    title: "Wildflower Meadow",
    credit: "NPS photo by Jasmine Horn, Mount Rainier National Park",
    creditUrl: "https://www.flickr.com/photos/mountrainiernps/6997737191",
    ...BY2,
  },
  {
    src: "https://live.staticflickr.com/8274/8938047218_61c5afc754_b.jpg",
    alt: "A wildflower meadow",
    title: "Wildflower Meadow",
    credit: "Jean Jones",
    creditUrl: "https://www.flickr.com/photos/flamingparrot/8938047218",
    ...BY2,
  },
  {
    src: "https://live.staticflickr.com/5799/23417781002_260e41b697_b.jpg",
    alt: "A wildflower meadow on the Olympic Peninsula",
    title: "Wildflower Meadow on the Peninsula-Olympic",
    credit: "U.S. Forest Service, Pacific Northwest Region",
    creditUrl: "https://www.flickr.com/photos/forestservicenw/23417781002",
    ...PUBLIC,
  },
  {
    src: "https://www.fws.gov/sites/default/files/styles/max_1300x1300/public/2021-11/IMG_0756%281%29.jpg?itok=fkM2O7Em",
    alt: "Steam rising from Lower Red Rock Lake after sunrise, with mountains in the background",
    title: "October Morning on Lower Red Rock Lake",
    credit: "Cortez Rohr, U.S. Fish & Wildlife Service",
    creditUrl: "https://www.fws.gov/media/october-morning-lower-red-rock-lake",
    ...GOV,
  },
  {
    src: "https://www.fws.gov/sites/default/files/styles/max_1300x1300/public/2022-02/IMG_7307.JPG?itok=QrMhqzLc",
    alt: "Yellow goldenrod flowers against green conifers, a gray mountain, and clear blue skies",
    title: "Remote Refuge Paradise",
    credit: "Jenn Majkowski, U.S. Fish & Wildlife Service",
    creditUrl: "https://www.fws.gov/media/remote-refuge-paradise",
    ...GOV,
  },
  {
    src: "https://www.fws.gov/sites/default/files/styles/max_1300x1300/public/2021-11/IMG_9970%281%29.jpg?itok=Lrt7GhvT",
    alt: "Golden aspen trees at the base of the Centennial Mountains under clear skies",
    title: "Refuge Fall Colors",
    credit: "Cortez Rohr, U.S. Fish & Wildlife Service",
    creditUrl: "https://www.fws.gov/media/refuge-fall-colors",
    ...GOV,
  },
  {
    src: "https://www.fws.gov/sites/default/files/styles/max_1300x1300/public/2022-09/moosehorn.png?itok=4dFr5yHF",
    alt: "A roaring stream flowing through a forest in fall colors",
    title: "Moosehorn NWR",
    credit: "Keith Ramos, U.S. Fish & Wildlife Service",
    creditUrl: "https://www.fws.gov/media/moosehorn-nwr",
    ...GOV,
  },
];
