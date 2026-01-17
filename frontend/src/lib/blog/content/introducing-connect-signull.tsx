import {
  BlogHeader,
  BlogSection,
  BlogParagraph,
  BlogHeading,
  BlogQuote,
  BlogCTA,
  BlogDivider,
  BlogShareButtons,
} from "@/components/blog/BlogContent";
import { BlogPost } from "@/lib/blog/posts";

interface BlogPostContentProps {
  post: BlogPost;
}

export default function IntroducingConnectSignull({
  post,
}: BlogPostContentProps) {
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
        <BlogQuote author="Albert Einstein, Physicist">
          Play is the highest form of research.
        </BlogQuote>
        <BlogParagraph>
          I started with a feeling. It was that specific energy you get when you
          are having a genuine, great time with friends.{" "}
          <strong>ConnectSignull</strong> is the manifestation of that feeling
          into a design, a piece of code, and a prototype.
        </BlogParagraph>

        <BlogHeading level={2}>What is ConnectSignull?</BlogHeading>

        <BlogParagraph>
          ConnectSignull is a collaborative word game explicitly designed to
          create shared experiences. It's built on three core pillars:
        </BlogParagraph>

        <BlogParagraph>
          <strong>1. Asymmetric Teamwork:</strong> A cooperative team works
          together against a single word-setter. It's not just about getting the
          answer; it's about outsmarting the setter together.
        </BlogParagraph>

        <BlogParagraph>
          <strong>2. Cultural References:</strong> You do not win through
          dictionary knowledge; you win by using shared memories and references
          to decode words. It's about that moment of "I know that you know that
          I know."
        </BlogParagraph>

        <BlogParagraph>
          <strong>3. Active Participation:</strong> Unlike passive scrolling,
          this requires coordination and shared emotional experiences in a
          common game state.
        </BlogParagraph>

        <BlogDivider />

        <BlogHeading level={2}>Join the Experience</BlogHeading>

        <BlogParagraph>
          We didn&apos;t just want to make another word game. We wanted to build
          a platform for social interaction. Whether you are in the same room or
          connecting remotely, ConnectSignull is designed to bring you closer
          together.
        </BlogParagraph>

        <BlogCTA
          description=""
          title="Ready to Connect?"
          buttonText="Play Now"
          buttonLink="/"
        />

        <BlogShareButtons title={post.title} url={`/blog/${post.slug}`} />
      </BlogSection>
    </>
  );
}
