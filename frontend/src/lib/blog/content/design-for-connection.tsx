import {
  BlogHeader,
  BlogSection,
  BlogParagraph,
  BlogHeading,
  BlogCallout,
  BlogList,
  BlogCTA,
  BlogShareButtons,
} from "@/components/blog/BlogContent";
import { BlogPost } from "@/lib/blog/posts";

interface BlogPostContentProps {
  post: BlogPost;
}

export default function DesignOfConnection({ post }: BlogPostContentProps) {
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
          Building ConnectSignull wasn&apos;t just about coding a game; it was
          about solving Human-Computer Interaction (HCI) challenges. We had to
          answer tough questions: How do we keep players focused? Why do we need
          points in a social game? And why does it look so... brutalist?
        </BlogParagraph>

        <BlogHeading level={2}>The "Focus" Problem</BlogHeading>

        <BlogParagraph>
          I realized early on that my game had a "focus" problem. In the first
          prototype, players had to jump between text boxes, game logs, and
          status displays to keep up with the action. It was fragmented and
          overwhelming. Players were losing the "flow" of the social experience.
        </BlogParagraph>

        <BlogParagraph>
          To fix this, I redesigned the entire game using a{" "}
          <strong>card-based interface architecture</strong>, inspired by
          physical flashcards.
        </BlogParagraph>

        <BlogList
          items={[
            "Reduced Cognitive Load: Each hint, or 'signull', became a discrete unit containing the player's identity, their progress, and the clue itself.",
            "Visual Boundaries: Cards create clear physical borders that allow players to scan multiple game events quickly.",
            "Natural Timeline: Stacking cards vertically creates a natural timeline of the conversation without needing confusing timestamps.",
          ]}
        />

        <BlogHeading level={2}>The Psychology of Scoring</BlogHeading>

        <BlogParagraph>
          Why does every sport, social media platform, and game have a score?
          Because we are hardwired to look for signals of progress.
        </BlogParagraph>

        <BlogParagraph>
          I almost didn't include a scoring system. My original vision was
          purely social, and I worried points might add stress. But I realized
          that without a system to guide them, players could get lost.
        </BlogParagraph>

        <BlogCallout type="info">
          <p>
            <strong>The Result:</strong> In our A/B tests, 83% of
            scoring-enabled groups played two or more games, compared to just
            33% in the control group. Scoring didn't kill the vibe; it gave it
            purpose.
          </p>
        </BlogCallout>

        <BlogHeading level={2}>Why Neobrutalism?</BlogHeading>

        <BlogParagraph>
          You might notice the stark contrasts, bold typography, and geometric
          simplicity. This is <strong>Neobrutalism</strong>.
        </BlogParagraph>

        <BlogParagraph>
          We chose this style for accessibility and clarity. The high contrast
          ensures visibility in varied lighting conditions, while the distinct
          lack of glossy, gradient-heavy elements communicates an "honest" game
          that prioritizes substance over superficial appeal. It feels like a
          tangible, physical game board.
        </BlogParagraph>

        <BlogCTA
          description=""
          title="Experience the Design"
          buttonText="Play Now"
          buttonLink="/"
        />

        <BlogShareButtons title={post.title} url={`/blog/${post.slug}`} />
      </BlogSection>
    </>
  );
}
