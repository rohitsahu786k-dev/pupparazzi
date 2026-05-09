export type ServiceAddonSeed = {
  name: string;
  description: string;
  price: number;
};

export type ServiceSeed = {
  name: string;
  category: string;
  description_short: string;
  description_long: string;
  price: number;
  discounted_price?: number | null;
  slot_duration_mins: number;
  max_slots_per_day?: number | null;
  is_bestseller?: boolean;
  free_services_json?: unknown;
  images_json?: unknown;
  addons?: ServiceAddonSeed[];
};

export type CouponRule = {
  code: string;
  description: string;
  discount_type: "PERCENTAGE" | "FLAT";
  discount_value: number;
  category?: string;
  minimum_order_amount: number;
  usage_limit: number;
  expires_at: string;
  is_active: boolean;
  terms: string;
};

export const groomingIncludes = [
  "2 washes",
  "Conditioning",
  "Blow drying",
  "Ear cleaning",
  "Teeth cleaning",
  "Under paw cleaning",
  "Nail clipping",
  "Basic trimming",
];

export const serviceAddons: ServiceAddonSeed[] = [
  { name: "Oil Massage", description: "Relaxing coat and skin massage.", price: 450 },
  { name: "Dematting", description: "Extra coat de-matting support.", price: 500 },
  { name: "Teeth Cleaning", description: "Focused teeth cleaning add-on.", price: 100 },
  { name: "Tick Treatment", description: "Tick check and treatment support.", price: 600 },
];

const boardingDescriptions = {
  short: "Air-conditioned kennels, meals, basic care, and supervision.",
  long: [
    "Flexible boarding package days can be used anytime as required.",
    "Full payment must be made in advance for package pricing.",
    "Bookings are subject to availability.",
    "Vaccination and tick-free requirements apply.",
  ].join(" "),
};

export const boardingServices: ServiceSeed[] = [
  {
    name: "Boarding - Up to 6 Hours",
    category: "Boarding",
    description_short: boardingDescriptions.short,
    description_long: boardingDescriptions.long,
    price: 600,
    slot_duration_mins: 360,
    max_slots_per_day: 8,
    free_services_json: ["Air-conditioned kennels", "Meals", "Basic care and supervision"],
    images_json: ["/service-boarding.png"],
  },
  {
    name: "Boarding - 6 to 12 Hours",
    category: "Boarding",
    description_short: boardingDescriptions.short,
    description_long: boardingDescriptions.long,
    price: 900,
    slot_duration_mins: 720,
    max_slots_per_day: 8,
    free_services_json: ["Air-conditioned kennels", "Meals", "Basic care and supervision"],
    images_json: ["/service-boarding.png"],
  },
  {
    name: "Boarding - 24 Hours / 1 Day",
    category: "Boarding",
    description_short: boardingDescriptions.short,
    description_long: boardingDescriptions.long,
    price: 1200,
    slot_duration_mins: 1440,
    max_slots_per_day: 8,
    is_bestseller: true,
    free_services_json: ["Air-conditioned kennels", "Meals", "Basic care and supervision"],
    images_json: ["/service-boarding.png"],
  },
  {
    name: "Boarding - 10 Days Package",
    category: "Boarding",
    description_short: "Flexible 10 day boarding package.",
    description_long: boardingDescriptions.long,
    price: 12000,
    discounted_price: 10800,
    slot_duration_mins: 1440,
    max_slots_per_day: 8,
    is_bestseller: true,
    free_services_json: ["Flexible day usage", "Air-conditioned kennels", "Meals", "Basic care and supervision"],
    images_json: ["/service-boarding.png"],
  },
  {
    name: "Boarding - 20 Days Package",
    category: "Boarding",
    description_short: "Flexible 20 day boarding package.",
    description_long: boardingDescriptions.long,
    price: 24000,
    discounted_price: 20400,
    slot_duration_mins: 1440,
    max_slots_per_day: 8,
    free_services_json: ["Flexible day usage", "Air-conditioned kennels", "Meals", "Basic care and supervision"],
    images_json: ["/service-boarding.png"],
  },
  {
    name: "Boarding - 30 Days Package",
    category: "Boarding",
    description_short: "20% off plus complimentary grooming session.",
    description_long: boardingDescriptions.long,
    price: 36000,
    discounted_price: 28800,
    slot_duration_mins: 1440,
    max_slots_per_day: 8,
    free_services_json: ["20% off", "Complimentary grooming session", "Flexible day usage"],
    images_json: ["/service-boarding.png"],
  },
];

export const individualGroomingServices: ServiceSeed[] = [
  ["Haircut / Shaving", 850],
  ["Face Trim", 450],
  ["Nail Clipping", 150],
  ["Under Paw Trimming", 150],
  ["Teeth Cleaning", 100],
  ["Dematting the Coat", 500],
  ["Oil Massage", 450],
].map(([name, price]) => ({
  name: `Grooming - ${name}`,
  category: "Grooming",
  description_short: "Individual grooming service.",
  description_long: "Book a focused grooming service for your pet.",
  price: Number(price),
  slot_duration_mins: Number(price) >= 800 ? 90 : 30,
  max_slots_per_day: 4,
  images_json: ["/service-grooming.png"],
}));

