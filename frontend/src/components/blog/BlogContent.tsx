"use client";

/**
 * BlogContent.tsx
 *
 * Reusable blog content components for consistent styling and easy content creation.
 * These components follow the neobrutalist design system and provide a uniform
 * structure for all blog posts.
 */

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useMemo, useState, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// ====================
// Layout Components
// ====================

interface BlogLayoutProps {
  children: ReactNode;
}

export function BlogLayout({ children }: BlogLayoutProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {children}
    </article>
  );
}

// ====================
// Header Components
// ====================

interface BlogHeaderProps {
  title: string;
  date: string;
  dateTime: string;
  category?: string;
  readTime?: string;
  author?: {
    name: string;
    role: string;
    avatar?: string;
  };
}

export function BlogHeader({
  title,
  date,
  dateTime,
  category,
  readTime,
  author,
}: BlogHeaderProps) {
  return (
    <header className="mb-12">
      {/* Category Badge */}
      {category && (
        <div className="mb-4 inline-flex items-center justify-center rounded-full border-2 border-black bg-yellow-400 px-4 py-1 shadow-neobrutalist-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-black">
            {category}
          </span>
        </div>
      )}

      {/* Title */}
      <h1 className="mb-6 text-4xl font-bold leading-tight text-primary sm:text-5xl">
        {title}
      </h1>

      {/* Meta Information */}
      <div className="flex flex-wrap items-center gap-4 border-b-2 border-gray-200 pb-8 text-sm text-gray-500">
        {/* {author && (
          <div className="flex items-center gap-3">
            {author.avatar && (
              <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-black">
                <Image
                  src={author.avatar}
                  alt={author.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <div className="font-bold text-black">{author.name}</div>
              <div className="text-xs">{author.role}</div>
            </div>
          </div>
        )} */}
        <time dateTime={dateTime} className="font-medium">
          {date}
        </time>
        {/* {readTime && (
          <>
            <span>•</span>
            <span>{readTime}</span>
          </>
        )} */}
      </div>
    </header>
  );
}

// ====================
// Hero Image Component
// ====================

interface BlogHeroImageProps {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
}

