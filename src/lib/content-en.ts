import type {
  BlogPost,
  CaseStudy,
  Feature,
  FeatureDetail,
  FeatureSlug,
  PricingPlan,
  SecurityHighlight
} from "./content";

export const featureListEn: Feature[] = [
  {
    title: "Unified Operations Dashboard",
    description: "Monitor sales, staffing, and inventory in one pane of glass.",
    icon: "💼"
  },
  {
    title: "Automated Attendance & Payroll",
    description: "QR punches with IP validation eliminate manual reconciliation.",
    icon: "🕓"
  },
  {
    title: "QR Ordering",
    description: "Sync every table order to the floor in milliseconds.",
    icon: "🧾"
  },
  {
    title: "Talent & Staff Apps",
    description: "Scorecards and leaderboards to keep everyone motivated.",
    icon: "🧑‍💼"
  },
  {
    title: "Customer CRM & Rankings",
    description: "Segment VIPs and orchestrate personal outreach automatically.",
    icon: "🎯"
  }
];

export const featureDetailsEn: Record<FeatureSlug, FeatureDetail> = {
  dashboard: {
    title: "Unified Operations Dashboard",
    description:
      "Visualize real-time KPIs across venues and respond instantly to floor conditions.",
    highlights: [
      "AI forecasting for nightly revenue",
      "Performance benchmarks by section and talent",
      "Responsive layouts for every device"
    ],
    metrics: [
      { label: "Average revenue lift", value: "+28%" },
      { label: "Reporting time saved", value: "-12h/mo" },
      { label: "Satisfaction", value: "4.9/5" }
    ]
  },
  attendance: {
    title: "Automated Attendance & Payroll",
    description:
      "Authenticate every shift with QR punches and location checks while payroll runs itself.",
    highlights: [
      "Built-in support for incentives and commissions",
      "Tamper-proof attendance trail",
      "Instant payslips through the mobile app"
    ],
    metrics: [
      { label: "Error reduction", value: "-96%" },
      { label: "Payroll processing", value: "6h → 15m" },
      { label: "Team satisfaction", value: "4.8/5" }
    ]
  },
  order: {
    title: "QR Ordering",
    description: "Sync high-volume table orders to bar and kitchen teams in milliseconds.",
    highlights: [
      "POS and kitchen display integrations",
      "Inventory alerts with smart reordering",
      "Hardened infrastructure for peak hours"
    ],
    metrics: [
      { label: "Serve time", value: "-42%" },
      { label: "Average spend", value: "+18%" },
      { label: "Order mistakes", value: "-90%" }
    ]
  },
  crm: {
    title: "Customer CRM & Rankings",
    description:
      "Centralize guest preferences and automate outreach so every VIP moment feels personal.",
    highlights: [
      "Automatic VIP scoring",
      "Visit predictions with reminders",
      "LINE & messaging integrations"
    ],
    metrics: [
      { label: "Repeat rate", value: "+35%" },
      { label: "Outreach prep time", value: "-55%" },
      { label: "Guest satisfaction", value: "4.8/5" }
    ]
  },
  payroll: {
    title: "Payroll Workflow",
    description:
      "Standardize deductions, bonuses, and compliance with audit-ready change logs.",
    highlights: [
      "Auto-updated tax and deduction rules",
      "CSV + accounting system exports",
      "Electronic record retention compliance"
    ],
    metrics: [
      { label: "Payroll cycle", value: "10x faster" },
      { label: "Audit prep time", value: "-70%" },
      { label: "Cost savings", value: "-25%" }
    ]
  }
};

export const pricingPlansEn: PricingPlan[] = [
  {
    name: "Starter",
    price: "¥39,800",
    description: "Everything you need to digitize a single venue.",
    highlight: "Launch in 24 hours",
    features: [
      "Staff & talent management",
      "Attendance + payroll automation",
      "QR ordering (up to 5 tables)",
      "Email support"
    ]
  },
  {
    name: "Pro",
    price: "¥79,800",
    description: "Purpose-built for multi-location operators.",
    highlight: "Best seller",
    features: [
      "Multi-venue dashboard",
      "CRM & rankings",
      "Branded mobile apps",
      "24/7 chat support"
    ],
    featured: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Tailored deployments with dedicated experts.",
    highlight: "White-glove onboarding",
    features: [
      "Custom integrations",
      "Private cloud options",
      "99.99% SLA",
      "On-site rollout"
    ]
  }
];

export const caseStudiesEn: CaseStudy[] = [
  {
    slug: "luxe-lounge",
    title: "Luxe Lounge",
    industry: "Lounge",
    summary: "Boosted VIP repeat visits by 48% within six months.",
    body:
      "Facing long waits during the late-night rush, Luxe Lounge deployed NightBase ordering and attendance. Faster fulfillment and smarter talent scheduling unlocked a noticeably smoother guest journey."
  },
  {
    slug: "nocturne",
    title: "Club Nocturne",
    industry: "Cabaret",
    summary: "Cut payroll administration time by 80%.",
    body:
      "Club Nocturne moved from spreadsheets to NightBase automation, shrinking payroll close from a day to 30 minutes. The talent app increased daily report submissions to 97%."
  },
  {
    slug: "stardust",
    title: "Stardust Bar",
    industry: "Bar",
    summary: "Raised average spend per guest by 25%.",
    body:
      "With CRM insights and dashboards, Stardust Bar accelerated campaigns and tightened guest follow-up. The team works from one playbook and wins more regulars every week."
  }
];

export const blogPostsEn: BlogPost[] = [
  {
    slug: "nightwork-dx-strategy",
    title: "Nightlife DX Playbook",
    excerpt: "Connect data and teams across your venues with NightBase tactics.",
    date: "2024-05-18"
  },
  {
    slug: "cast-engagement",
    title: "3 Ways to Elevate Talent Engagement",
    excerpt: "Design incentives, scorecards, and communication loops that perform.",
    date: "2024-04-25"
  },
  {
    slug: "night-industry-trends",
    title: "2024 Nightlife Operations Trends",
    excerpt: "How hybrid experiences and data-driven hospitality are reshaping the industry.",
    date: "2024-03-30"
  }
];

export const securityHighlightsEn: SecurityHighlight[] = [
  {
    title: "Supabase + Vercel + Stripe",
    description: "Enterprise-grade infrastructure with instant global edge delivery."
  },
  {
    title: "SOC2 & ISO27001 Ready",
    description: "Operational controls aligned with leading compliance frameworks."
  },
  {
    title: "End-to-end Encryption",
    description: "AES-256 protection for talent and guest data in transit and at rest."
  }
];
