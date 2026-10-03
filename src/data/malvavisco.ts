/**
 * Public product copy for Malvavisco. The screen captures are from the real
 * LodgeOps staff app with a fictional sample lodge, not a customer endorsement.
 * Claims follow lodge-ops/docs/status.md and docs/guides/staff-workflows.md;
 * deferred work is described in lodge-ops/docs/backlog.md.
 */

export interface ProductScreenshot {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

export const malvaviscoBrand = {
  name: "Malvavisco",
  category: "Lodge operations software",
  headline: "The whole lodge, one clear view.",
  description:
    "Manage stays, activities, daily work, kitchen orders and balances from one staff workspace.",
  demoNote: "Product screens show a fictional sample lodge.",
  primaryAction: "Request a demo",
  highlights: [
    "Rooms, guides and equipment",
    "Booking-linked kitchen orders",
    "English and Spanish staff workspace",
  ],
} as const;

export const productScreenshots = {
  dashboard: {
    src: "/product/dashboard.webp",
    alt: "Sample lodge dashboard showing arrivals, departures, receivables and room occupancy.",
    caption: "Today's guest flow and what needs attention.",
    width: 1760,
    height: 1100,
  },
  calendar: {
    src: "/product/calendar.webp",
    alt: "Monthly Places calendar showing bookings across rooms and cabins in a sample lodge.",
    caption: "Room and cabin availability on one calendar.",
    width: 1760,
    height: 1100,
  },
  booking: {
    src: "/product/booking.webp",
    alt: "Sample booking with stay details, guest information, services and balance due.",
    caption: "The stay, group, charges and notes together.",
    width: 1760,
    height: 1100,
  },
  activities: {
    src: "/product/booking-activities.webp",
    alt: "Activities tab with scheduled services, guides, equipment and times for a sample booking.",
    caption: "Purchased activities become scheduled work.",
    width: 1760,
    height: 1100,
  },
  crew: {
    src: "/product/calendar-crew.webp",
    alt: "Weekly Crew calendar showing guides assigned to dated activities.",
    caption: "See each guide's actual assignment times.",
    width: 1760,
    height: 1100,
  },
  assets: {
    src: "/product/calendar-assets.webp",
    alt: "Weekly Assets calendar showing boats and horses assigned to activities.",
    caption: "Plan boats, horses and other shared equipment.",
    width: 1760,
    height: 1100,
  },
  operations: {
    src: "/product/operations.webp",
    alt: "Daily operations board with role-specific tasks and today's guest flow.",
    caption: "A practical plan for the day's team.",
    width: 1760,
    height: 1100,
  },
  mobileOperations: {
    src: "/product/mobile-operations.webp",
    alt: "Daily operations priority queue on a narrow mobile screen.",
    caption: "The same daily work on a phone.",
    width: 780,
    height: 1688,
  },
  pos: {
    src: "/product/pos.webp",
    alt: "Booking-linked point of sale showing products, a cart, dietary notes and current charges.",
    caption: "Extras land on the right booking.",
    width: 1760,
    height: 1100,
  },
  kitchen: {
    src: "/product/kitchen.webp",
    alt: "Kitchen preparation tickets showing queued, preparing and ready orders with dietary notes.",
    caption: "Preparation tickets keep the kitchen in step.",
    width: 1760,
    height: 1100,
  },
  reports: {
    src: "/product/reports.webp",
    alt: "Revenue report with monthly charges and payments for a sample lodge.",
    caption: "Understand recorded revenue and payments by currency.",
    width: 1760,
    height: 1100,
  },
} as const satisfies Record<string, ProductScreenshot>;

/** Keep the scene IDs to reuse Artho's established card motion choreography. */
export const featureCards = [
  {
    id: "calendar",
    title: "See every stay at a glance",
    description: "Plan rooms and cabins with availability, bookings and maintenance blocks in view.",
    scene: "overview",
    screenshot: productScreenshots.calendar,
  },
  {
    id: "bookings",
    title: "Keep the whole stay together",
    description: "Rooms, purchased activities, charges, guests and notes stay with the booking.",
    scene: "billing",
    screenshot: productScreenshots.booking,
  },
  {
    id: "operations",
    title: "Know what today needs",
    description: "Arrivals, room readiness and role-specific tasks give each team a clear plan.",
    scene: "analytics",
    screenshot: productScreenshots.operations,
  },
  {
    id: "activities",
    title: "Schedule guides and gear",
    description: "Assign real people and equipment to purchased activities with overlap checks.",
    scene: "budget",
    screenshot: productScreenshots.activities,
  },
  {
    id: "kitchen",
    title: "Connect the tab to the kitchen",
    description: "Booking-linked sales create preparation tickets for items routed to kitchen or bar.",
    scene: "integrations",
    screenshot: productScreenshots.kitchen,
  },
] as const;

/** Five screenshot-backed sections for the current FeatureDetails layout. */
export const featureDetails = [
  {
    eyebrow: "Places calendar",
    title: "Availability your team can act on",
    description:
      "See rooms and cabins by week, month or season. Start a booking from an empty date and keep maintenance blocks visible.",
    image: productScreenshots.calendar.src,
    alt: productScreenshots.calendar.alt,
    points: [
      ["Simple or split stays", "Assign one room for the stay or plan rooms night by night."],
      ["Server-checked availability", "Capacity and overlaps are checked when a booking is saved."],
      ["Crew and assets", "Switch calendars to see scheduled guides and equipment."],
    ],
  },
  {
    eyebrow: "Bookings",
    title: "One booking follows the whole stay",
    description:
      "Build a priced booking from configured rates, then keep guest details, services, charges and payments together.",
    image: productScreenshots.booking.src,
    alt: productScreenshots.booking.alt,
    points: [
      ["Clear room plans", "See rooms for the full stay or for individual nights."],
      ["One running folio", "Add catalog items or a custom charge and review the balance."],
      ["History stays intact", "Corrections and reversals retain an audit trail."],
    ],
  },
  {
    eyebrow: "Activities and resources",
    title: "Turn a purchase into a real plan",
    description:
      "Sell the service first, then schedule its time and assign guides, boats, horses or other assets when the plan is ready.",
    image: productScreenshots.activities.src,
    alt: productScreenshots.activities.alt,
    points: [
      ["Concrete assignments", "The Crew and Assets calendars show actual scheduled times."],
      ["Capacity checks", "Overlapping guide and equipment commitments are rejected."],
      ["No second charge", "Scheduling an already purchased activity does not bill it again."],
    ],
  },
  {
    eyebrow: "Daily operations",
    title: "A shared plan for the working day",
    description:
      "Give staff today's arrivals, guest flow and the tasks relevant to their role, including room, guide and kitchen work.",
    image: productScreenshots.operations.src,
    alt: productScreenshots.operations.alt,
    points: [
      ["Role-specific work", "Each staff member sees the actions their access allows."],
      ["Guest context", "Dietary information reaches the team handling the order."],
      ["Mobile view", "The daily priority queue also works on narrow screens."],
    ],
  },
  {
    eyebrow: "Kitchen and reports",
    title: "Orders and numbers stay connected",
    description:
      "Post a booking-linked sale once, route prepared items to a ticket, and review recorded money in native-currency reports.",
    image: productScreenshots.kitchen.src,
    alt: productScreenshots.kitchen.alt,
    points: [
      ["Preparation states", "Move tickets from queued to preparing, ready and served."],
      ["Included meals", "Plan entitlements without creating a duplicate charge."],
      ["Useful exports", "Download available report details as CSV or XLSX."],
    ],
  },
] as const;

/** Stable panel IDs let the existing tab and reveal motion continue to work. */
export const workflowSteps = [
  {
    number: "01",
    title: "Set up your places and rates",
    description: "Configure rooms, capacities, services and prices for the lodge you actually run.",
    panel: "signup",
    screenshot: productScreenshots.calendar,
  },
  {
    number: "02",
    title: "Build the stay",
    description: "Choose dates and rooms, add the group and services, and review the server-priced total.",
    panel: "card",
    screenshot: productScreenshots.booking,
  },
  {
    number: "03",
    title: "Schedule the experience",
    description: "Give a purchased activity its time, guides and equipment without charging it again.",
    panel: "dashboard",
    screenshot: productScreenshots.activities,
  },
  {
    number: "04",
    title: "Run the day together",
    description: "Follow arrivals and tasks, send prepared orders to the kitchen and track the balance.",
    panel: "insights",
    screenshot: productScreenshots.operations,
  },
] as const;
