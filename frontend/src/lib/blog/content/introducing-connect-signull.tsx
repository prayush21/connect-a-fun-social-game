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
          Imagine this: a group of friends mutuals gather around, either in
          person or virtually, just meeting casually. One person thinks of a
          word, say "Pineapple". And they declare its P9, indicating it's a
          9-letter word starting with 'P'. The rest of the group, the
          "guessers", then take turns suggesting clues to words that start with
          P. Say someone mentions "what do Jupiter, Saturn, and Mars have in
          common?" The setter, while puzzled, the rest of the group shouts
          together, "Planet!". The setter feeling absolutely betrayed by
          himself, begrudging gives the next letter in the P9 acronym he gave:
          "PI" The guessers continue this process, now with thinking and trying
          to get other friends connect over words starting with "PI", and trying
          to piece together the original word based on the clues given, untill
          they have directly figured it out!
        </BlogParagraph>

        <BlogParagraph>
          That's ConnectSignull in a nutshell - a game of cooperative deception
          and social connection through shared references.
        </BlogParagraph>
        <BlogDivider />

        <BlogHeading level={2}>Join the Experience</BlogHeading>

        <BlogParagraph>
          We didn&apos;t just want to make another word game. We wanted to build
          a place for social interaction. Whether you are in the same room or
          connecting remotely, ConnectSignull is designed to bring you closer
          together through shared moments of discovery and fun.
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
