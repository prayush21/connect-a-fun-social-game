# Blog System Quick Reference

## 📝 Adding a New Blog Post (3 Steps)

### Step 1: Add Metadata

Add your post to [/src/lib/blog/posts.ts](../lib/blog/posts.ts):

```typescript
{
  slug: "my-new-post",
  title: "My Amazing Post Title",
  excerpt: "A brief summary that appears in the blog listing",
  date: "January 14, 2026",
  dateTime: "2026-01-14",
  category: "ANNOUNCEMENT",
  categoryColor: "text-blue-600",
  readTime: "5 min read",
  isNew: true, // Shows "NEW" badge
  isFeatured: false, // True to show at top of blog page
  author: {
    name: "Your Name",
    role: "Your Role",
  },
  tags: ["tag1", "tag2"],
}
```

### Step 2: Create Content File

Create `/src/lib/blog/content/my-new-post.tsx` (slug must match!):

```tsx
import {
  BlogHeader,
  BlogSection,
  BlogParagraph,
  BlogHeading,
  // Import other components as needed
} from "@/components/blog/BlogContent";
import { BlogPost } from "@/lib/blog/posts";

interface BlogPostContentProps {
  post: BlogPost;
}

export default function MyNewPost({ post }: BlogPostContentProps) {
  return (
    <>
      <BlogHeader
        title={post.title}
        date={post.date}
        dateTime={post.dateTime}
        category={post.category}
        readTime={post.readTime}
        author={post.author}
      />

      <BlogSection>
        <BlogParagraph>Your content goes here...</BlogParagraph>

        <BlogHeading level={2}>Section Title</BlogHeading>

        <BlogParagraph>More content...</BlogParagraph>
      </BlogSection>
    </>
  );
}
```

### Step 3: Done! ✨

Your post is now live at `/blog/my-new-post`

---

## 🎨 Available Components

### Text & Structure

- `<BlogParagraph>` - Regular paragraph
- `<BlogHeading level={2|3|4}>` - Section headings
- `<BlogList items={[...]} ordered={true|false}>` - Lists
- `<BlogDivider>` - Horizontal line

### Media

- `<BlogHeroImage src="..." alt="..." caption="..." />` - Top hero image
- `<BlogInlineImage src="..." alt="..." caption="..." />` - In-content images
- `<BlogGif src="..." alt="..." caption="..." />` - Animated GIFs

### Special Elements

- `<BlogCallout type="info|warning|success|tip">` - Colored boxes
- `<BlogQuote author="...">` - Quote blocks
- `<FeatureBox title="..." description="..." icon={...} />` - Feature highlights
- `<BlogCTA>` - Call-to-action section
- `<BlogShareButtons>` - Social share buttons

---

## 🏷️ Category Colors

- `text-yellow-600` - Announcements
- `text-blue-600` - Strategy/Tips
- `text-purple-600` - Patch Notes
- `text-green-600` - Community
- `text-gray-500` - Behind the Scenes
- `text-red-600` - Important/Critical
- `text-orange-600` - Events

---

## 💡 Tips

1. **Images**: Place in `/public/blog/` folder
2. **Keep it consistent**: Use the same structure across posts
3. **Test locally**: Visit `/blog/your-slug` to preview
4. **Compress GIFs**: Keep file sizes small for performance
5. **Alt text**: Always include for accessibility
6. **Links**: Use Next.js `<Link>` for internal navigation

---

## 📂 File Structure

```
src/
  ├── app/blog/
  │   ├── page.tsx              # Blog listing page
  │   └── [slug]/
  │       └── page.tsx           # Dynamic blog post page
  ├── components/blog/
  │   └── BlogContent.tsx        # All blog components
  └── lib/blog/
      ├── posts.ts               # Blog metadata
      └── content/
          ├── beta-launch.tsx    # Example post
          └── your-post.tsx      # Your posts here
```

---

## 🔗 See Full Documentation

Check [/src/lib/blog/content/README.md](../lib/blog/content/README.md) for detailed component documentation and examples.
