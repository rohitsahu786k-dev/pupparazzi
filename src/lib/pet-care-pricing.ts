export type ServiceAddonSeed = {
  name: string;
  description: string;
  price: number;
};

export type ServiceSeed = {
  name: string;
  category: string;
  service_group?: string | null;
  breed_size?: string | null;
  coat_type?: string | null;
  session_count?: number | null;
  display_order?: number;
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
  send_in_welcome_email?: boolean;
};

export const activeServiceCategories = ["Boarding", "Grooming"] as const;

export const boardingPolicies = [
  "Dogs will only be checked in with prior booking specifying exact dates and checkout dates.",
  "If there are any changes in boarding days, the pet parent must inform us one day in advance.",
  "Pet parents are requested to keep their pet tick and flea free before boarding.",
  "A complete health check-up by the preferred vet is recommended before boarding to ensure the pet is completely healthy.",
  "Pupparazzi will not be responsible for any pre-existing medical conditions.",
  "Some physical or behavioral changes may be observed after boarding due to change in environment.",
  "Long-stay pets may take time to adjust after returning home.",
  "Pet parents should watch for signs such as being too calm or quiet, mild behavioral changes, or weight change.",
  "If the pet loses weight but remains healthy, active and playful, it may be due to extra activity, feeding routine, nutritional meals and open-space play.",
  "Pets are given open-space play at least 2 to 3 times a day.",
  "In case of incident or accident, contact the assigned emergency vet immediately and inform the pet parent.",
  "If emergency contact is not reachable, contact in-house vet.",
];

export const groomingIncludes = [
  "2 washes",
  "Conditioning",
  "Drying",
  "Ear cleaning",
  "Teeth cleaning",
  "Under paws cleaning",
  "Hygiene area cleaning",
  "Nail clipping",
  "Basic trimming",
];

export const serviceAddons: ServiceAddonSeed[] = [
  { name: "Only Haircut / Shaving", description: "Extra haircut or shaving support.", price: 850 },
  { name: "De-matting the Coat", description: "Extra coat de-matting support.", price: 500 },
  { name: "Oil Massage", description: "Relaxing coat and skin massage.", price: 450 },
];

const boardingDescriptions = {
  short: "Dog boarding with air-conditioned kennels, meals, basic care, and supervision.",
  long: [
    "Boarding packages are flexible and can be used as and when needed.",
    "All payments must be made in advance, otherwise regular rates will apply.",
    "Bookings are subject to availability.",
    "Boarding charges include air-conditioned kennels and meals.",
  ].join(" "),
};

