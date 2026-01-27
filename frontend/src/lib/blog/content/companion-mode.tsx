import {
  BlogHeader,
  BlogSection,
  BlogParagraph,
  BlogHeading,
  BlogCallout,
  BlogList,
  BlogCTA,
  BlogShareButtons,
  BlogTags,
} from "@/components/blog/BlogContent";
import { BlogPost } from "@/lib/blog/posts";

interface BlogPostContentProps {
  post: BlogPost;
}

export default function CompanionMode({ post }: BlogPostContentProps) {
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

      <BlogTags tags={post.tags} />

      <BlogSection>
        <BlogParagraph>
          You've built a great collaborative word game. The mechanics work. The
          scoring system drives engagement. Players are having fun. But then you
          notice something—right when the game ends and it's time to celebrate,
          everyone's heads are down, staring at their own phones, watching their
          individual scores appear. The shared energy dissipates into isolated
          screens.
        </BlogParagraph>

        <BlogParagraph>
          This was the core problem we faced with ConnectSignull: a game
          designed to foster connection was actually fragmenting the group
          experience at the most critical moment.
        </BlogParagraph>

        <BlogHeading level={2}>The "Phone Stare" Problem</BlogHeading>

        <BlogParagraph>
          When we tested the original scoring system, the quantitative results
          were impressive—engagement increased by 40%, players wanted to replay
          immediately. But our qualitative observations told a different story.
        </BlogParagraph>

        <BlogParagraph>
          Players would finish a game, and instead of celebrating or discussing
          their performance as a group, they'd immediately look down at their
          own device. The post-game moment—which should have been full of
          laughter, friendly banter, and memories—became silent and isolated.
        </BlogParagraph>

        <BlogCallout type="warning">
          <p>
            <strong>The Paradox:</strong> Our scoring system increased
            engagement and replay, but it threatened to undermine the very core
            of why we built this game: to bring people together.
          </p>
        </BlogCallout>

        <BlogParagraph>
          We realized that the problem wasn't the scoring system itself. The
          problem was that we were delivering the score feedback in isolation.
          Each player getting their own private view meant everyone was
          experiencing a personal achievement or disappointment rather than a
          shared moment.
        </BlogParagraph>

        <BlogHeading level={2}>
          The Solution: A Hybrid Physical-Digital Experience
        </BlogHeading>

        <BlogParagraph>
          What if instead of isolating players with individual displays, we
          created a shared focal point? What if the post-game moment wasn't
          something you watched alone on your phone, but something you watched
          together on a shared screen?
        </BlogParagraph>

        <BlogParagraph>
          We introduced <strong>Companion Display Mode</strong>—a read-only view
          optimized for larger screens like laptops, tablets, or televisions.
          This display shows everything the players see during gameplay, but
          it's meant to be viewed collectively.
        </BlogParagraph>

        <BlogHeading level={3}>How It Works</BlogHeading>

        <BlogList
          items={[
            "One person joins the game on their phone or device and becomes the primary player interface",
            "A second device (laptop, tablet, or TV) displays the game in Companion Mode using the same room code",
            "During gameplay, everyone sees the cards, hints, and letter reveals together on the shared screen",
            "At the end of the game, the score breakdown animates on the shared display, creating a moment of collective celebration or friendly competition",
          ]}
          ordered={true}
        />

        <BlogParagraph>
          Technically, this was simple—we used URL parameters to distinguish
          between the interactive player view and the read-only companion view.
          But the impact was profound.
        </BlogParagraph>

        <BlogHeading level={2}>Why This Changes Everything</BlogHeading>

        <BlogParagraph>
          The companion display transforms ConnectSignull from a game you play
          on your phone into a game you play as a group. Here's what changed:
        </BlogParagraph>

        <BlogHeading level={3}>1. Shared Attention</BlogHeading>

        <BlogParagraph>
          Instead of six people looking at six different phone screens, everyone
          looks at one shared display. This creates a focal point for
          conversation and commentary. When a brilliant signull is created, the
          group reacts together. When the word-setter intercepts a hint, there's
          collective groaning.
        </BlogParagraph>

        <BlogHeading level={3}>2. Real-Time Banter</BlogHeading>

        <BlogParagraph>
          During gameplay, players can see which teammate created which hint and
          react immediately. "Wait, that clue is way too obscure!" or "Oh no,
          that's totally getting captured!" The back-and-forth happens in real
          time, with everyone tracking the same information.
        </BlogParagraph>

        <BlogHeading level={3}>3. Collective Celebration</BlogHeading>

        <BlogParagraph>
          The score breakdown isn't delivered to individuals staring at their
          phones—it's performed for the group. When the leaderboard animates and
          someone's score jumps dramatically, the whole group sees it. Trash
          talk, celebration, and revenging plans happen around the shared screen
          rather than in individual notification bubbles.
        </BlogParagraph>

        <BlogCallout type="success">
          <p>
            <strong>The Observation:</strong> In our user testing, groups with
            Companion Mode showed significantly more verbal engagement, more
            physical gesturing toward the screen, and more spontaneous
            celebration moments. The shared screen became a stage, not just an
            information display.
          </p>
        </BlogCallout>

        <BlogHeading level={2}>The Setup That Works Everywhere</BlogHeading>

        <BlogParagraph>
          One of the best aspects of Companion Mode is its flexibility. It works
          for different contexts:
        </BlogParagraph>

        <BlogList
          items={[
            "In-person at home: Use a laptop or TV as the shared display while everyone holds their phones",
            "At a party or gathering: Plug a laptop into a projector for a larger-than-life game experience",
            "Playing remotely: Use screen sharing over video call to create the same group focal point",
            "Hybrid setup: Some players in the room, others joining remotely, all looking at the same shared view",
          ]}
        />

        <BlogParagraph>
          This flexibility was intentional. We wanted Companion Mode to enhance
          social gaming regardless of whether players were physically co-located
          or connecting digitally.
        </BlogParagraph>

        <BlogHeading level={2}>
          Design Principle: Technology as Facilitator
        </BlogHeading>

        <BlogParagraph>
          Companion Mode embodies a design philosophy we believe strongly in:
          technology should enhance face-to-face interaction, not replace it.
        </BlogParagraph>

        <BlogParagraph>
          Too many digital games try to make the screen the center of the
          experience. ConnectSignull does the opposite. We use technology—the
          shared display—to draw people's eyes up from isolation and back to
          each other. The phones become input devices. The shared screen becomes
          the conversation piece.
        </BlogParagraph>

        <BlogCallout type="info">
          <p>
            <strong>The Key Insight:</strong> The most engaging moment in social
            gaming isn't when someone sees their high score—it's when a group
            sees it together and reacts as one.
          </p>
        </BlogCallout>

        <BlogHeading level={2}>Try It Yourself</BlogHeading>

        <BlogParagraph>
          When you start a new game of ConnectSignull, you'll see an option to
          "Enable Companion Display."
        </BlogParagraph>

        <BlogParagraph>
          The experience is designed to work seamlessly whether you're playing
          with 3 friends in a living room or 10 people at a party.
        </BlogParagraph>

        <BlogHeading level={2}>The Lesson for Social Game Design</BlogHeading>

        <BlogParagraph>
          Companion Mode taught us something important: features that increase
          individual engagement can decrease collective engagement if they're
          not thoughtfully designed.
        </BlogParagraph>

        <BlogParagraph>
          A scoring system alone increases replay but can isolate players. A
          scoring system paired with a shared display increases both engagement
          AND social bonding. The technology that fragments can be redesigned to
          connect—if you think about it from the group's perspective, not just
          the individual's.
        </BlogParagraph>

        <BlogCTA
          description="Ready to experience the power of shared focus? Gather your friends, grab a laptop, and see what happens when everyone's looking at the same screen."
          title="Play ConnectSignull with Companion Display"
          buttonText="Start a Game"
          buttonLink="/"
        />

        <BlogShareButtons title={post.title} url={`/blog/${post.slug}`} />
      </BlogSection>
    </>
  );
}