const packagePrices = [
  { breed: "Small Breed", coat: "Long Coat", single: 1450, sessions: { 6: 7400, 12: 13900, 24: 26100 } },
  { breed: "Small Breed", coat: "Short Coat", single: 850, sessions: { 6: 4300, 12: 8150, 24: 15300 } },
  { breed: "Large Breed", coat: "Long Coat", single: 1650, sessions: { 6: 8400, 12: 15850, 24: 29700 } },
  { breed: "Large Breed", coat: "Short Coat", single: 1230, sessions: { 6: 6250, 12: 11800, 24: 22150 } },
  { breed: "Extra Large Breed", coat: "Long Coat", single: 1750, sessions: { 6: 8900, 12: 16800, 24: 31500 } },
  { breed: "Extra Large Breed", coat: "Short Coat", single: 1500, sessions: { 6: 7650, 12: 14400, 24: 27000 } },
] as const;

export const specialGroomingServices: ServiceSeed[] = packagePrices.flatMap((item) => [
  {
    name: `${item.breed} Grooming - ${item.coat} - Single Session`,
    category: "Grooming",
    description_short: `${item.breed}, ${item.coat.toLowerCase()} complete grooming session.`,
    description_long: "Complete grooming session. De-matting and shaving are extra. Puppies below 6 months get Rs. 200 off per session.",
    price: item.single,
    slot_duration_mins: item.breed === "Extra Large Breed" ? 150 : 120,
    max_slots_per_day: 4,
    free_services_json: groomingIncludes,
    images_json: ["/service-grooming.png"],
    addons: serviceAddons,
  },
  ...([6, 12, 24] as const).map((sessionCount) => {
    const discount = sessionCount === 6 ? "15% OFF" : sessionCount === 12 ? "20% OFF" : "25% OFF";
    return {
      name: `${item.breed} Grooming - ${item.coat} - ${sessionCount} Sessions`,
      category: "Grooming",
      description_short: `${discount} package for ${item.breed.toLowerCase()}, ${item.coat.toLowerCase()}.`,
      description_long: "Complete grooming package. De-matting and shaving are extra. Puppies below 6 months get Rs. 200 off per session.",
      price: item.single * sessionCount,
      discounted_price: item.sessions[sessionCount],
      slot_duration_mins: item.breed === "Extra Large Breed" ? 150 : 120,
      max_slots_per_day: 4,
      free_services_json: [...groomingIncludes, discount],
      images_json: ["/service-grooming.png"],
      addons: serviceAddons,
    };
  }),
]);

export const petCareServices: ServiceSeed[] = [
  ...boardingServices,
  ...individualGroomingServices,
  ...specialGroomingServices,
  {
    name: "Dog Walking",
    category: "Walking",
    description_short: "30-minute guided walk.",
    description_long: "Structured walk for fitness, routine, and outdoor stimulation.",
    price: 349,
    discounted_price: 299,
    slot_duration_mins: 30,
    max_slots_per_day: 6,
    images_json: ["/service-walking.png"],
  },
  {
    name: "Swimming Session",
    category: "Swimming",
    description_short: "Pet-safe pool exercise session.",
    description_long: "Pool activity for fun, confidence, and conditioning.",
    price: 699,
    discounted_price: 499,
    slot_duration_mins: 45,
    max_slots_per_day: 4,
    images_json: ["/service-swimming.png"],
  },
  {
    name: "Vet Consultation",
    category: "Veterinary",
    description_short: "At-home vet consultation.",
    description_long: "Routine consultation and wellness check.",
    price: 1999,
    discounted_price: 1499,
    slot_duration_mins: 60,
    max_slots_per_day: 3,
    images_json: ["/service-veterinary.png"],
  },
  {
    name: "Basic Training",
    category: "Training",
    description_short: "Obedience and command training.",
    description_long: "Positive reinforcement program for calmer everyday behavior.",
    price: 2499,
    discounted_price: 1999,
    slot_duration_mins: 60,
    max_slots_per_day: 3,
    images_json: ["/service-training.png"],
  },
];

export const defaultCoupons: CouponRule[] = [
  {
    code: "FIRST10",
    description: "10% OFF",
    discount_type: "PERCENTAGE",
    discount_value: 10,
    minimum_order_amount: 500,
    usage_limit: 100,
    expires_at: "2026-12-31",
    is_active: true,
    terms: "Valid on active services above Rs. 500.",
  },
  {
    code: "GROOM20",
    description: "Grooming Discount",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    category: "Grooming",
    minimum_order_amount: 850,
    usage_limit: 50,
    expires_at: "2026-12-31",
    is_active: true,
    terms: "Valid only on grooming services and packages.",
  },
  {
    code: "BOARD5",
    description: "Boarding Discount",
    discount_type: "PERCENTAGE",
    discount_value: 5,
    category: "Boarding",
    minimum_order_amount: 600,
    usage_limit: 50,
    expires_at: "2026-12-31",
    is_active: true,
    terms: "Valid only on boarding services and packages.",
  },
];

export function serviceBookablePrice(service: { price?: number | null; discounted_price?: number | null }) {
  return Number(service.discounted_price || service.price || 0);
}

export function calculateCouponDiscount(coupon: CouponRule, subtotal: number) {
  if (coupon.discount_type === "FLAT") return Math.min(subtotal, coupon.discount_value);
  return Math.round((subtotal * coupon.discount_value) / 100);
}
