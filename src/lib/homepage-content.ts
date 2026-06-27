export const BUSINESS_ADDRESS =
  "Next Crossroad to Bharat Petroleum, VIP Rd, opp. Stanza, South Bopal, Ahmedabad, Gujarat 380057";

export const OUTDATED_ADDRESS_MARKERS = ["Shali" + "gram", "Vaishno" + "devi", "Sardar" + " Patel" + " Ring"];

export type HomepageSlide = {
  title: string;
  subtitle: string;
  image: string;
  mobileImage?: string;
  overlayOpacity?: number;
  textPosition?: "left" | "center" | "right";
  sortOrder?: number;
  isActive?: boolean;
  cta: string;
  href: string;
  secondary: string;
  secondaryHref: string;
};

export type HomepageFeature = {
  title: string;
  copy: string;
};

export type HomepageFaq = {
  question: string;
  answer: string;
};

export type HomepageCarouselItem = {
  title: string;
  text: string;
  image: string;
  cta: string;
  href: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type HomepageSettings = {
  heroEyebrow: string;
  heroSlides: HomepageSlide[];
  eventEyebrow: string;
  eventTitle: string;
  eventCopy: string;
  eventDate: string;
  eventImage: string;
  eventCta: string;
  eventHref: string;
  eventActive: boolean;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutCopy: string;
  aboutImage: string;
  featuresEyebrow: string;
  featuresTitle: string;
  features: HomepageFeature[];
  faqs: HomepageFaq[];
  bottomItems: HomepageCarouselItem[];
  ctaEyebrow: string;
  ctaTitle: string;
};

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  heroEyebrow: "Premium pet care club in Ahmedabad",
  heroSlides: [
    {
      title: "Luxury pet care in Ahmedabad.",
      subtitle: "Boarding, grooming, swimming, training, and daycare under one premium, hygienic roof.",
      image: "/images/IMG_5623.JPG.jpeg",
      mobileImage: "/images/IMG_5600.PNG",
      overlayOpacity: 72,
      textPosition: "left",
      sortOrder: 1,
      isActive: true,
      cta: "Book Appointment",
      href: "/book",
      secondary: "Explore Services",
      secondaryHref: "#services",
    },
    {
      title: "Happy pets. Calm parents.",
      subtitle: "A pet-first club experience with trained handlers, clean spaces, and regular updates.",
      image: "/images/IMG_5627.JPG.jpeg",
      mobileImage: "/images/IMG_5601.PNG",
      overlayOpacity: 68,
      textPosition: "left",
      sortOrder: 2,
      isActive: true,
      cta: "Call Now",
      href: "tel:+916358848177",
      secondary: "WhatsApp Us",
      secondaryHref: "https://wa.me/916358848177",
    },
    {
      title: "Pool days, spa days, better days.",
      subtitle: "Premium enrichment and care experiences designed around your pet's comfort.",
      image: "/images/IMG_5600.PNG",
      mobileImage: "/images/IMG_5606.PNG",
      overlayOpacity: 64,
      textPosition: "left",
      sortOrder: 3,
      isActive: true,
      cta: "Book Swimming",
      href: "/book?service=swimming",
      secondary: "Visit Club",
      secondaryHref: "/contact",
    },
  ],
  eventEyebrow: "Featured Event",
  eventTitle: "Club visit and temperament meet-up weekend.",
  eventCopy: "Visit Pupparazzi Club, meet the team, explore boarding spaces, and discuss the right care plan for your pet.",
  eventDate: "",
  eventImage: "/images/IMG_5623.JPG.jpeg",
  eventCta: "Plan a Visit",
  eventHref: "/contact",
  eventActive: true,
  aboutEyebrow: "About Pupparazzi Club",
  aboutTitle: "A warm club experience, operated with serious care systems.",
  aboutCopy:
    "Pupparazzi Club brings premium grooming, boarding, swimming, training, and daycare into a single pet-first environment. The team focuses on hygiene, calm handling, personalised attention, and a transparent booking experience for every parent.",
  aboutImage: "/images/IMG_5627.JPG.jpeg",
  featuresEyebrow: "Why Choose Us",
  featuresTitle: "Every detail is designed for trust, comfort, and repeat care.",
  features: [
    { title: "Passionate Pet Care Experts", copy: "A trained team that understands body language, comfort, and daily care routines." },
    { title: "Safe & Comfortable Environment", copy: "Thoughtful spaces designed for calm stays, play, grooming, and supervised enrichment." },
    { title: "Hygienic Facilities", copy: "Clean handling, sanitized areas, and vaccination-aware workflows for safer care." },
    { title: "Personalised Attention", copy: "Care notes, food preferences, allergies, temperament, and special requests stay visible." },
    { title: "Premium Services Under One Roof", copy: "Boarding, grooming, swimming, training, walking, and daycare in one club ecosystem." },
    { title: "Regular Updates", copy: "Booking details, documents, invoices, and communication stay organized for every pet parent." },
  ],
  faqs: [
    { question: "How do I book a service?", answer: "Choose your service, date, pet details, address, and submit the booking. Our team confirms availability and next steps." },
    { question: "What vaccinations are required for boarding?", answer: "Rabies and core vaccinations are recommended. Boarding bookings can include vaccination certificate uploads for review." },
    { question: "Can I visit before booking?", answer: "Yes. You can call or WhatsApp us to schedule a visit to the club before confirming boarding or daycare." },
    { question: "What should I bring with my pet?", answer: "Food, medication if any, vaccination records, leash/collar, and comfort items your pet already knows." },
    { question: "How long does grooming take?", answer: "It depends on pet size, coat type, temperament, and selected package. Most sessions are confirmed by the team during booking." },
    { question: "Do you offer training for puppies?", answer: "Yes. Puppy training and behaviour guidance can be requested through the booking flow or by calling the club." },
  ],
  bottomItems: [
    {
      title: "Swimming, boarding, grooming, and more in one premium club.",
      text: "A premium Pupparazzi experience for pet parents who want everything under one trusted roof.",
      image: "/images/IMG_5600.PNG",
      cta: "Book Appointment",
      href: "/book",
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "Plan a club visit before your pet's stay.",
      text: "Meet the team, explore the facility, and choose the right care plan with confidence.",
      image: "/images/IMG_5623.JPG.jpeg",
      cta: "Contact Us",
      href: "/contact",
      sortOrder: 2,
      isActive: true,
    },
  ],
  ctaEyebrow: "Ready to Give Your Pet the Best Care?",
  ctaTitle: "Book an appointment today and let your pet enjoy the Pupparazzi experience.",
};