export function BlogHeroImage({
  src,
  alt,
  caption,
  priority = false,
}: BlogHeroImageProps) {
  return (
    <figure className="mb-12">
      <div className="relative aspect-video overflow-hidden rounded-2xl border-2 border-black bg-gray-100 shadow-neobrutalist">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm italic text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ====================
// Content Components
// ====================

interface BlogSectionProps {
  children: ReactNode;
  className?: string;
}

export function BlogSection({ children, className = "" }: BlogSectionProps) {
  return (
    <section className={`prose prose-lg mb-8 max-w-none ${className}`}>
      {children}
    </section>
  );
}

interface BlogParagraphProps {
  children: ReactNode;
}

export function BlogParagraph({ children }: BlogParagraphProps) {
  return <p className="mb-6 leading-relaxed text-gray-700">{children}</p>;
}

interface BlogHeadingProps {
  children: ReactNode;
  level?: 2 | 3 | 4;
}

export function BlogHeading({ children, level = 2 }: BlogHeadingProps) {
  const baseClasses = "font-bold text-primary mb-4";
  const sizeClasses = {
    2: "text-3xl sm:text-4xl mt-12",
    3: "text-2xl sm:text-3xl mt-10",
    4: "text-xl sm:text-2xl mt-8",
  };

  const classes = `${baseClasses} ${sizeClasses[level]}`;

  switch (level) {
    case 2:
      return <h2 className={classes}>{children}</h2>;
    case 3:
      return <h3 className={classes}>{children}</h3>;
    case 4:
      return <h4 className={classes}>{children}</h4>;
    default:
      return <h2 className={classes}>{children}</h2>;
  }
}

// ====================
// Feature Box Component
// ====================

interface FeatureBoxProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function FeatureBox({ title, description, icon }: FeatureBoxProps) {
  return (
    <div className="mb-6 flex gap-4 rounded-xl border-2 border-black bg-white p-6 shadow-neobrutalist-sm">
      {icon && <div className="flex-shrink-0 text-green-600">{icon}</div>}
      <div>
        <h3 className="mb-2 font-bold text-primary">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

// ====================
// Inline Image Component
// ====================

interface BlogInlineImageProps {
  src: string;
  alt: string;
  caption?: string;
  fullWidth?: boolean;
}

export function BlogInlineImage({
  src,
  alt,
  caption,
  fullWidth = false,
}: BlogInlineImageProps) {
  const containerClasses = fullWidth ? "w-full" : "w-full sm:w-3/4 mx-auto";

  return (
    <figure className={`my-8 ${containerClasses}`}>
      <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-black bg-gray-100 shadow-neobrutalist-sm">
        <Image src={src} alt={alt} fill className="object-cover" />
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm italic text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ====================
// GIF Component
// ====================

interface BlogGifProps {
  src: string;
  alt: string;
  caption?: string;
}

export function BlogGif({ src, alt, caption }: BlogGifProps) {
  return (
    <figure className="my-8">
      <div className="relative mx-auto w-full overflow-hidden rounded-xl border-2 border-black bg-gray-100 shadow-neobrutalist-sm sm:w-3/4">
        <img src={src} alt={alt} className="h-auto w-full" loading="lazy" />
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm italic text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ====================
// Callout Box Component
// ====================

interface BlogCalloutProps {
  children: ReactNode;
  type?: "info" | "warning" | "success" | "tip";
}

export function BlogCallout({ children, type = "info" }: BlogCalloutProps) {
  const colors = {
    info: "bg-blue-50 border-blue-600 text-blue-900",
    warning: "bg-yellow-50 border-yellow-600 text-yellow-900",
    success: "bg-green-50 border-green-600 text-green-900",
    tip: "bg-purple-50 border-purple-600 text-purple-900",
  };

  const icons = {
    info: "ℹ️",
    warning: "⚠️",
    success: "✅",
    tip: "💡",
  };

  return (
    <div className={`my-8 rounded-xl border-l-4 ${colors[type]} p-6 shadow-sm`}>
      <div className="flex gap-3">
        <span className="text-xl">{icons[type]}</span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

// ====================
// Quote Component
// ====================

interface BlogQuoteProps {
  children: ReactNode;
  author?: string;
}

export function BlogQuote({ children, author }: BlogQuoteProps) {
  return (
    <blockquote className="my-8 border-l-4 border-primary bg-gray-50 p-6 italic">
      <div className="text-lg text-gray-700">{children}</div>
      {author && (
        <footer className="mt-3 text-sm font-bold text-primary">
          — {author}
        </footer>
      )}
    </blockquote>
  );
}

// ====================
// Code Block Component
// ====================

interface BlogCodeBlockProps {
  children: ReactNode;
  language?: string;
}

export function BlogCodeBlock({ children, language }: BlogCodeBlockProps) {
  return (
    <div className="my-8 overflow-hidden rounded-xl border-2 border-black bg-gray-900 shadow-neobrutalist-sm">
      {language && (
        <div className="border-b-2 border-black bg-gray-800 px-4 py-2">
          <span className="text-xs font-bold uppercase text-gray-400">
            {language}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto p-6">
        <code className="text-sm text-gray-100">{children}</code>
      </pre>
    </div>
  );
}

// ====================
// List Components
// ====================

interface BlogListProps {
  items: string[];
  ordered?: boolean;
}

export function BlogList({ items, ordered = false }: BlogListProps) {
  const ListTag = ordered ? "ol" : "ul";
  const listClasses = ordered
    ? "list-decimal list-inside space-y-2 mb-6"
    : "list-disc list-inside space-y-2 mb-6";

  return (
    <ListTag className={listClasses}>
      {items.map((item, index) => (
        <li key={index} className="text-gray-700">
          {item}
        </li>
      ))}
    </ListTag>
  );
}

// ====================
// Divider Component
// ====================

export function BlogDivider() {
  return <hr className="my-12 border-t-2 border-gray-200" />;
}

// ====================
// CTA Component
// ====================

interface BlogCTAProps {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  external?: boolean;
}

export function BlogCTA({
  title,
  description,
  buttonText,
  buttonLink,
  external = false,
}: BlogCTAProps) {
  const ButtonComponent = external ? "a" : Link;
  const linkProps = external
    ? { href: buttonLink, target: "_blank", rel: "noopener noreferrer" }
    : { href: buttonLink };

  return (
    <div className="my-12 rounded-2xl border-2 border-black bg-gradient-to-br from-blue-50 to-purple-50 p-8 text-center shadow-neobrutalist">
      <h3 className="mb-3 text-2xl font-bold text-primary">{title}</h3>
      <p className="mb-6 text-gray-600">{description}</p>
      <ButtonComponent
        {...linkProps}
        className="inline-flex items-center justify-center rounded-lg border-2 border-black bg-primary px-8 py-3 text-base font-bold text-white shadow-neobrutalist-sm transition-all duration-200 hover:bg-white hover:text-primary active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        {buttonText}
      </ButtonComponent>
    </div>
  );
}

// ====================
// Tags Component
// ====================

interface BlogTagsProps {
  tags?: string[];
}

export function BlogTags({ tags }: BlogTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-block rounded-full border-2 border-black bg-gray-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-900 shadow-neobrutalist-sm"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

// ====================
// Back to Blog Link
// ====================

export function BackToBlog() {
  return (
    <div className="mb-8">
      <Link
        href="/blog"
        className="inline-flex items-center text-sm font-bold text-primary transition-opacity hover:opacity-70"
      >
        ← Back to Blog
      </Link>
    </div>
  );
}

// ====================
// Share Buttons Component
// ====================

interface BlogShareButtonsProps {
  title: string;
  url: string;
}

// Internal component that uses useSearchParams
function BlogShareButtonsInner({ title, url }: BlogShareButtonsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  useEffect(() => {
    if (copyStatus !== "idle") {
      const timer = setTimeout(() => setCopyStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  const shareUrl = useMemo(() => {
    const path = pathname ?? "";
    const search = searchParams?.toString();
    const pathWithSearch = `${path}${search ? `?${search}` : ""}`;
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "";

    if (origin && path) {
      return `${origin}${pathWithSearch}`;
    }

    return url;
  }, [pathname, searchParams, url]);

  const shareLinks = useMemo(
    () => ({
      x: `https://x.com/intent/tweet?text=${encodeURIComponent(
        title
      )}&url=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        shareUrl
      )}`,
    }),
    [shareUrl, title]
  );

  const fallbackCopyText = (text: string): boolean => {
    if (typeof document === "undefined") {
      return false;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  };

  const handleCopyLink = async () => {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.clipboard !== "undefined" &&
      navigator.clipboard.writeText
    ) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopyStatus("success");
      } catch (error) {
        console.error("Failed to copy share link", error);
        setCopyStatus("error");
      }
    } else {
      const success = fallbackCopyText(shareUrl);
      setCopyStatus(success ? "success" : "error");
    }
  };

  return (
    <div className="my-12 border-t-2 border-gray-200 pt-8">
      <h3 className="mb-4 text-center text-lg font-bold text-gray-700">
        Share this update
      </h3>
      <div className="flex justify-center gap-4">
        <a
          href={shareLinks.x}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border-2 border-black bg-black px-6 py-2 text-sm font-bold text-white shadow-neobrutalist-sm transition-all hover:bg-gray-800 hover:text-[#1DA1F2] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <Image // X (Twitter) Logo
            src="/icons/x-logo.svg"
            alt="X Logo"
            width={16}
            height={16}
            className="mr-2"
          />
        </a>
        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border-2 border-black bg-[#0077B5] px-6 py-2 text-sm font-bold text-white shadow-neobrutalist-sm transition-all hover:bg-white hover:text-[#0077B5] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          LinkedIn
        </a>
        <button
          onClick={handleCopyLink}
          disabled={copyStatus !== "idle"}
          className={`inline-flex items-center justify-center rounded-lg border-2 border-black px-6 py-2 text-sm font-bold shadow-neobrutalist-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
            copyStatus === "idle"
              ? "bg-white text-primary hover:bg-gray-50"
              : copyStatus === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
          }`}
        >
          {copyStatus === "idle"
            ? "Copy Link"
            : copyStatus === "success"
              ? "Copied!"
              : "Failed"}
        </button>
      </div>
    </div>
  );
}

// Exported component with Suspense boundary
export function BlogShareButtons({ title, url }: BlogShareButtonsProps) {
  return (
    <Suspense
      fallback={
        <div className="my-12 border-t-2 border-gray-200 pt-8">
          <h3 className="mb-4 text-center text-lg font-bold text-gray-700">
            Share this update
          </h3>
          <div className="flex justify-center gap-4">
            <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      }
    >
      <BlogShareButtonsInner title={title} url={url} />
    </Suspense>
  );
}
