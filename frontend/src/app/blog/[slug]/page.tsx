import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts } from "@/lib/blog/posts";
import { BlogLayout, BackToBlog } from "@/components/blog/BlogContent";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: `${post.title} | Connect Signull Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Import the blog post content component dynamically
  // Each blog post will have its own content file
  let BlogPostContent;
  try {
    const module = await import(`@/lib/blog/content/${slug}.tsx`);
    BlogPostContent = module.default;
  } catch (error) {
    // If content file doesn't exist, show a placeholder
    BlogPostContent = () => (
      <div className="prose prose-lg">
        <p>Content for this post is coming soon.</p>
      </div>
    );
  }

  return (
    <BlogLayout>
      <BackToBlog />
      <BlogPostContent post={post} />
    </BlogLayout>
  );
}

// This tells Next.js to generate these pages at build time
export const dynamicParams = false;
