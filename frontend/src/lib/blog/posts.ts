/**
 * Blog post data structure and content management
 *
 * This file contains the blog post metadata and content structure.
 * Add new blog posts here to make them appear on the blog page.
 */

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  dateTime: string;
  category: string;
  categoryColor: string;
  readTime?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  author?: {
    name: string;
    role: string;
    avatar?: string;
  };
  tags?: string[];
  heroImage?: {
    src: string;
    alt: string;
    caption?: string;
  };
}

export const blogPosts: BlogPost[] = [
  {
    slug: "introducing-connect-signull",
    title: "Introducing ConnectSignull: A Game for Human Connection",
    excerpt:
      "In an era of fragmented attention, we built a game designed to foster meaningful social interaction through shared references and cooperative gameplay.",
    date: "January 16, 2026",
    dateTime: "2026-01-16",
    category: "ANNOUNCEMENT",
    categoryColor: "text-yellow-600",
    readTime: "4 min read",
    isNew: true,
    isFeatured: true,
    author: {
      name: "Prayush Dave",
      role: "Creator",
    },
    tags: ["announcement", "vision", "social-connection"],
  },
  {
    slug: "how-to-play-connect-signull",
    title: "Cooperative Deception: How to Play ConnectSignull",
    excerpt:
      "Learn the unique mechanics of ConnectSignull, from asymmetric roles and progressive revelation to the art of creating the perfect 'signull'.",
    date: "January 15, 2026",
    dateTime: "2026-01-15",
    category: "STRATEGY",
    categoryColor: "text-blue-600",
    readTime: "6 min read",
    isNew: true,
    author: {
      name: "ConnectSignull Team",
      role: "Game Guides",
    },
    tags: ["guide", "strategy", "gameplay", "mechanics"],
  },
  {
    slug: "design-of-connection",
    title: "The Design of Connection: Cards, Scoring & Neobrutalism",
    excerpt:
      "A deep dive into the design decisions behind ConnectSignull, including the card-based interface, 'neobrutalist' aesthetic, and the psychology of scoring.",
    date: "January 14, 2026",
    dateTime: "2026-01-14",
    category: "BEHIND THE SCENES",
    categoryColor: "text-gray-500",
    readTime: "7 min read",
    isNew: true,
    author: {
      name: "Prayush Dave",
      role: "Lead Developer",
    },
    tags: ["design", "development", "ux", "research"],
  },
  {
    slug: "frictionless-onboarding",
    title: "The Art of Frictionless Onboarding",
    excerpt:
      "Why we obsessed over room codes, QR scanning, and 'boring' details to ensure players can join the game in seconds.",
    date: "January 13, 2026",
    dateTime: "2026-01-13",
    category: "BEHIND THE SCENES",
    categoryColor: "text-gray-500",
    readTime: "5 min read",
    isNew: true,
    author: {
      name: "Prayush Dave",
      role: "Lead Developer",
    },
    tags: ["ux", "product", "onboarding", "growth"],
  },
  {
    slug: "sound-design-impact",
    title: "Why Sound Design Matters in Word Games",
    excerpt:
      "How a simple 'swoosh' and multimodal feedback transformed player immersion and attention management.",
    date: "January 12, 2026",
    dateTime: "2026-01-12",
    category: "BEHIND THE SCENES",
    categoryColor: "text-gray-500",
    readTime: "4 min read",
    isNew: true,
    author: {
      name: "Prayush Dave",
      role: "Lead Developer",
    },
    tags: ["design", "audio", "ux", "immersion"],
  },
  {
    slug: "companion-mode",
    title: "Solving the 'Phone Stare': The Companion Display",
    excerpt:
      "How we built a hybrid physical-digital experience to bring people's eyes up from their screens and back to the conversation.",
    date: "January 11, 2026",
    dateTime: "2026-01-11",
    category: "BEHIND THE SCENES",
    categoryColor: "text-gray-500",
    readTime: "5 min read",
    isNew: true,
    author: {
      name: "Prayush Dave",
      role: "Lead Developer",
    },
    tags: ["design", "social", "hybrid", "mechanics"],
  },
  {
    slug: "beta-launch",
    title: "Launch Day: Beta is officially LIVE!",
    excerpt:
      "We are thrilled to announce that Connect Signull has officially entered open beta. Invite your friends, create rooms, and start connecting clues like never before.",
    date: "October 27, 2023",
    dateTime: "2023-10-27",
    category: "ANNOUNCEMENT",
    categoryColor: "text-yellow-600",
    readTime: "5 min read",
    isFeatured: false,
    author: {
      name: "James Signull",
      role: "Lead Developer and Word Enthusiast",
    },
    tags: ["launch", "beta", "announcement"],
    heroImage: {
      src: "/blog/beta-launch-hero.png",
      alt: "Connect Signull Beta Launch",
      caption: "The wait is over - Connect Signull is now in open beta!",
    },
  },
  // {
  //   slug: "setter-tips",
  //   title: 'Mastering the "Signull": Tips for Setters',
  //   excerpt:
  //     "Being a setter is an art. Learn how to give clues that are helpful but not obvious, and how to use the reference word to your advantage.",
  //   date: "October 15, 2023",
  //   dateTime: "2023-10-15",
  //   category: "STRATEGY",
  //   categoryColor: "text-blue-600",
  //   readTime: "8 min read",
  //   tags: ["strategy", "tips", "gameplay"],
  // },
  // {
  //   slug: "patch-v1-1",
  //   title: "Patch v1.1: Mobile Experience Improvements",
  //   excerpt:
  //     "We've squashed some bugs and improved the layout for smaller screens. The input field no longer zooms in on iOS devices.",
  //   date: "October 2, 2023",
  //   dateTime: "2023-10-02",
  //   category: "PATCH NOTES",
  //   categoryColor: "text-purple-600",
  //   readTime: "3 min read",
  //   tags: ["patch", "mobile", "bug-fixes"],
  // },
  // {
  //   slug: "dictionary-gang",
  //   title: 'Community Spotlight: The "Dictionary" Gang',
  //   excerpt:
  //     "We interview a group of players who have managed to guess the secret word using only 2 signulls in 5 consecutive games.",
  //   date: "September 28, 2023",
  //   dateTime: "2023-09-28",
  //   category: "COMMUNITY",
  //   categoryColor: "text-green-600",
  //   readTime: "6 min read",
  //   tags: ["community", "interview", "highlights"],
  // },
  // {
  //   slug: "design-diary-neobrutalism",
  //   title: "Design Diary: Why Neo-brutalism?",
  //   excerpt:
  //     "Ever wondered why the game looks the way it does? We dive into our design choices, accessibility, and the joy of thick borders.",
  //   date: "September 15, 2023",
  //   dateTime: "2023-09-15",
  //   category: "BEHIND THE SCENES",
  //   categoryColor: "text-gray-500",
  //   readTime: "10 min read",
  //   tags: ["design", "development", "behind-the-scenes"],
  // },
];

// Helper functions
export function getAllPosts(): BlogPost[] {
  return blogPosts.sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );
}

export function getFeaturedPost(): BlogPost | undefined {
  return blogPosts.find((post) => post.isFeatured);
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getPostsByTag(tag: string): BlogPost[] {
  return blogPosts.filter((post) => post.tags?.includes(tag));
}

export function getPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter(
    (post) => post.category.toLowerCase() === category.toLowerCase()
  );
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  blogPosts.forEach((post) => {
    post.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

export function getAllCategories(): string[] {
  const categories = new Set<string>();
  blogPosts.forEach((post) => {
    categories.add(post.category);
  });
  return Array.from(categories).sort();
}
