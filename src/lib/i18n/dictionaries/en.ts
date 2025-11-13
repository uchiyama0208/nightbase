import type { Dictionary } from "../types";

export const en: Dictionary = {
  metadata: {
    title: "NightBase | Operating System for Nightlife Venues",
    description:
      "NightBase unifies cast, staff, guest, attendance, payroll, and QR ordering into one beautiful platform built for bars, lounges, and cabaret clubs."
  },
  navigation: {
    brandTagline: "Reimagining the nightlife back office.",
    cta: "Book a demo",
    links: [
      { href: "/", label: "Home" },
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/case-studies", label: "Case Studies" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" }
    ],
    localeSwitcherLabel: "Language",
    localeNames: {
      ja: "日本語",
      en: "English"
    }
  },
  footer: {
    description:
      "NightBase empowers nightlife teams with a unified operating system to deliver elevated guest experiences and efficient operations.",
    links: [
      {
        title: "Product",
        items: [
          { href: "/features", label: "All features" },
          { href: "/pricing", label: "Pricing" },
          { href: "/security", label: "Security" }
        ]
      },
      {
        title: "Company",
        items: [
          { href: "/about", label: "About" },
          { href: "/company", label: "Company" },
          { href: "/contact", label: "Contact" }
        ]
      },
      {
        title: "Resources",
        items: [
          { href: "/case-studies", label: "Case studies" },
          { href: "/blog", label: "Blog" },
          { href: "/privacy-policy", label: "Privacy" }
        ]
      }
    ],
    legal: [
      { href: "/terms-of-service", label: "Terms" },
      { href: "/privacy-policy", label: "Privacy" }
    ],
    cta: {
      title: "Bring clarity to every shift",
      description: "Launch NightBase in as little as three days with white-glove onboarding.",
      action: "Book a demo",
      href: "/contact"
    },
    copyright: "© 2025 NightBase Inc. All rights reserved."
  },
  home: {
    hero: {
      eyebrow: "Nightlife Operations OS",
      title: "An Apple-like experience for nightlife teams.",
      description:
        "Give managers, cast, and HQ the same intuitive workspace. From shift design to VIP loyalty, NightBase keeps your teams in sync.",
      primaryCta: { label: "Request demo", href: "/contact" },
      secondaryCta: { label: "Explore features", href: "/features" },
      stats: [
        { label: "Venues onboarded", value: "120+" },
        { label: "Time saved", value: "-43%" },
        { label: "Satisfaction", value: "4.9/5" }
      ]
    },
    beforeAfter: {
      title: "Why nightlife brands upgrade",
      problems: {
        title: "Before NightBase",
        bullets: [
          "Fragmented spreadsheets and manual notes",
          "Managers spend 3h/week coordinating shifts",
          "Sales numbers arrive a day later"
        ]
      },
      solutions: {
        title: "After NightBase",
        bullets: [
          "Unified view of every cast, guest, and booking",
          "AI recommends the optimal roster in seconds",
          "Real-time dashboards for sales and rankings"
        ]
      }
    },
    features: {
      title: "Designed with the polish of Apple",
      description:
        "Each workflow is crafted with generous spacing, subtle motion, and precise typography so teams can focus on hospitality.",
      items: [
        {
          title: "Cast & guest CRM",
          description: "Track profiles, visits, spend, and VIP status with ease. Segment audiences and personalize outreach.",
          icon: "Users"
        },
        {
          title: "Shift intelligence",
          description: "Blend preferences, forecasted demand, and compliance rules to craft the perfect lineup.",
          icon: "CalendarRange"
        },
        {
          title: "Payroll automation",
          description: "Model complex commissions, bonuses, and deductions. Close the books with one click.",
          icon: "Coins"
        },
        {
          title: "QR ordering",
          description: "Delight VIPs with customizable menus and instant routing to bar and kitchen teams.",
          icon: "QrCode"
        }
      ]
    },
    uiPreview: {
      title: "A cockpit for every role",
      description:
        "Glide through data with cinematic transitions and crisp cards. Monitor mood, top spenders, and operational KPIs from any device.",
      highlights: [
        "Drag-and-drop roster editing",
        "AI nudges for VIP follow-ups",
        "Consistent experience on desktop and mobile"
      ]
    },
    forWhom: {
      title: "Built for the entire venue",
      segments: [
        {
          title: "Owners & executives",
          description: "See live performance across every location and plan the next move with confidence.",
          benefits: ["Multi-location P&L", "Momentum alerts", "Cash flow forecasts"]
        },
        {
          title: "Managers",
          description: "Run nightly operations with clarity—from staffing to events and compliance.",
          benefits: ["Smart roster builder", "Attendance alerts", "Event playbooks"]
        },
        {
          title: "Cast & staff",
          description: "Access schedules, earnings, and guest cards from a beautifully simple mobile app.",
          benefits: ["Instant payslips", "Shared VIP notes", "Motivating badges"]
        }
      ]
    },
    testimonials: {
      title: "Trusted by forward-thinking venues",
      items: [
        {
          quote: "We cut admin in half and finally have visibility into every guest relationship.",
          name: "BAR LUMINOUS",
          role: "General Manager",
          avatarInitials: "BL"
        },
        {
          quote: "NightBase shows us the next best action for VIP retention. Repeat visits are up 25%.",
          name: "CLUB AURORA",
          role: "Owner",
          avatarInitials: "CA"
        }
      ]
    },
    pricing: {
      title: "Plans for every stage",
      description: "Security, support, and product updates are included in every plan.",
      plans: [
        {
          id: "starter",
          name: "Starter",
          price: "¥39,800/mo",
          description: "Essential tools for a single venue",
          features: ["Cast & guest CRM", "Shift & attendance", "Starter reports"],
          ctaLabel: "Talk to us"
        },
        {
          id: "pro",
          name: "Pro",
          price: "¥79,800/mo",
          description: "Automation and analytics for growing groups",
          features: ["AI roster automation", "Payroll workflows", "VIP intelligence"],
          ctaLabel: "Book a demo",
          badge: "Most popular"
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: "Custom",
          description: "Tailored onboarding and integrations",
          features: ["Dedicated success", "API integrations", "24/7 premium support"],
          ctaLabel: "Talk to us"
        }
      ]
    },
    security: {
      title: "Enterprise-grade security",
      bullets: [
        "Redundant infrastructure in AWS Tokyo",
        "TLS 1.3 encryption end to end",
        "Role-based access with full audit trails"
      ]
    },
    about: {
      title: "Our vision",
      mission: "Elevate nightlife work through intuitive software.",
      vision: "Empower every night worker to thrive with pride and safety."
    },
    finalCta: {
      title: "See NightBase in action",
      description: "Share your goals and we will tailor a rollout plan for your venues.",
      primaryCta: { label: "Book a demo", href: "/contact" },
      secondaryCta: { label: "Download brochure", href: "/contact" }
    }
  },
  features: {
    title: "Feature deep dive",
    description: "NightBase reimagines complex nightlife workflows into guided, delightful journeys.",
    sections: [
      {
        slug: "cast-crm",
        name: "Cast & guest CRM",
        headline: "All VIP knowledge in one cinematic profile",
        summary:
          "Centralize every note, preference, and spending pattern. AI surfaces the right moments to reconnect with VIP guests.",
        highlights: [
          "Rich guest dossiers",
          "VIP loyalty scoring",
          "LINE and email automation"
        ],
        metrics: [
          { label: "Repeat visits", value: "+25%" },
          { label: "Manual entry", value: "-40%" }
        ]
      },
      {
        slug: "shift-automation",
        name: "Shift intelligence",
        headline: "Shape the perfect roster in moments",
        summary:
          "Blend availability, predicted demand, and compliance rules. Approvals, announcements, and attendance are synchronized automatically.",
        highlights: [
          "AI roster simulations",
          "Attendance alerts",
          "Event templates"
        ],
        metrics: [
          { label: "Scheduling time", value: "-3h/week" },
          { label: "Overtime requests", value: "-52%" }
        ]
      },
      {
        slug: "payroll-automation",
        name: "Payroll automation",
        headline: "Eliminate commission and deduction errors",
        summary:
          "Configure layered commission models, allowances, and deductions. Issue payslips instantly with full audit history.",
        highlights: ["Multi-tier commissions", "Digital payslips", "Accounting integrations"],
        metrics: [
          { label: "Close time", value: "-68%" },
          { label: "Errors", value: "0" }
        ]
      },
      {
        slug: "qr-ordering",
        name: "QR ordering",
        headline: "Service VIP tables with cinematic speed",
        summary:
          "Offer branded menus and instant order routing. Surface insights on best-sellers and attach upsells effortlessly.",
        highlights: ["Custom design", "Live order tracking", "Sales analytics"],
        metrics: [
          { label: "Serving time", value: "-35%" },
          { label: "Spend per guest", value: "+18%" }
        ]
      }
    ]
  },
  pricing: {
    title: "Pricing",
    description: "Straightforward pricing backed by proactive support.",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "¥39,800/mo",
        description: "Essential tools for single venues",
        features: ["Cast & guest CRM", "Shift & attendance", "Standard support"],
        ctaLabel: "Talk to us"
      },
      {
        id: "pro",
        name: "Pro",
        price: "¥79,800/mo",
        description: "Advanced automation for multi-venue teams",
        features: ["AI roster automation", "Payroll automation", "VIP insights"],
        ctaLabel: "Book a demo",
        badge: "Most popular"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "Custom",
        description: "Tailored onboarding and integrations",
        features: ["Dedicated onboarding", "API/BI integrations", "24/7 premium support"],
        ctaLabel: "Talk to us"
      }
    ],
    faq: [
      {
        question: "How long does implementation take?",
        answer: "Most venues launch within two weeks. Our team imports historical data and trains your staff."
      },
      {
        question: "What support do we receive?",
        answer: "Dedicated customer success with chat, live workshops, and rollout playbooks tailored to your teams."
      }
    ],
    cta: {
      title: "Let’s craft the right plan",
      description: "Tell us about your venues and we’ll recommend the optimal rollout.",
      action: "Speak with us",
      href: "/contact"
    }
  },
  caseStudies: {
    title: "Case studies",
    description: "NightBase powers leading venues focused on elevated service and profitability.",
    items: [
      {
        slug: "luminous",
        industry: "Lounge",
        title: "20% revenue lift with data-driven shifts",
        summary:
          "NightBase connected sales, rosters, and VIP loyalty—unlocking better staffing decisions and higher guest satisfaction.",
        quote: {
          text: "We finally see how staffing affects sales in real time.",
          author: "BAR LUMINOUS",
          role: "Owner"
        },
        metrics: [
          { label: "Revenue", value: "+20%" },
          { label: "Labor cost", value: "-15%" }
        ],
        result: "Managers run lean shifts, reduce overtime, and follow up with top guests precisely when it matters."
      },
      {
        slug: "aurora",
        industry: "Cabaret",
        title: "25% boost in VIP retention",
        summary:
          "Unified guest dossiers and AI nudges helped Aurora’s team deliver personalized experiences consistently.",
        quote: {
          text: "Our cast loves the interface—it feels premium and effortless.",
          author: "CLUB AURORA",
          role: "Manager"
        },
        metrics: [
          { label: "VIP frequency", value: "+25%" },
          { label: "Spend per guest", value: "+18%" }
        ],
        result: "VIP follow-ups are timely, relevant, and measurable thanks to NightBase automations."
      }
    ]
  },
  about: {
    title: "About NightBase",
    mission: {
      title: "Mission",
      description: "Use technology to elevate nightlife work and reclaim time for hospitality."
    },
    vision: {
      title: "Vision",
      description: "Create a world where every nightlife professional thrives with pride."
    },
    team: [
      {
        name: "Yuji Uchiyama",
        role: "Founder / CEO",
        bio: "Former nightlife operator blending hands-on experience with modern product craftsmanship."
      },
      {
        name: "Mina Sato",
        role: "Head of Product",
        bio: "Design leader previously at Apple and SaaS innovators, shaping premium experiences."
      }
    ],
    company: {
      title: "Company",
      facts: [
        { label: "Legal name", value: "NightBase Inc." },
        { label: "Headquarters", value: "Shibuya, Tokyo" },
        { label: "Founded", value: "2022" },
        { label: "Capital", value: "¥100,000,000" }
      ]
    }
  },
  security: {
    title: "Security",
    description: "Protecting sensitive guest data with industry-leading practices.",
    pillars: [
      {
        title: "Infrastructure",
        items: [
          "AWS Tokyo multi-AZ architecture",
          "Zero-trust network perimeter",
          "Continuous penetration testing"
        ]
      },
      {
        title: "Data protection",
        items: ["AES-256 encryption", "Automated backups & DR", "Data masking"]
      },
      {
        title: "Access control",
        items: ["SAML/SSO", "Granular role management", "Comprehensive audit trails"]
      }
    ],
    compliance: {
      title: "Compliance",
      items: ["ISMS & PrivacyMark in progress", "Compliant with Japan APPI", "Internal control reporting"]
    }
  },
  blog: {
    title: "NightBase Journal",
    description: "Insights on nightlife digitization, hospitality design, and product updates.",
    posts: [
      {
        slug: "nightbase-product-update-2025",
        title: "Spring 2025 product highlights",
        description: "AI roster upgrades, refreshed UI, and new analytics modules.",
        date: "2025-03-18"
      },
      {
        slug: "nightlife-dx-playbook",
        title: "Nightlife DX playbook",
        description: "Blueprints and case studies for modernizing operations.",
        date: "2025-02-05"
      }
    ]
  },
  contact: {
    title: "Contact & demo requests",
    description: "Share your goals and we will schedule a tailored walkthrough of NightBase.",
    successMessage: "Thank you—we'll be in touch within two business days.",
    submitLabel: "Send message",
    privacy: "By submitting, you agree to our privacy policy.",
    fields: [
      {
        name: "company",
        label: "Company / Venue",
        placeholder: "NightBase Inc.",
        type: "text"
      },
      {
        name: "name",
        label: "Full name",
        placeholder: "Taro Yamada",
        type: "text"
      },
      {
        name: "email",
        label: "Email",
        placeholder: "name@example.com",
        type: "email"
      },
      {
        name: "message",
        label: "How can we help?",
        placeholder: "We'd like to explore NightBase for our venues...",
        type: "textarea"
      }
    ]
  },
  contactThanks: {
    title: "Thank you for reaching out",
    description: "A NightBase specialist will respond shortly.",
    actionLabel: "Back to home",
    actionHref: "/"
  },
  legal: {
    privacy: {
      title: "Privacy policy",
      content: [
        "NightBase Inc. (\"NightBase\") is committed to protecting personal information and providing transparency.",
        "We only use collected data to deliver and support our services unless otherwise authorized or required by law.",
        "Strict technical and organizational measures ensure the confidentiality and integrity of your information."
      ]
    },
    terms: {
      title: "Terms of service",
      content: [
        "These terms govern the use of NightBase products and services.",
        "By using our services you agree to the latest published terms.",
        "NightBase may update these terms, and changes become effective upon publication."
      ]
    },
    company: {
      title: "Company",
      facts: [
        { label: "Legal name", value: "NightBase Inc." },
        { label: "Headquarters", value: "Shibuya, Tokyo" },
        { label: "CEO", value: "Yuji Uchiyama" },
        { label: "Capital", value: "¥100,000,000" }
      ]
    }
  }
};

export default en;
