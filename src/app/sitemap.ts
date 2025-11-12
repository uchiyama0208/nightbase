import type { MetadataRoute } from "next";
import { blogPosts, caseStudies, featureDetails } from "@/lib/content";
import { blogPostsEn, caseStudiesEn } from "@/lib/content-en";

const baseUrl = "https://nightbase.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "features",
    "pricing",
    "case-studies",
    "about",
    "security",
    "blog",
    "contact",
    "contact/thanks",
    "privacy-policy",
    "terms-of-service",
    "company",
    "en",
    "en/features",
    "en/pricing",
    "en/case-studies",
    "en/about",
    "en/security",
    "en/blog",
    "en/contact",
    "en/contact/thanks"
  ].map((path) => `${baseUrl}/${path}`.replace(/\/$/, ""));

  const featurePaths = (Object.keys(featureDetails) as Array<keyof typeof featureDetails>).flatMap((slug) => [
    `${baseUrl}/features/${slug}`,
    `${baseUrl}/en/features/${slug}`
  ]);

  const caseStudyPaths = [
    ...caseStudies.map((study) => `${baseUrl}/case-studies/${study.slug}`),
    ...caseStudiesEn.map((study) => `${baseUrl}/en/case-studies/${study.slug}`)
  ];

  const blogPaths = [
    ...blogPosts.map((post) => `${baseUrl}/blog/${post.slug}`),
    ...blogPostsEn.map((post) => `${baseUrl}/en/blog/${post.slug}`)
  ];

  const urls = [...staticPaths, ...featurePaths, ...caseStudyPaths, ...blogPaths];

  return urls.map((url) => ({
    url,
    lastModified: new Date().toISOString().split("T")[0]
  }));
}
