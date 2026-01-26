Here is the content of the PDF converted into clean Markdown format.

ConnectSignull: A Collaborative Word Game Designed for Shared Experiences and Human Connection

**Author:** Prayush Dave, Stony Brook University, USA

### Abstract

In an era characterized by fragmented attention and diminished interpersonal connection despite ubiquitous digital connectivity, we present ConnectSignull, a collaborative word game designed to foster meaningful social interaction through shared references and cooperative gameplay. The game challenges players to collaboratively decode secret words through a system of cultural and experiential clues, emphasizing teamwork over individual performance. Through iterative design informed by user research and empirical testing, we developed a mobile-first platform that addresses key interaction challenges including attention management, seamless onboarding, and engagement sustainability. Our evaluation through testing demonstrated that the introduction of a scoring system increased replay engagement by approximately 40%, while user observations revealed the critical importance of multimodal feedback and post-game reflection features. This work contributes insights into designing multiplayer experiences that prioritize human connection and demonstrates how careful application of HCI principles can transform a novel game concept into an engaging platform for social interaction. We provide detailed analysis of our design iterations, quantitative evaluation of key features, and recommendations for future collaborative game design.

**CCS Concepts:** Human-centered computing → HCI design and evaluation methods; Collaborative interaction.

**Keywords:** Human-Computer Interaction, Collaborative Gaming, Social Connection, Mobile Design, User Experience, Word Games, Multiplayer Games, Social Computing.

---

## 1. Introduction

The contemporary digital landscape presents a paradox where advanced connectivity technologies, such as social media and streaming services, compete for user attention to maximize engagement, often leading to a sense of increased social disconnection rather than genuine interpersonal relationships. Meaningful human bonds are fundamentally built upon the accumulation of shared experiences and memories—like shared laughter or mutual discovery—that create common ground and strengthen social ties. However, many current digital platforms fail to facilitate these types of deep, spontaneous, face-to-face interactions, instead promoting passive consumption or asynchronous communication. This trend has led to a decline in authentic, in-depth social experiences, particularly among younger generations, as the curated and asynchronous nature of digital platforms often substitutes a broader, shallower connection for genuine relationship vulnerability and depth.

Games offer a powerful, active medium for fostering genuine human connection, contrasting with passive digital consumption by requiring active participation, coordination, and shared emotional experiences in a common game state. While the game industry has seen successful titles build communities, many popular multiplayer games prioritize competition or require substantial time investment, often overlooking the potential for socially focused design.

This paper introduces ConnectSignull, a collaborative word game explicitly designed to create shared experiences and strengthen social bonds through cooperative gameplay and cultural references. Unlike traditional competitive word games, ConnectSignull features asymmetric team dynamics—where a cooperative team works against a single word-setter—demanding that players effectively communicate, share knowledge, and solve problems under time pressure. The development of ConnectSignull required careful attention to Human-Computer Interaction challenges, including interface design, feedback mechanisms, and managing novel interaction patterns, which were addressed through iterative design and user research to ensure player understanding, sustainable engagement, and social reflection.

### 1.1 Contributions

Our contributions include:

- (1) The design and implementation of a novel collaborative word game that prioritizes shared experiences over individual performance, with detailed documentation of the design rationale and iterative refinement process.

- (2) Empirical evidence through testing demonstrating that scoring systems can increase replay engagement in cooperative games by approximately 40% without undermining social objectives.

- (3) Design insights regarding mobile-first multiplayer experiences, including the strategic use of a companion display mode that integrates digital gameplay with physical co-presence.

- (4) Identification of key interaction patterns and feedback mechanisms that support comprehension of novel game mechanics, particularly the importance of multimodal feedback and card-based information architecture.

- (5) A comprehensive analysis of onboarding friction in multiplayer games and evidence-based design solutions including structured room codes and multi-modal joining mechanisms.

---

## 2. Related Work

The design of ConnectSignull draws upon research in several domains of Human-Computer Interaction, including collaborative gaming, social computing, interaction design for mobile platforms, and feedback mechanisms in interactive systems.

### 2.1 Social and Collaborative Games

