# Blog Content Template Guide

This directory contains the content for each blog post. Each blog post is a separate TypeScript/TSX file that exports a React component.

## Creating a New Blog Post

### Step 1: Add Post Metadata
First, add your blog post metadata to `/src/lib/blog/posts.ts`:

```typescript
{
  slug: "your-post-slug", // URL-friendly identifier
  title: "Your Post Title",
  excerpt: "A brief description for the blog listing page",
  date: "January 15, 2026",
  dateTime: "2026-01-15",
  category: "CATEGORY NAME",
  categoryColor: "text-blue-600", // Tailwind color class
  readTime: "5 min read",
  isNew: true, // Optional: shows "NEW" badge
  isFeatured: false, // Optional: shows on top of blog page
  author: {
    name: "Author Name",
    role: "Author Role",
    avatar: "/path/to/avatar.jpg", // Optional
  },
  tags: ["tag1", "tag2", "tag3"], // Optional
  heroImage: { // Optional
    src: "/blog/your-image.png",
    alt: "Image description",
    caption: "Optional image caption",
  },
}
```

### Step 2: Create Content File
Create a new file in this directory named `your-post-slug.tsx` (matching the slug from Step 1).

### Step 3: Use the Template
Use this basic structure:

```typescript
import {
  BlogHeader,
  BlogHeroImage,
  BlogSection,
  BlogParagraph,
  BlogHeading,
  BlogInlineImage,
  BlogGif,
  BlogCallout,
  BlogQuote,
  BlogList,
  BlogDivider,
  BlogCTA,
  BlogShareButtons,
  FeatureBox,
} from "@/components/blog/BlogContent";
import { BlogPost } from "@/lib/blog/posts";
import { CheckCircle } from "lucide-react";

interface BlogPostContentProps {
  post: BlogPost;
}

export default function YourPostSlug({ post }: BlogPostContentProps) {
  return (
    <>
      {/* Header with metadata */}
      <BlogHeader
        title={post.title}
        date={post.date}
        dateTime={post.dateTime}
        category={post.category}
        readTime={post.readTime}
        author={post.author}
      />

      {/* Optional: Hero Image */}
      {post.heroImage && (
        <BlogHeroImage
          src={post.heroImage.src}
          alt={post.heroImage.alt}
          caption={post.heroImage.caption}
          priority
        />
      )}

      {/* Main Content */}
      <BlogSection>
        <BlogParagraph>
          Your introduction paragraph goes here...
        </BlogParagraph>

        <BlogHeading level={2}>Section Heading</BlogHeading>
        
        <BlogParagraph>
          More content...
        </BlogParagraph>

        {/* Inline Image */}
        <BlogInlineImage
          src="/blog/image.png"
          alt="Description"
          caption="Optional caption"
        />

        {/* GIF */}
        <BlogGif
          src="/blog/animation.gif"
          alt="Description"
          caption="Optional caption"
        />

        {/* Callout Box */}
        <BlogCallout type="tip">
          <p>Important tip or information!</p>
        </BlogCallout>

        {/* Feature Boxes */}
        <FeatureBox
          title="Feature Name"
          description="Feature description"
          icon={<CheckCircle className="h-6 w-6" />}
        />

        {/* Quote */}
        <BlogQuote author="Person Name">
          This is a quote from someone.
        </BlogQuote>

        {/* Lists */}
        <BlogList items={[
          "Item one",
          "Item two",
          "Item three"
        ]} />

        {/* Divider */}
        <BlogDivider />

        {/* Call to Action */}
        <BlogCTA
          title="Try it now!"
          description="Jump into the game and experience it yourself."
          buttonText="Play Now"
          buttonLink="/beta"
        />

        {/* Share Buttons */}
        <BlogShareButtons
          title={post.title}
          url={`https://connectsignull.com/blog/${post.slug}`}
        />
      </BlogSection>
    </>
  );
}
```

## Available Components

### Layout Components
- `<BlogLayout>` - Main container (automatically applied)
- `<BlogSection>` - Content section wrapper

### Header Components
- `<BlogHeader>` - Title, date, author, category badge
- `<BackToBlog>` - Link back to blog listing

### Content Components
- `<BlogParagraph>` - Formatted paragraph
- `<BlogHeading level={2|3|4}>` - Section headings
- `<BlogList items={[...]} ordered={true|false}>` - Bulleted or numbered lists

### Media Components
- `<BlogHeroImage>` - Large hero image at top of post
- `<BlogInlineImage>` - Images within content
- `<BlogGif>` - Animated GIFs

### Special Components
- `<FeatureBox>` - Highlighted feature with icon
- `<BlogCallout type="info|warning|success|tip">` - Colored callout boxes
- `<BlogQuote author="...">` - Blockquote with attribution
- `<BlogCodeBlock language="...">` - Code snippets
- `<BlogDivider>` - Horizontal divider
- `<BlogCTA>` - Call-to-action box with button
- `<BlogShareButtons>` - Social media share buttons

## Component Props Reference

### BlogHeader
- `title`: string (required)
- `date`: string (required) - Human-readable date
- `dateTime`: string (required) - ISO date format
- `category`: string - Category badge
- `readTime`: string - e.g., "5 min read"
- `author`: object with name, role, avatar

### BlogHeroImage / BlogInlineImage
- `src`: string (required) - Image path
- `alt`: string (required) - Alt text
- `caption`: string - Image caption
- `priority`: boolean - Load eagerly (use for hero images)
- `fullWidth`: boolean - Full width (BlogInlineImage only)

### BlogCallout
- `type`: "info" | "warning" | "success" | "tip"
- `children`: ReactNode

### BlogQuote
- `children`: ReactNode (quote text)
- `author`: string - Attribution

### FeatureBox
- `title`: string
- `description`: string
- `icon`: ReactNode - Lucide icon recommended

### BlogCTA
- `title`: string
- `description`: string
- `buttonText`: string
- `buttonLink`: string
- `external`: boolean - Opens in new tab

## Tips

1. **Images**: Place images in `/public/blog/` directory
2. **GIFs**: Use optimized, compressed GIFs for better performance
3. **Icons**: Import from `lucide-react` for consistency
4. **Links**: Use Next.js `<Link>` component for internal links
5. **Consistency**: Follow the neobrutalist design system (bold borders, shadows)
6. **Accessibility**: Always provide alt text for images
7. **Performance**: Use `priority` prop for hero images, lazy load others

## Example Categories
- ANNOUNCEMENT
- PATCH NOTES
- STRATEGY
- COMMUNITY
- BEHIND THE SCENES
- TUTORIAL

## Example Tags
- launch, beta, announcement
- patch, bug-fixes, mobile
- strategy, tips, gameplay
- community, interview, highlights
- design, development, behind-the-scenes
- tutorial, guide, how-to
