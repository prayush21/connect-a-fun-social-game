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

export default function ScoringSystemBlog({ post }: BlogPostContentProps) {
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
          Designing the scoring system for ConnectSignull was one of the most
          challenging—and rewarding—parts of building this game. On the surface,
          a good scoring system seems obvious: add points, show a leaderboard,
          done. But like all good design, it takes careful intuition and
          countless iterations to get the mix just right. This is the story of
          why scoring matters, and how we built a system that drives the right
          behaviors without undermining the social soul of the game.
        </BlogParagraph>

        <BlogHeading level={2}>Why Do You Need a Scoring System?</BlogHeading>

        <BlogParagraph>
          When we started building ConnectSignull, we almost didn't include
          scoring at all. The game was designed around connection,
          collaboration, and shared experiences. Adding points felt like it
          might diminish that. But during early playtesting, we noticed
          something: without clear signals of progress and achievement, players
          felt undirected. A scoring system solves three critical problems:
        </BlogParagraph>

        <BlogList
          items={[
            "<strong>Drives Focus & Purpose:</strong> Most importantly, a good scoring system guides players toward the actions and goals that matter. Without it, players can easily get lost in menial tasks or directionless play. Scoring clarifies what winning looks like and what behaviors lead to success.",
            "<strong>Rewards & Motivation:</strong> Humans are hardwired to seek feedback and recognition. A scoring system acts as a reward mechanism, motivating players to compete, improve, and push themselves harder. Each point earned is a small dopamine hit that keeps players engaged.",
            "<strong>Sustains Engagement:</strong> Scoring creates a narrative arc for each game. Players finish a round with a sense of tangible accomplishment—not just 'we solved a word,' but 'we scored 427 points.' This quantified achievement makes replaying feel compelling. In our A/B testing, groups with scoring enabled played 40% more games and stayed engaged 50% longer.",
          ]}
        />

        <BlogCallout type="success">
          <p>
            <strong>The Data:</strong> 83% of scoring-enabled groups played two
            or more games in a session, compared to just 33% of groups without
            scoring. Average session duration jumped from 28 to 42 minutes.
          </p>
        </BlogCallout>

        <BlogHeading level={2}>
          How the ConnectSignull Scoring System Works
        </BlogHeading>

        <BlogParagraph>
          The scoring system in ConnectSignull rewards behaviors aligned with
          successful gameplay and team coordination. Every action that moves the
          game forward earns points. Here's the breakdown:
        </BlogParagraph>

        <BlogHeading level={3}>In-Game Points</BlogHeading>

        <BlogList
          items={[
            "<strong>+5 for an Intercept:</strong> When the word-setter successfully identifies a signull before the guessing team can solve it, they earn 5 points. This rewards the setter for staying engaged and making strategic decisions about which clues to block.",
            "<strong>+5 for a Connect:</strong> When a guesser successfully solves a signull (recognizes the cultural reference) and it resolves to reveal a letter, the guesser who made the connection earns 5 points. This rewards active participation and cultural knowledge.",
            "<strong>+10 for Making a Signull (if it resolves):</strong> When a player creates a signull that's successfully guessed by the team (before the setter intercepts it), the creator earns 10 points. This incentivizes thoughtful, clever clue-making and rewards creativity that helps the team progress.",
          ]}
        />

        <BlogHeading level={3}>End-of-Game Bonus Points</BlogHeading>

        <BlogParagraph>
          After the word is solved, both the setter and guessers earn bonus
          points that reward the difficulty of the challenge:
        </BlogParagraph>

        <BlogList
          items={[
            "<strong>+5 for every letter revealed to the setter:</strong> If the guessing team forced the word-setter to reveal 5 letters before solving the word, the setter earns 25 bonus points. This rewards setters for choosing difficult words that keep the game competitive.",
            "<strong>+5 for every letter guessers didn't require:</strong> If the word is 7 letters long but the team solved it after only 4 letters were revealed, they earn 15 bonus points (5 × 3). This rewards clever deduction and celebrates moments where the team 'gets' the word faster than expected.",
          ]}
        />

        <BlogCallout type="info">
          <p>
            <strong>The Philosophy:</strong> These bonus points are deliberately
            structured to appear after gameplay ends. This separation preserves
            the intrinsic motivation and social connection during the game
            itself, while still offering quantified achievement feedback that
            enhances replay value. You're connected during play, celebrated
            after.
          </p>
        </BlogCallout>

        <BlogHeading level={2}>The Design Challenges</BlogHeading>

        <BlogParagraph>
          Getting this balance right required careful tuning. We faced three
          critical design tensions:
        </BlogParagraph>

        <BlogList
          items={[
            "<strong>Competition vs. Cooperation:</strong> We wanted scoring to motivate players without creating stress or toxic competitiveness. The solution: individual contributions are scored (who made that awesome clue?), but the team's collective achievement is the main goal. Scoring celebrates individual creativity within a cooperative context.",
            "<strong>Clarity vs. Simplicity:</strong> The system needed to be complex enough to feel meaningful, but simple enough that players understood it instantly. We avoided nested multipliers or esoteric formulas. Every point is earned through a clear, understandable action.",
            "<strong>Intrinsic vs. Extrinsic Motivation:</strong> Research shows that external rewards can sometimes undermine intrinsic motivation. By deferring the score reveal until after gameplay ends, players focus on the collaborative experience first, then get the dopamine hit of seeing the final tally.",
          ]}
        />

        <BlogHeading level={2}>Why These Point Values?</BlogHeading>

        <BlogParagraph>
          The specific point values (5, 5, 10, 5, 5) were chosen to balance
          different playstyles:
        </BlogParagraph>

        <BlogList
          items={[
            "Intercepting and connecting both earn 5 points, ensuring that the word-setter and guessers have equivalent value for their actions.",
            "Making a successful signull earns 10 points because it requires the most creativity and risk—you're creating something that might be intercepted. This rewards initiative.",
            "Bonus points scale with choosing words strategically, not just by length; smarter words create opportunities for the experienced players. This prevents 'trivial' games from feeling hollow.",
          ]}
        />

        <BlogParagraph>
          In testing, we found that players naturally began setting slightly
          harder words to maximize their own bonus points, which paradoxically
          made the game more fun for everyone. The scoring system subtly guided
          players toward optimal behavior without feeling restrictive.
        </BlogParagraph>

        <BlogHeading level={2}>What We Learned</BlogHeading>

        <BlogParagraph>
          The biggest lesson:{" "}
          <strong>scoring is not the enemy of social gaming.</strong> When
          designed thoughtfully, it amplifies engagement without killing the
          vibe. Players in our scoring-enabled groups didn't report feeling
          stressed or excessively competitive. Instead, they talked about
          "strategy," "comebacks," and memorable moments. The score became a
          shared narrative—a way to reflect on what just happened.
        </BlogParagraph>

        <BlogParagraph>
          One player said: "I can't believe that one such simple word would turn
          the tables so suddenly!" Another group developed inside jokes about
          scores: "We need a rematch—I want to redeem myself." These weren't
          toxic competitions; they were moments of joy and connection, amplified
          by the scoring system.
        </BlogParagraph>

        <BlogCTA
          description="See the scoring system in action with real-time score breakdowns during gameplay."
          title="Try It Yourself"
          buttonText="Play with Score Breakdown Mode"
          buttonLink="/?scoreBreakdown=true"
        />

        <BlogShareButtons title={post.title} url={`/blog/${post.slug}`} />
      </BlogSection>
    </>
  );
}
