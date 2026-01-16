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
        <BlogParagraph>
          Instagram should stop changing the buttons in its layout every few
          years. That is what I thought too, until I realized why they are doing
          it.
        </BlogParagraph>

        <BlogParagraph>
          It is not just a random design tweak. It is a signal of a massive
          industry shift. For the last decade, most digital platforms
          prioritized passive consumption. Now, we are seeing a major pivot
          toward "multiplayer" experiences designed to create deeper human
          connections. You see the clues everywhere, from Spotify adding a Party
          feature to Instagram bringing DMs into your primary "thumb zone."
        </BlogParagraph>

        <BlogParagraph>
          I started with a feeling. It was that specific energy you get when you
          are having a genuine, great time with friends.{" "}
          <strong>ConnectSignull</strong> is the manifestation of that feeling
          into a design, a piece of code, and a prototype.
        </BlogParagraph>

        <BlogQuote author="Prayush Dave, Creator">
          "My goal was to move beyond 'attention-maximizing' engagement and see
          how digital tools can actually enhance the quality of our
          relationships."
        </BlogQuote>

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

        <BlogShareButtons
          title={post.title}
          url={`https://connect-signull.vercel.app/blog/${post.slug}`}
        />
      </BlogSection>
    </>
  );
}
