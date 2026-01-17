/**
 * Beta Launch Blog Post
 *
 * This is an example blog post demonstrating how to use the blog template system.
 */

import {
  BlogHeader,
  BlogSection,
  BlogParagraph,
  BlogHeading,
  BlogCallout,
  BlogQuote,
  BlogList,
  BlogDivider,
  BlogCTA,
  BlogShareButtons,
  FeatureBox,
} from "@/components/blog/BlogContent";
import { BlogPost } from "@/lib/blog/posts";
import { Globe, Trophy, Users } from "lucide-react";

interface BlogPostContentProps {
  post: BlogPost;
}

export default function BetaLaunchPost({ post }: BlogPostContentProps) {
  return (
    <>
      {/* Header with all metadata */}
      <BlogHeader
        title={post.title}
        date={post.date}
        dateTime={post.dateTime}
        category={post.category}
        readTime={post.readTime}
        author={post.author}
      />

      {/* Hero Image (placeholder - you can add actual image later) */}
      {/* 
      <BlogHeroImage
        src="/blog/beta-launch-hero.png"
        alt="Connect Signull Beta Launch"
        caption="The wait is over - Connect Signull is now in open beta!"
        priority
      />
      */}

      {/* Main Content */}
      <BlogSection>
        <BlogParagraph>
          We are thrilled to announce that Connect Signull has officially
          entered open beta. Invite your friends, create rooms, and start
          connecting clues like never before.
        </BlogParagraph>

        <BlogParagraph>
          After months of internal testing, caffeine-fueled coding sessions, and
          countless arguments about whether &quot;hotdog&quot; is a sandwich
          (it&apos;s not), we are ready to share our creation with the world.
          The Beta launch represents a huge milestone for our small team, and we
          can&apos;t wait to see how you break—I mean, play—our game.
        </BlogParagraph>

        <BlogCallout type="success">
          <p>
            <strong>The servers are live!</strong> You can start playing right
            now at{" "}
            <a href="/beta" className="underline hover:opacity-70">
              connectsignull.com/beta
            </a>
          </p>
        </BlogCallout>

        <BlogHeading level={2}>What&apos;s included in the Beta?</BlogHeading>

        <BlogParagraph>
          The core gameplay loop is fully functional. You can jump straight into
          matchmaking or create private lobbies to challenge your friends. Here
          is a breakdown of the key features available right now:
        </BlogParagraph>

        {/* Feature Boxes */}
        <FeatureBox
          title="Cross-Platform Play"
          description="Play on desktop, tablet, or mobile seamlessly. Your stats sync everywhere."
          icon={<Globe className="h-6 w-6" />}
        />

        <FeatureBox
          title="Ranked Mode"
          description="Climb the leaderboards and earn the title of 'Master Connector'."
          icon={<Trophy className="h-6 w-6" />}
        />

        <FeatureBox
          title="Custom Avatars"
          description="Choose from over 50 neo-brutalist style avatars to express yourself in the lobby."
          icon={<Users className="h-6 w-6" />}
        />

        <BlogHeading level={2}>The Road Ahead</BlogHeading>

        <BlogParagraph>
          This is just the beginning. We have a roadmap packed with features
          including team battles, daily challenges, and a community map editor.
          We want to build this game <em>with</em> you, not just for you.
        </BlogParagraph>

        <BlogQuote author="The Dev Team">
          Our goal is to make word association games cool again. Or at least, as
          cool as they can possibly be.
        </BlogQuote>

        <BlogHeading level={3}>What we&apos;re working on next:</BlogHeading>

        <BlogList
          items={[
            "Team Battles: 2v2 competitive mode with voice chat support",
            "Daily Challenges: Special word puzzles with unique rewards",
            "Community Map Editor: Create and share your own word sets",
            "Tournament System: Compete for prizes and bragging rights",
            "Enhanced Statistics: Track your progress with detailed analytics",
          ]}
        />

        <BlogDivider />

        <BlogHeading level={2}>We need your feedback!</BlogHeading>

        <BlogParagraph>
          As with any beta, there will be bugs. There will be weird edge cases.
          There might even be a situation where the game thinks
          &quot;xylophone&quot; is related to &quot;pizza&quot; (if that
          happens, please screenshot it and send it to us—we collect those).
        </BlogParagraph>

        <BlogCallout type="info">
          <p>
            Found a bug or have a suggestion? Use the feedback button in the
            game or email us at{" "}
            <a
              href="mailto:feedback@connectsignull.com"
              className="underline hover:opacity-70"
            >
              feedback@connectsignull.com
            </a>
          </p>
        </BlogCallout>

        <BlogParagraph>
          So what are you waiting for? The servers are live, the words are
          waiting, and your friends are probably already playing without you.
        </BlogParagraph>

        {/* Call to Action */}
        <BlogCTA
          title="Ready to Connect?"
          description="Jump into the beta and start playing with your friends right now!"
          buttonText="Play Beta"
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
