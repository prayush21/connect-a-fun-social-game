a more structured flow of the game.

there are n players in a game.

all of them join the gameroom.
there are two roles, out of which a person can have ONE role during a game.
word-setter and word-guesser(setter and guesser for simplicity)
out of the n players, at a time, exactly ONE of them will be of word setter
in the game room, before the start of the game, the word setter holds the controls of the room.
the controls include:

- ability to remove any player from the game
- ability to set any player as a word setter(giving away their own role)
- ability to set the threshold number of connects required during the game phase.
- ability to start the game.

the setter starts the game, and is prompted to set a secret-word by typing it in the input field.
this should be a valid english dictionary word.

as the setter finishes setting the word, the game phase starts.

the guessers team have to figure out what the secret word is. They have two ways to do it.
first one is 'direct guess' the word on the basis of the revleaed prefix and guessing a word with same number of letters as the secret word. the guessers team have a total of only 3 guesses btwn all of them to get it right. if they run out of three guesses before revelaling the secret word, setter wins!

second action that guessers can take is reference-&-connect. here the idea is to beat the setter in his own arena. one of the guessers will take the lead, and think of a word, that has same prefix as the revealed-prefix of the secret-word(not necessarily the same number of letters as secret word tho), and give the rest of the players some reference/s about that word he/she is thinking. understanding the reference, rest of the guessers will write their idea for the reference-word that
guesser-leader has thought, and say/click connect. if the threshold number of connects are hit by the guessers, each connect'ed guesser's guess would be matched upon to the guesser-leader's reference-word. if all of them match up, before the word-setter understands the reference put out by the guesser-leader, they get to unlock the letter on the next place on the secret-word. if the setter gets the reference right, before the connects match, a new guesser will take the lead again, and go on about reference-&-connect strategy. the chance to carry out the reference-&-connect action is round robinned through all guessers one-by-one. if they can't set the referencew-word and reference-explanation in 30 seconds, the chance is given to the next player in round robin. if the guessers when raised connects for the reference, didn't have their reference-words to match, the next letter from prefix isn't revealed by the setter.

at all the times, all the guessers have the option to make a direct-guess to win the game! but keep in mind that the guessers team have just 3 total direct guesses to figure it out.

//ux
all the players can see the first letter of the secret word, and empty blocks/blanks for rest of the letters in the main/hero section centered on the screen horizontal.

now, the guessers have button on top right showing the number of direct