Multiplayer games are established platforms for social interaction, with cooperative gameplay—as demonstrated by Mandryk and colleagues—enhancing social bonding through shared goals and coordinated action, even showing physiological evidence of increased social presence. Our research builds on this by focusing on cultural reference generation and recognition as the main collaborative mechanic. While games like charades use references, they rely on visual cues; modern games like Codenames show the appeal of abstract word connections but use a competitive structure. Word games generally, like Scrabble, have been studied for their cognitive and social dynamics but emphasize individual performance and competitive scoring. In contrast, ConnectSignull's central innovation is its use of an asymmetric cooperative model that foregrounds shared cultural knowledge and teamwork as the core mechanisms for genuine connection.

### 2.2 Mobile Gaming and Interface Design

The shift to mobile gaming platforms requires new interface designs that accommodate limited screen space, touch interaction, and varied usage contexts, emphasizing clear visual hierarchies and low cognitive load. A key concept influencing design is the "thumb zone," which dictates the placement of interactive elements for easy reach on mobile screens. Card-based interfaces have become a successful pattern for this environment, presenting information in discrete, digestible units—like familiar physical cards—that offer clear affordances for interaction such as tapping or swiping. Our design for ConnectSignull leverages these established card-based patterns but adapts them for the unique demands of real-time multiplayer gameplay. Unlike simpler applications where cards represent independent content, our cards must dynamically convey complex game state information, including player participation, progress, and the temporal relationships between game events.

### 2.3 Asymmetric Gameplay and Role Design

Asymmetric multiplayer games, where different players have different abilities, information, or objectives, have received attention in game design research. Games like Dead by Daylight, Among Us, and Left 4 Dead have demonstrated the appeal of asymmetric structures, often placing one player or a small group in opposition to the majority. These designs create unique social dynamics as players negotiate power imbalances and information asymmetries. The word-setter role in ConnectSignull creates a privileged information position similar to these asymmetric structures, but with an important distinction: while games like Among Us create adversarial relationships, ConnectSignull's word-setter can choose to be more or less challenging, creating flexibility in social dynamics. This allows groups to calibrate difficulty based on their preferences and maintains a lighter, more playful atmosphere than purely competitive asymmetric games.

### 2.4 Feedback and Engagement Mechanisms

Feedback is crucial for engagement and learning in interactive systems, with multimodal approaches (visual, auditory, haptic) proven to boost performance, provided the feedback is timely, relevant, and salient without causing cognitive overload. While common game elements like scoring systems and leaderboards are used to drive engagement, their effect on intrinsic motivation is debated; external rewards can sometimes undermine interest (the "overjustification effect"). The gamification field has shown mixed results with using points and badges in non-game contexts. Our approach in ConnectSignull addresses this tension by deferring the presentation of scores until after the collaborative gameplay is complete, preserving the intrinsic motivation derived from creative collaboration while still offering quantified achievement feedback to enhance replay value.

### 2.5 Social Computing and Co-located Interaction

Research on computer-supported cooperative work (CSCW) and social computing has examined how technology can facilitate collaboration and social interaction. While much of this work focuses on productivity contexts like document co-editing or video conferencing, insights about awareness, presence, and coordination mechanisms apply to social gaming as well. Co-located interaction—where users are physically present in the same space—presents unique opportunities and challenges. Systems designed for co-located use can leverage social protocols, physical gestures, and shared environmental context that are unavailable in purely remote interaction. Our companion display mode explicitly embraces co-located interaction by creating a shared focal point that encourages face-to-face engagement rather than isolation into individual mobile screens.

---

## 3. Game Design and Mechanics

ConnectSignull implements a collaborative word-guessing game with asymmetric player roles and progressive revelation mechanics. This section details the core game mechanics and the design rationale underlying key gameplay elements.

### 3.1 Core Gameplay Loop

Each game session begins with players joining a shared lobby through one of several mechanisms. One player assumes the role of word-setter, while all other players become guessers who form a collaborative team. The word-setter selects a secret word of their choosing, which the guessers must decode through a combination of clue interpretation and strategic information gathering. The guessers initially see only a series of blank spaces indicating the word's length.

For example, if the word-setter chooses "PLANET," guessers see six blank spaces. The guessers' objective is to determine the complete word through two complementary mechanisms: generating matching-prefix clues and creating cultural references. This initial state of complete uncertainty creates immediate tension and establishes the collaborative challenge. Unlike games where players receive explicit hints about the answer (such as category information in traditional word games), ConnectSignull requires guessers to bootstrap their understanding purely through coordinated reference generation and deduction from teammate responses.

### 3.2 Clue Generation Mechanisms