export const boardingServices: ServiceSeed[] = [
  {
    name: "Boarding - Up to 6 Hours",
    category: "Boarding",
    service_group: "Standard Boarding",
    display_order: 10,
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
    service_group: "Standard Boarding",
    display_order: 20,
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
    service_group: "Standard Boarding",
    display_order: 30,
    description_short: boardingDescriptions.short,
    description_long: boardingDescriptions.long,
    price: 1200,
    slot_duration_mins: 1440,
    max_slots_per_day: 8,
    is_bestseller: true,
    free_services_json: ["Air-conditioned kennels", "Meals", "Basic care and supervision"],
    images_json: ["/service-boarding-premium.png"],
  },
  {
    name: "Boarding - 10 Days Package",
    category: "Boarding",
    service_group: "Boarding Packages",
    session_count: 10,
    display_order: 40,
    description_short: "Flexible 10 day boarding package.",
    description_long: boardingDescriptions.long,
    price: 12000,
    discounted_price: 10800,
    slot_duration_mins: 1440,
    max_slots_per_day: 8,
    is_bestseller: true,
    free_services_json: ["Flexible day usage", "Air-conditioned kennels", "Meals", "Basic care and supervision"],
    images_json: ["/service-boarding-package.png"],
  },
  {
    name: "Boarding - 20 Days Package",
    category: "Boarding",
    service_group: "Boarding Packages",
    session_count: 20,
    display_order: 50,
    description_short: "Flexible 20 day boarding package.",
    description_long: boardingDescriptions.long,
    price: 24000,
    discounted_price: 20400,
    slot_duration_mins: 1440,
    max_slots_per_day: 8,
    free_services_json: ["Flexible day usage", "Air-conditioned kennels", "Meals", "Basic care and supervision"],
    images_json: ["/service-boarding-package.png"],
  },
  {
    name: "Boarding - 30 Days Package",
    category: "Boarding",
    service_group: "Boarding Packages",
    session_count: 30,
    display_order: 60,
    description_short: "20% off plus complimentary grooming session.",
    description_long: boardingDescriptions.long,
    price: 36000,
    discounted_price: 28800,
    slot_duration_mins: 1440,
    max_slots_per_day: 8,
    free_services_json: ["20% off", "Complimentary grooming session", "Flexible day usage"],
    images_json: ["/service-boarding-package.png"],
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
].map(([name, price], index) => ({
  name: `Grooming - ${name === "Haircut / Shaving" ? "Only Haircut / Shaving" : name}`,
  category: "Grooming",
  service_group: "Individual Grooming",
  display_order: 200 + index,
  description_short: "Individual grooming service.",
  description_long: "Book a focused individual grooming service for your pet.",
  price: Number(price),
  slot_duration_mins: Number(price) >= 800 ? 90 : 30,
  max_slots_per_day: 4,
  images_json: [
    name === "Haircut / Shaving" ? "/service-grooming-premium.png" :
    name === "Face Trim" ? "/service-face-trim.png" :
    name === "Nail Clipping" ? "/service-nail-clipping.png" :
    name === "Under Paw Trimming" ? "/service-grooming.png" :
    name === "Teeth Cleaning" ? "/service-teeth-cleaning.png" :
    name === "Dematting the Coat" ? "/service-grooming-premium.png" :
    name === "Oil Massage" ? "/service-oil-massage.png" :
    "/service-grooming.png"
  ],
}));

const packagePrices = [
  { breed: "Small Breed", coat: "Long Coat", single: 1450, sessions: { 6: 7400, 12: 13900, 24: 26100 } },
  { breed: "Small Breed", coat: "Short Coat", single: 850, sessions: { 6: 4300, 12: 8150, 24: 15300 } },
  { breed: "Large Breed", coat: "Long Coat", single: 1650, sessions: { 6: 8400, 12: 15850, 24: 29700 } },
  { breed: "Large Breed", coat: "Short Coat", single: 1230, sessions: { 6: 6250, 12: 11800, 24: 22150 } },
  { breed: "Extra Large Breed", coat: "Long Coat", single: 1750, sessions: { 6: 8900, 12: 16800, 24: 31500 } },
  { breed: "Extra Large Breed", coat: "Short Coat", single: 1500, sessions: { 6: 7650, 12: 14400, 24: 27000 } },
] as const;

export const serviceCatalog = [
  {
    section: "Boarding Services",
    category: "Dog Boarding",
    description: "Comfortable dog boarding with air-conditioned kennels, meals, and supervised daily care.",
    subCategories: [
      {
        title: "Standard Boarding Charges",
        items: [
          { label: "Up to 6 hours", price: 600 },
          { label: "Between 6 to 12 hours", price: 900 },
          { label: "24 hours / 1 day charges", price: 1200 },
        ],
      },
      {
        title: "Boarding Packages",
        items: [
          { label: "10 Days Package", price: 10800 },
          { label: "20 Days Package", price: 20400 },
          { label: "30 Days Package", price: 28800, originalPrice: 36000, note: "20% off + Complimentary Grooming Session" },
        ],
      },
    ],
    notes: [
      "Boarding packages are flexible. Customers can utilize their days as and when needed.",
      "All payments must be made in advance, otherwise regular rates will apply.",
      "Bookings are subject to availability.",
      "Boarding charges include air-conditioned kennels and meals.",
    ],
  },
  {
    section: "Complete Grooming Services",
    category: "Complete Grooming Session",
    description: "Complete grooming includes 2 washes, conditioning, drying, ear cleaning, teeth cleaning, under paws cleaning, hygiene area cleaning, nail clipping, and basic trimming.",
    subCategories: packagePrices.map((item) => ({
      title: `${item.breed} Grooming - ${item.coat}`,
      items: [
        { label: "Single Session", price: item.single },
        { label: "6 Sessions @ 15% Discount", price: item.sessions[6] },
        { label: "12 Sessions @ 20% Discount", price: item.sessions[12] },
        { label: "24 Sessions @ 25% Discount", price: item.sessions[24] },
      ],
    })),
    notes: [
      "De-matting charges will be extra.",
      "Shaving charges will be extra.",
      "For puppies less than 6 months of age, ₹200 will be reduced per session.",
    ],
  },
  {
    section: "Individual Grooming Services",
    category: "Individual Services",
    description: "Focused grooming add-ons and individual services for specific pet care needs.",
    subCategories: [
      {
        title: "Add-on / Individual Grooming",
        items: [
          { label: "Only Haircut / Shaving", price: 850 },
          { label: "Face Trim", price: 450 },
          { label: "Nail Clipping", price: 150 },
          { label: "Under Paw Trimming", price: 150 },
          { label: "Teeth Cleaning", price: 100 },
          { label: "De-matting the Coat", price: 500 },
          { label: "Oil Massage", price: 450 },
        ],
      },
    ],
  },
  {
    section: "Boarding Policies",
    category: "Boarding Policies",
    description: "Important boarding policies for a smooth check-in, stay, and checkout experience.",
    subCategories: [
      {
        title: "Policy Points",
        items: boardingPolicies.map((policy) => ({ label: policy })),
      },
    ],
  },
] as const;

export const specialGroomingServices: ServiceSeed[] = packagePrices.flatMap((item, packageIndex) => [
  {
    name: `${item.breed} Grooming - ${item.coat} - Single Session`,
    category: "Grooming",
    service_group: "Complete Grooming",
    breed_size: item.breed,
    coat_type: item.coat,
    session_count: 1,
    display_order: 100 + packageIndex * 10,
    description_short: `${item.breed}, ${item.coat.toLowerCase()} complete grooming session.`,
    description_long: "Complete grooming session. De-matting and shaving are extra. Puppies below 6 months get ₹200 off per session.",
    price: item.single,
    slot_duration_mins: item.breed === "Extra Large Breed" ? 150 : 120,
    max_slots_per_day: 4,
    free_services_json: groomingIncludes,
    images_json: [
      item.breed === "Small Breed" ? "/service-grooming-small.png" :
      item.breed === "Large Breed" ? "/service-grooming-large.png" :
      "/service-grooming-xlarge.png"
    ],
    addons: serviceAddons,
  },
  ...([6, 12, 24] as const).map((sessionCount) => {
    const discount = sessionCount === 6 ? "15% OFF" : sessionCount === 12 ? "20% OFF" : "25% OFF";
    return {
      name: `${item.breed} Grooming - ${item.coat} - ${sessionCount} Sessions`,
      category: "Grooming",
      service_group: "Complete Grooming",
      breed_size: item.breed,
      coat_type: item.coat,
      session_count: sessionCount,
      display_order: 100 + packageIndex * 10 + ([6, 12, 24] as const).indexOf(sessionCount) + 1,
      description_short: `${discount} package for ${item.breed.toLowerCase()}, ${item.coat.toLowerCase()}.`,
      description_long: "Complete grooming package. De-matting and shaving are extra. Puppies below 6 months get ₹200 off per session.",
      price: item.single * sessionCount,
      discounted_price: item.sessions[sessionCount],
      slot_duration_mins: item.breed === "Extra Large Breed" ? 150 : 120,
      max_slots_per_day: 4,
      free_services_json: [...groomingIncludes, discount],
      images_json: [
        item.breed === "Small Breed" ? "/service-grooming-small.png" :
        item.breed === "Large Breed" ? "/service-grooming-large.png" :
        "/service-grooming-xlarge.png"
      ],
      addons: serviceAddons,
    };
  }),
]);

export const petCareServices: ServiceSeed[] = [
  ...boardingServices,
  ...individualGroomingServices,
  ...specialGroomingServices,
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
    terms: "Valid on active services above ₹500.",
    send_in_welcome_email: true,
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

export type BoardingScheduleInput = {
  check_in_date?: string | Date | null;
  check_out_date?: string | Date | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
};

function timeParts(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toUpperCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return { hour, minute };
}

function localDateTime(value?: string | Date | null, time?: string | null) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const parts = timeParts(time);
  if (!parts || Number.isNaN(date.getTime())) return null;
  date.setHours(parts.hour, parts.minute, 0, 0);
  return date;
}

export function boardingDurationHours(schedule: BoardingScheduleInput) {
  const checkIn = localDateTime(schedule.check_in_date, schedule.check_in_time);
  const checkOut = localDateTime(schedule.check_out_date, schedule.check_out_time);
  if (!checkIn || !checkOut || checkOut <= checkIn) return null;
  return (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
}

export function isBoardingPackageService(service?: { name?: string | null; service_group?: string | null } | null) {
  return Boolean(
    service?.service_group?.toLowerCase().includes("package")
    || service?.name?.toLowerCase().includes("package")
  );
}

export function boardingSlabLabel(hours: number | null) {
  if (hours == null) return "";
  if (hours <= 6) return "Up to 6 Hours";
  if (hours <= 12) return "6 to 12 Hours";
  const billableDays = Math.max(1, Math.ceil(hours / 24));
  return billableDays === 1 ? "24 Hours / 1 Day" : `${billableDays} billable days`;
}

export function boardingCalculatedAmount(hours: number | null, service?: { price?: number | null; discounted_price?: number | null; name?: string | null; service_group?: string | null } | null) {
  if (isBoardingPackageService(service)) return serviceBookablePrice(service || {});
  if (hours == null) return serviceBookablePrice(service || {});
  if (hours <= 6) return 600;
  if (hours <= 12) return 900;
  return Math.ceil(hours / 24) * 1200;
}

export function calculateCouponDiscount(coupon: CouponRule, subtotal: number) {
  if (coupon.discount_type === "FLAT") return Math.min(subtotal, coupon.discount_value);
  return Math.round((subtotal * coupon.discount_value) / 100);
}
