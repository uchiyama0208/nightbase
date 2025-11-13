import type { Locale } from "./config";

export type NavigationDictionary = {
  brandTagline: string;
  cta: string;
  links: { href: string; label: string }[];
  localeSwitcherLabel: string;
  localeNames: Record<Locale, string>;
};

export type FooterDictionary = {
  description: string;
  links: {
    title: string;
    items: { href: string; label: string }[];
  }[];
  legal: { href: string; label: string }[];
  cta: {
    title: string;
    description: string;
    action: string;
    href: string;
  };
  copyright: string;
};

export type HeroDictionary = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  stats: { label: string; value: string }[];
};

export type FeatureSummary = {
  title: string;
  description: string;
  icon: string;
};

export type FeatureDetail = {
  slug: string;
  name: string;
  headline: string;
  summary: string;
  highlights: string[];
  metrics: { label: string; value: string }[];
};

export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaLabel: string;
  badge?: string;
};

export type CaseStudy = {
  slug: string;
  industry: string;
  title: string;
  summary: string;
  quote: {
    text: string;
    author: string;
    role: string;
  };
  metrics: { label: string; value: string }[];
  result: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

export type Dictionary = {
  metadata: {
    title: string;
    description: string;
  };
  navigation: NavigationDictionary;
  footer: FooterDictionary;
  home: {
    hero: HeroDictionary;
    beforeAfter: {
      title: string;
      problems: { title: string; bullets: string[] };
      solutions: { title: string; bullets: string[] };
    };
    features: {
      title: string;
      description: string;
      items: FeatureSummary[];
    };
    uiPreview: {
      title: string;
      description: string;
      highlights: string[];
    };
    forWhom: {
      title: string;
      segments: {
        title: string;
        description: string;
        benefits: string[];
      }[];
    };
    testimonials: {
      title: string;
      items: {
        quote: string;
        name: string;
        role: string;
        avatarInitials: string;
      }[];
    };
    pricing: {
      title: string;
      description: string;
      plans: PricingPlan[];
    };
    security: {
      title: string;
      bullets: string[];
    };
    about: {
      title: string;
      mission: string;
      vision: string;
    };
    finalCta: {
      title: string;
      description: string;
      primaryCta: { label: string; href: string };
      secondaryCta: { label: string; href: string };
    };
  };
  features: {
    title: string;
    description: string;
    sections: FeatureDetail[];
  };
  pricing: {
    title: string;
    description: string;
    plans: PricingPlan[];
    faq: {
      question: string;
      answer: string;
    }[];
    cta: {
      title: string;
      description: string;
      action: string;
      href: string;
    };
  };
  caseStudies: {
    title: string;
    description: string;
    items: CaseStudy[];
  };
  about: {
    title: string;
    mission: {
      title: string;
      description: string;
    };
    vision: {
      title: string;
      description: string;
    };
    team: {
      name: string;
      role: string;
      bio: string;
    }[];
    company: {
      title: string;
      facts: { label: string; value: string }[];
    };
  };
  security: {
    title: string;
    description: string;
    pillars: {
      title: string;
      items: string[];
    }[];
    compliance: {
      title: string;
      items: string[];
    };
  };
  blog: {
    title: string;
    description: string;
    posts: BlogPost[];
  };
  contact: {
    title: string;
    description: string;
    successMessage: string;
    submitLabel: string;
    privacy: string;
    fields: {
      name: string;
      label: string;
      placeholder: string;
      type: "text" | "email" | "textarea";
    }[];
  };
  contactThanks: {
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
  };
  legal: {
    privacy: { title: string; content: string[] };
    terms: { title: string; content: string[] };
    company: { title: string; facts: { label: string; value: string }[] };
  };
};