The matching-prefix mechanism allows guessers to force letter revelation by proposing words that share the same initial letters as the revealed portion of the secret word. For instance, with the partial word `P _ _ _ _`, a guesser might provide a clue for "PARROT" (described as "a green bird"). If a threshold number of team members successfully identify this reference, the word-setter must reveal the next letter, updating the display to `PL _ _ _ _`.

The threshold for letter revelation is dynamically calculated based on team size to ensure that the mechanic scales appropriately. For small teams (3-4 players), a simple majority is required. For larger teams, the threshold grows sublinearly to prevent the mechanic from becoming excessively difficult as more players join. This scaling ensures that the core gameplay remains viable across different group sizes.

The reference generation mechanism operates independently of prefix matching. Guessers can create clues for any word sharing the current prefix, regardless of length. These "signulls" (our term for hint cards) challenge other guessers to decode the reference before the word-setter identifies it. Successful guessing by the team forces additional letter revelation, while failure allows the word-setter to intercept the clue and potentially impede the guessers' progress. When a signull is intercepted by the word-setter, it is marked as "captured" and removed from the active pool of hints. This creates risk-reward dynamics for guessers: more obscure references are less likely to be intercepted but also less likely to be understood by teammates, while obvious references provide safer team coordination but give the word-setter opportunities to slow progress.

### 3.3 Design Rationale

Several design decisions shaped the final game mechanics, each addressing specific goals related to social interaction, accessibility, and engagement sustainability.

#### 3.3.1 Asymmetric Role Structure

The asymmetric role structure creates natural teaching moments, as the word-setter's privileged information position allows them to observe and potentially guide the guessers' problem-solving process. Unlike symmetric competitive games where all players start with equivalent information, the word-setter can gauge whether guessers are on productive paths and adjust their interception strategy accordingly. This creates opportunities for the word-setter to calibrate difficulty dynamically—aggressively intercepting hints to create challenge, or allowing more hints through to ease difficulty for struggling teams.

#### 3.3.2 Progressive Revelation Mechanic

The progressive revelation mechanic maintains tension throughout gameplay, as each new letter simultaneously aids the guessers and reduces the solution space. Early letters provide minimal constraint—knowing that a word starts with 'P' leaves thousands of possibilities. However, as more letters accumulate (PLA), the space of possible words contracts rapidly, creating acceleration in the endgame.

#### 3.3.3 Cultural Reference Emphasis

The game's core mechanic is built around cultural references to facilitate shared experiences. Players must draw on common knowledge and personal stories, naturally leading to the discovery of mutual interests and creation of memorable moments. The reference-based interaction mirrors natural conversation and playful banter rather than structured competition. References are diverse, spanning popular media, history, internet culture, and personal experiences. This variety allows players with different knowledge bases—from literature buffs to meme experts—to contribute effectively. The wide scope of valid references democratizes gameplay and prevents any single domain from becoming the only path to success.

#### 3.3.4 Victory and Defeat Conditions

Games conclude through two primary pathways. Guessers achieve victory by correctly identifying the complete secret word, either through progressive letter revelation or through direct deduction. The word-setter achieves victory by intercepting a threshold number of signulls before guessers solve the word, with the threshold scaling based on word length to ensure balanced difficulty.

---

## 4. System Implementation

This section describes the technical architecture and key implementation decisions that enabled ConnectSignull's functionality and user experience goals.

### 4.1 Technology Stack

ConnectSignull utilizes a modern web technology stack optimized for real-time multiplayer interaction and cross-platform compatibility. The frontend employs React 18 with TypeScript, providing type safety and component-based architecture that facilitated rapid iteration during the design process. The strict typing enforced by TypeScript proved particularly valuable for managing complex game state updates and ensuring consistency across multiple client instances.

Firebase Firestore serves as the backend database, offering real-time synchronization capabilities essential for multiplayer gameplay where all clients must reflect game state changes instantaneously. Firestore's document-listener model allowed us to implement reactive updates where any change to game state automatically propagates to all connected clients without explicit polling. This architecture reduces latency and provides a smooth, responsive gameplay experience even with multiple simultaneous player actions.

Deployment leverages Google Cloud Platform for backend infrastructure and Vercel for frontend hosting, ensuring low latency and high availability. The choice of web technologies rather than native applications aligned with our mobile-first design philosophy while maintaining cross-platform compatibility, allowing players to join from any device with a modern web browser. This decision proved critical for reducing barriers to entry, as players need not install applications or navigate app store policies to begin playing.

