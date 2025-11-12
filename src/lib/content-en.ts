export const featureListEn = [
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
] as const;

export const pricingPlansEn = [
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
] as const;
