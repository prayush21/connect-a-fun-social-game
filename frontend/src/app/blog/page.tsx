import Link from "next/link";
import { Calendar, ChevronRight, Rocket, ArrowRight } from "lucide-react";

// Blog post data - this could come from a CMS or API in the future
const featuredPost = {
  slug: "beta-launch",
  title: "Launch Day: Beta is officially LIVE!",
  excerpt:
    "We are thrilled to announce that Connect Signull has officially entered open beta. Invite your friends, create rooms, and start connecting clues like never before. Here's everything you need to know about getting started.",
  date: "October 27, 2023",
  dateTime: "2023-10-27",
  version: "v1.2.0 Update",
  isNew: true,
};

const blogPosts = [
  {
    slug: "setter-tips",
    title: 'Mastering the "Signull": Tips for Setters',
    excerpt:
      "Being a setter is an art. Learn how to give clues that are helpful but not obvious, and how to use the reference word to your advantage.",
    date: "Oct 15, 2023",
    dateTime: "2023-10-15",
    category: "Strategy",
    categoryColor: "text-blue-600",
  },
  {
    slug: "patch-v1-1",
    title: "Patch v1.1: Mobile Experience Improvements",
    excerpt:
      "We've squashed some bugs and improved the layout for smaller screens. The input field no longer zooms in on iOS devices.",
    date: "Oct 02, 2023",
    dateTime: "2023-10-02",
    category: "Patch Notes",
    categoryColor: "text-purple-600",
  },
  {
    slug: "dictionary-gang",
    title: 'Community Spotlight: The "Dictionary" Gang',
    excerpt:
      "We interview a group of players who have managed to guess the secret word using only 2 signulls in 5 consecutive games.",
    date: "Sep 28, 2023",
    dateTime: "2023-09-28",
    category: "Community",
    categoryColor: "text-green-600",
  },
  {
    slug: "design-diary-neobrutalism",
    title: "Design Diary: Why Neo-brutalism?",
    excerpt:
      "Ever wondered why the game looks the way it does? We dive into our design choices, accessibility, and the joy of thick borders.",
    date: "Sep 15, 2023",
    dateTime: "2023-09-15",
    category: "Behind the Scenes",
    categoryColor: "text-gray-500",
  },
];

function FeaturedPostCard({ post }: { post: typeof featuredPost }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-white shadow-neobrutalist transition-all duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalist-hover">
      {/* NEW Badge */}
      {post.isNew && (
        <div className="absolute right-4 top-4 z-10">
          <span className="inline-flex items-center rounded-full border border-black bg-yellow-400 px-3 py-1 text-xs font-bold text-black shadow-sm">
            NEW
          </span>
        </div>
      )}

      {/* Featured Image Area */}
      <div className="relative flex h-64 w-full items-center justify-center overflow-hidden border-b-2 border-black bg-gray-100 sm:h-80">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-50" />
        <Rocket className="h-24 w-24 text-gray-300 transition-transform duration-500 group-hover:scale-110" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        {/* Meta */}
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500">
          <Calendar className="h-4 w-4" />
          <time dateTime={post.dateTime}>{post.date}</time>
          <span className="mx-1">•</span>
          <span>{post.version}</span>
        </div>

        {/* Title */}
        <h2 className="mb-3 text-2xl font-bold text-primary transition-colors group-hover:text-blue-600 sm:text-3xl">
          {post.title}
        </h2>

        {/* Excerpt */}
        <p className="mb-6 flex-grow text-base text-gray-500">{post.excerpt}</p>

        {/* CTA */}
        <div className="mt-auto">
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center justify-center rounded-lg border-2 border-black bg-primary px-6 py-3 text-base font-bold text-white shadow-neobrutalist-sm transition-all duration-200 hover:bg-white hover:text-primary active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Read Announcement
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function BlogPostCard({ post }: { post: (typeof blogPosts)[0] }) {
  return (
    <article className="group flex flex-col rounded-2xl border-2 border-black bg-white shadow-neobrutalist transition-all duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalist-hover">
      <div className="flex h-full flex-col p-6">
        {/* Category */}
        <div
          className={`mb-3 text-xs font-bold uppercase tracking-wide ${post.categoryColor}`}
        >
          {post.category}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-xl font-bold text-primary decoration-2 underline-offset-2 group-hover:underline">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="mb-4 flex-grow text-sm text-gray-500">{post.excerpt}</p>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-gray-200 pt-4">
          <time className="text-xs text-gray-500" dateTime={post.dateTime}>
            {post.date}
          </time>
          <Link
            href={`/blog/${post.slug}`}
            className="flex items-center text-sm font-bold text-primary transition-opacity hover:opacity-70"
          >
            Read
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        {/* Badge */}
        <div className="mb-4 inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-4 py-1 shadow-neobrutalist-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Developer Updates
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-bold text-primary sm:text-5xl">
          Latest from the Lab
        </h1>

        {/* Subtitle */}
        <p className="mx-auto max-w-xl text-lg text-gray-500">
          News, patch notes, and strategies for becoming the ultimate Connect
          Signull master.
        </p>
      </div>

      {/* Featured Post */}
      <div className="mb-12">
        <FeaturedPostCard post={featuredPost} />
      </div>

      {/* Blog Post Grid */}
      <div className="grid gap-8 md:grid-cols-2">
        {blogPosts.map((post) => (
          <BlogPostCard key={post.slug} post={post} />
        ))}
      </div>

      {/* Load More Button */}
      <div className="mt-16 flex justify-center">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border-2 border-black bg-white px-8 py-3 text-sm font-bold text-primary shadow-neobrutalist-sm transition-all hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Load More Articles
        </button>
      </div>
    </div>
  );
}