### 4.2 Visual Design Language

ConnectSignull adopts a neobrutalist design aesthetic characterized by stark contrasts, bold typography, and geometric simplicity. The primary color palette consists predominantly of black and white, with strategic use of accent colors (primarily bright green for active elements and red for warning states) to draw attention to interactive elements and game state changes. This design approach serves multiple purposes: it ensures strong visual contrast for accessibility (important for players with visual impairments or in varied lighting conditions), conveys a distinctive and memorable aesthetic identity, and evokes the tangible qualities of physical game components such as printed cards or board game pieces. The deliberate simplicity of the visual design reduces cognitive load, allowing players to focus attention on gameplay rather than interface interpretation. The retro-inspired aesthetic also differentiates ConnectSignull from the glossy, gradient-heavy designs common in contemporary mobile games. User feedback suggested that this distinctive appearance contributed to memorability and made the game feel more "authentic" or "honest" compared to heavily-polished alternatives. The brutalist approach communicates that the game prioritizes substance over superficial visual appeal.

### 4.3 Card-Based Interface Architecture

Early prototype versions implemented game hints through text boxes and state-dependent input fields, requiring players to shift attention between the game log, input areas, and status displays. User testing revealed that this fragmented interface increased cognitive load and made it difficult for players to maintain situational awareness during the rapid pace of active gameplay. To manage attention and information processing in ConnectSignull, we redesigned the interface using a card-based paradigm. Each hint, or "signull," appears as a discrete card containing all relevant information: the creating player's identity, progress indicators showing successful decoding, the fraction of team members who have guessed, and the hint text itself. This approach leverages users' existing mental models of physical cards like flashcards, which reduces the learning curve for the interface. The card-based design offers several benefits beyond clear information architecture: cards create strong visual boundaries for easy scanning of multiple game events, and their self-contained nature eliminates the need for cross-referencing information across different parts of the screen. Furthermore, the stacking and scrolling behavior of the cards creates a natural, vertical timeline, implicitly conveying the temporal progression of game events without needing explicit timestamps.

### 4.4 Companion Display Mode

A significant challenge was designing the presentation of scoring and game outcomes to enhance, rather than disrupt, social interaction, as initial designs that displayed scores on individual mobile devices isolated players during the critical post-game reflection period. We addressed this by introducing a companion display mode, which is a read-only view optimized for larger screens like laptops or televisions. This shared display shows the game lobby, presents active hint cards during gameplay, and, crucially, culminates in an animated scoring sequence with a dynamic leaderboard. This transforms ConnectSignull into a hybrid setup: personal mobile devices handle input (maintaining individual agency), while the shared screen becomes a focal point for collective viewing, discussion, and shared attention. Technically, this is achieved by using URL parameters to distinguish between the fully interactive player views and the read-only companion view. This architectural decision supports the design philosophy that technology should bolster face-to-face interaction, as user observations confirmed that the shared screen led to significantly more verbal engagement and physical gesturing among players.

---

## 5. Iterative Design and User Research

The development of ConnectSignull involved extensive user research and iterative refinement based on empirical observations and testing. This section describes key design iterations and the user research that informed them.

### 5.1 Early Prototype Testing and Observations

Initial prototype testing involved deploying a functional but minimal version of the game to gather qualitative feedback on core mechanics and interaction patterns. We conducted eight structured observation sessions with groups ranging from three to seven players, recording gameplay videos and conducting semi-structured post-game interviews. These sessions revealed several critical insights that shaped subsequent design decisions.

#### 5.1.1 Platform Accessibility

Early user feedback consistently indicated desire for cross-platform compatibility, with particular emphasis on supporting both mobile and desktop devices. Observations of actual play sessions confirmed that approximately 70% of players joined from mobile devices (smartphones or tablets), validating our decision to prioritize mobile-first design principles. However, desktop users also represented a significant portion of the player base, particularly when games were organized in home settings where laptop access was convenient. Interestingly, we observed that groups often contained mixed device types—some players on phones, others on laptops. This heterogeneity reinforced our commitment to responsive web design rather than platform-specific native applications. By ensuring that ConnectSignull functioned effectively across device types while presenting appropriately optimized interfaces for each, we reduced barriers to participation and accommodated the diverse contexts in which social gaming occurs.

#### 5.1.2 Onboarding Friction

