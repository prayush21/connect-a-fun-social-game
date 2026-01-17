import {
  BlogHeader,
  BlogSection,
  BlogParagraph,
  BlogHeading,
  BlogList,
  BlogCallout,
  BlogCTA,
  BlogShareButtons,
} from "@/components/blog/BlogContent";
import { BlogPost } from "@/lib/blog/posts";

interface BlogPostContentProps {
  post: BlogPost;
}

export default function HowToPlay({ post }: BlogPostContentProps) {
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
          ConnectSignull isn&apos;t your average word game. It combines elements
          of deduction, cultural knowledge, and asymmetric multiplayer gameplay.
          It's about cooperative deception and shared mind-reading.
        </BlogParagraph>

        <BlogHeading level={2}>The Setup</BlogHeading>

        <BlogParagraph>
          At the start of each round, one player becomes the{" "}
          <strong>Word-Setter</strong>, while everyone else joins the{" "}
          <strong>Guesser Team</strong>.
        </BlogParagraph>

        <BlogList
          items={[
            "Word-Setter: You are the mastermind. You choose a secret word and try to intercept the team's clues.",
            "Guessers: You are the creative detectives. You work together to figure out the secret word by generating clues and revealing letters.",
          ]}
        />

        <BlogHeading level={2}>How to Play</BlogHeading>

        <BlogHeading level={3}>1. The Blank Canvas</BlogHeading>
        <BlogParagraph>
          The guessers see only blank spaces for the word (e.g., _ _ _ _ _ _).
          Your goal is to fill them in.
        </BlogParagraph>

        <BlogHeading level={3}>2. Creating a "Signull"</BlogHeading>
        <BlogParagraph>
          This is the heart of the game. A "signull" is a hint card created by a
          guesser.
        </BlogParagraph>
        <BlogParagraph>
          <strong>Matching Prefix:</strong> If you think you know a word that
          starts with the same letters as the secret word, give a clue! If the
          partial word is "P _ _ _ _ _", and you think of "PARROT", your clue
          might be "a green bird".
        </BlogParagraph>

        <BlogHeading level={3}>3. The Interception</BlogHeading>
        <BlogParagraph>
          Here is the catch: The Word-Setter is watching.
        </BlogParagraph>
        <BlogCallout type="warning">
          <p>
            If the team guesses your signull, you force a letter revelation. But
            if the Word-Setter <strong>intercepts</strong> it (guesses it
            first), the hint is captured! No progress is made.
          </p>
        </BlogCallout>

        <BlogHeading level={2}>Winning the Game</BlogHeading>

        <BlogParagraph>
          <strong>Guessers Win:</strong> By correctly identifying the complete
          secret word.
        </BlogParagraph>

        <BlogParagraph>
          <strong>Word-Setter Wins:</strong> By intercepting enough signulls to
          stall the team.
        </BlogParagraph>

        <BlogHeading level={2}>Pro Strategies</BlogHeading>
        <BlogList
          items={[
            "Get Obscure: Use inside jokes or niche knowledge. If the word is 'Apple', don't say 'red fruit'. Say 'Newton's headache'.",
            "Risk vs. Reward: Obscure clues are harder to intercept but harder for your team to guess.",
            "Speed Kills: Communicate quickly! The setter is racing against you.",
          ]}
        />

        <BlogCTA
          description=""
          title="Ready to Outsmart Your Friends?"
          buttonText="Start a Game"
          buttonLink="/"
        />

        <BlogShareButtons title={post.title} url={`/blog/${post.slug}`} />
      </BlogSection>
    </>
  );
}