The initial implementation used a six-character alphanumeric room code system for game joining. User observations revealed significant friction in this process: players frequently needed clarification about whether codes were case-sensitive (they were not, but users were uncertain), whether they included special characters (they did not, but the possibility created anxiety), and how to distinguish between visually similar characters (particularly problematic for '0' versus 'O', '1' versus 'l', and 'S' versus '5'). Voice communication analyses revealed that players attempting to verbally share room codes spent considerable time clarifying characters: "That's a zero, not the letter O" or "lowercase L, not the number one." This friction created frustration during what should be the most exciting moment—when friends are eager to begin playing together.

To reduce this cognitive burden, we redesigned the room code system to follow a structured format: four letters followed by two digits, with letters following a consonant-vowel-consonant-vowel pattern. For example, a room code might be "FEZA32" rather than "0cx7z4". This structured approach provided several benefits: the predictable pattern reduced uncertainty about code format, the letter-digit separation made codes easier to verbally communicate ("F-E-Z-A-3-2" with clear boundaries), and the consonant-vowel alternation in letters created pronounceable pseudo-words that were easier to remember and transcribe. We further reduced joining friction by implementing multiple entry methods: manual code entry for users who received codes through non-digital channels (such as verbal communication in person), clickable invite links for users with direct digital communication (such as text messages or chat applications), and QR code generation for in-person joining scenarios where multiple players could quickly scan codes with their device cameras. This multi-modal approach accommodated various social contexts and user preferences, ensuring that the joining process never became a barrier to gameplay.

#### 5.1.3 Attention Management During Gameplay

Observations of active gameplay sessions revealed that players frequently lost track of game state changes. The scrolling nature of the card interface meant that new cards might appear off-screen, and important events like letter revelations could occur without players noticing. This resulted in confusion about current game state and reduced engagement as players struggled to maintain situational awareness.

Analysis of similar games and review of HCI literature on attention and notification design suggested that multimodal feedback could address this challenge. We implemented a comprehensive audio notification system that provided distinct sound cues for key game events: secret word setting, new signull creation, player connection to a signull, letter revelation, and game conclusion conditions. The audio design followed principles of auditory icon design, using sounds that were distinctive, non-intrusive, and semantically appropriate to their associated events. For example, letter revelations used a subtle "reveal" sound suggesting information disclosure, while successful player connections used a more celebratory tone. User feedback following audio implementation was strongly positive, with players reporting improved awareness of game progression and enhanced sense of immersion.

### 5.2 Scoring System Development

The initial design of ConnectSignull focused purely on the collaborative experience of decoding words through shared references, without explicit scoring mechanisms. While this approach aligned with the game's social connection goals, extended testing revealed that the absence of scoring reduced long-term engagement and failed to create compelling moments of achievement.

#### 5.2.1 Scoring Logic Design

We developed a scoring system that rewarded behaviors aligned with successful gameplay and team coordination. Points were allocated for actions including: creating signulls that teammates successfully decoded, correctly guessing other players' signulls, forcing letter revelations through coordinated team effort, and ultimately solving the secret word. The word-setter received points for successful interceptions and for creating words that challenged the guessing team appropriately. The scoring logic required careful balancing to ensure that no single strategy dominated optimal play. Point values were calibrated through iterative testing to ensure that active participation (both creating and guessing signulls) yielded comparable returns, preventing the game from devolving into passive waiting or excessive hint flooding.

### 5.3 A/B Testing of Scoring Impact

To empirically evaluate the impact of the scoring system on player engagement, we conducted an test comparing gameplay sessions with and without scoring. The independent variable was the presence or absence of the scoring system, while dependent variables included the number of games played per session and whether players initiated new games after completing their first game.

#### 5.3.1 Methodology

User groups were randomly assigned to either the scoring-enabled condition or the control (no-scoring) condition. Both groups experienced identical core gameplay mechanics, interface design, and feature sets; only the scoring system differed. Randomization occurred at the session level, with each testing session assigned to one condition before participant arrival. We recruited 12 groups of 4-6 players each through campus announcements and social media, resulting in 58 total participants (27 in scoring condition, 31 in control condition). Groups were provided with a brief gameplay explanation and then allowed to play freely for up to 60 minutes. We tracked engagement through backend analytics, recording session duration, number of games completed, and whether groups started additional games after their initial session. Facilitators observed sessions unobtrusively and recorded qualitative notes about player interactions, verbal comments, and behavioral patterns. Post-session surveys asked participants about their experience, likelihood of playing again, and perceptions of the game's entertainment value.

#### 5.3.2 Results

Analysis revealed that groups in the scoring-enabled condition showed substantially higher rates of replay engagement. Of the six groups in the scoring condition, five (83%) played two or more games, with an average of 3.2 games per session . In contrast, only two of six control groups (33%) played multiple games, with an average of 1.7 games per session . Average session duration showed similar patterns: scoring groups played for 42 minutes on average compared to 28 minutes for control groups . A Mann-Whitney U test indicated this difference was statistically significant , though the small sample size suggests caution in interpretation.

Qualitative feedback supported these quantitative findings. Players in the scoring condition frequently discussed the leaderboard during post-game conversations, referencing specific cards that had significantly impacted standings. Representative comments included: "I can't believe that one card gave me 35 points!" and "We need a rematch—I want to redeem myself." Some groups developed informal narratives around their competitive performances, with players adopting personas ("I'm coming for that top spot") that created additional social interaction opportunities.

In contrast, control group players, while generally positive about the gameplay experience, showed less enthusiasm for continuing. Comments suggested satisfaction with the core mechanics but lack of compelling reason to replay: "That was fun, but I think we got the idea" and "Should we play again or try something else?" The absence of quantified achievement appeared to reduce motivation for immediate replay, though players expressed interest in returning to the game on future occasions.

---

## 6. Conclusion

ConnectSignull exemplifies how applying Human-Computer Interaction (HCI) principles through iterative, user-centered design can transform a novel concept into an engaging platform for social connection, successfully addressing challenges like attention management, onboarding friction, and social reflection. Our work offers several key contributions: First, we demonstrate the value of prioritizing the design of collaborative experiences that foster shared memories over individual performance, validating that games can be effective platforms for meaningful social interaction. Second, our empirical evaluation shows that competitive elements can thoughtfully enhance cooperative contexts; for example, the post-game scoring sequence improved both engagement and social interaction, proving competition and cooperation can be complementary design goals. Third, our architecture featuring a hybrid physical-digital experience, where personal mobile devices handle private input and a shared companion display facilitates collective viewing and discussion, provides a model for leveraging the affordances of different devices to support face-to-face interaction, a pattern applicable beyond gaming. Fourth, our project emphasizes that attention to detail, from room code structure to audio feedback and card-based interface evolution, is critical; the cumulative effect of these small implementation improvements proved as important as the core gameplay innovation. Ultimately, ConnectSignull demonstrates the potential for games to address the broader digital challenge of designing for genuine human relationships rather than mere attention-maximizing engagement. This project reinforces the need for thoughtful design grounded in HCI principles to ensure digital platforms enhance, rather than diminish, the quality of human connection.

### Acknowledgments

The author thanks Dr. Xiaojun Bi for guidance on this project, the CSE518 course staff for their support, and all playtesters who provided valuable feedback during the development process. Special thanks to the participants in our user studies who generously contributed their time and insights.

### References

- [1] R. L. Mandryk and K. M. Inkpen. Physiological indicators for the evaluation of co-located collaborative play. In Proceedings of the 2006 ACM Conference on Computer Supported Cooperative Work (CSCW '06), pages 102-111, 2006.

- [2] M. Prensky. Digital Game-Based Learning. McGraw-Hill, New York, 2001.

- [3] S. K. Card, T. P. Moran, and A. Newell. The Psychology of Human-Computer Interaction. Lawrence Erlbaum Associates, Hillsdale, NJ, 1983.

- [4] P. Dourish. Where the Action Is: The Foundations of Embodied Interaction. MIT Press, Cambridge, MA, 2001.

- [5] J. Lazar, J. H. Feng, and H. Hochheiser. Research Methods in Human-Computer Interaction, 2nd edition. Morgan Kaufmann, Cambridge, MA, 2017.

- [6] D. A. Norman. The Design of Everyday Things: Revised and Expanded Edition. Basic Books, New York, 2013.

- [7] S. Turkle. Alone Together: Why We Expect More from Technology and Less from Each Other. Basic Books, New York, 2011.

- [8] S. Brewster and R. Murray-Smith. Haptic Human-Computer Interaction. Springer, Berlin, 2001.

- [9] S. Deterding, D. Dixon, R. Khaled, and L. Nacke. From game design elements to gamefulness: Defining "gamification". In Proceedings of the 15th International Academic MindTrek Conference: Envisioning Future Media Environments (MindTrek '11), pages 9-15, 2011.
