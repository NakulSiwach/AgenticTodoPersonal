// Hand-picked quotes for the bottom of the daily email: practical philosophy and hard-won
// lessons rather than slogans. Kept local (no API) so the email never depends on a third party.
// Only well-attributed quotes; commonly misattributed ones are deliberately left out.
// Translations vary slightly between editions.

export type Quote = { text: string; author: string; source?: string };

export const QUOTES: Quote[] = [
  // Stoics
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "If it is not right, do not do it; if it is not true, do not say it.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "How much more grievous are the consequences of anger than the causes of it.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "The best revenge is not to be like your enemy.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca", source: "Letters to Lucilius" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca", source: "On the Shortness of Life" },
  { text: "While we are postponing, life speeds by.", author: "Seneca", source: "Letters to Lucilius" },
  { text: "No man was ever wise by chance.", author: "Seneca", source: "Letters to Lucilius" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca", source: "Letters to Lucilius" },
  { text: "Men are disturbed not by things, but by the opinions about things.", author: "Epictetus", source: "Enchiridion" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus", source: "Discourses" },
  { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus", source: "Enchiridion" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },

  // Classical and Eastern
  { text: "The unexamined life is not worth living.", author: "Socrates", source: "Plato, Apology" },
  { text: "Well begun is half done.", author: "Aristotle", source: "Politics" },
  { text: "When you know a thing, to hold that you know it; and when you do not know a thing, to allow that you do not know it — this is knowledge.", author: "Confucius", source: "Analects" },
  { text: "Knowing others is intelligence; knowing yourself is true wisdom. Mastering others is strength; mastering yourself is true power.", author: "Lao Tzu", source: "Tao Te Ching" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu", source: "Tao Te Ching" },
  { text: "We are what we think. All that we are arises with our thoughts.", author: "The Dhammapada" },
  { text: "In the beginner's mind there are many possibilities, but in the expert's there are few.", author: "Shunryu Suzuki", source: "Zen Mind, Beginner's Mind" },
  { text: "Fall seven times, stand up eight.", author: "Japanese proverb" },
  { text: "A smooth sea never made a skilled sailor.", author: "English proverb" },
  { text: "If you want to go fast, go alone. If you want to go far, go together.", author: "African proverb" },

  // Thinkers and writers
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", source: "The Story of Philosophy (on Aristotle)" },
  { text: "Life can only be understood backwards; but it must be lived forwards.", author: "Søren Kierkegaard", source: "Journals" },
  { text: "Anxiety is the dizziness of freedom.", author: "Søren Kierkegaard", source: "The Concept of Anxiety" },
  { text: "If we have our own why of life, we shall get along with almost any how.", author: "Friedrich Nietzsche", source: "Twilight of the Idols" },
  { text: "Everything can be taken from a man but one thing: the last of the human freedoms — to choose one's attitude in any given set of circumstances.", author: "Viktor Frankl", source: "Man's Search for Meaning" },
  { text: "In the midst of winter, I found there was, within me, an invincible summer.", author: "Albert Camus", source: "Return to Tipasa" },
  { text: "One must imagine Sisyphus happy.", author: "Albert Camus", source: "The Myth of Sisyphus" },
  { text: "He who fears he will suffer, already suffers because he fears.", author: "Michel de Montaigne", source: "Essays" },
  { text: "All of humanity's problems stem from man's inability to sit quietly in a room alone.", author: "Blaise Pascal", source: "Pensées" },
  { text: "I have made this longer than usual because I have not had time to make it shorter.", author: "Blaise Pascal", source: "Provincial Letters" },
  { text: "The best is the enemy of the good.", author: "Voltaire" },
  { text: "Knowing is not enough; we must apply. Willing is not enough; we must do.", author: "Johann Wolfgang von Goethe" },
  { text: "Ask yourself whether you are happy, and you cease to be so.", author: "John Stuart Mill", source: "Autobiography" },
  { text: "To live is the rarest thing in the world. Most people exist, that is all.", author: "Oscar Wilde", source: "The Soul of Man Under Socialism" },
  { text: "The two most powerful warriors are patience and time.", author: "Leo Tolstoy", source: "War and Peace" },
  { text: "A man of genius makes no mistakes. His errors are volitional and are the portals of discovery.", author: "James Joyce", source: "Ulysses" },
  { text: "The world breaks everyone and afterward many are strong at the broken places.", author: "Ernest Hemingway", source: "A Farewell to Arms" },
  { text: "The best way to find out if you can trust somebody is to trust them.", author: "Ernest Hemingway" },
  { text: "Not everything that is faced can be changed, but nothing can be changed until it is faced.", author: "James Baldwin" },
  { text: "How we spend our days is, of course, how we spend our lives.", author: "Annie Dillard", source: "The Writing Life" },
  { text: "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry", source: "Wind, Sand and Stars" },
  { text: "A ship in harbor is safe, but that is not what ships are built for.", author: "John A. Shedd", source: "Salt from My Attic" },
  { text: "Rest is not idleness, and to lie sometimes on the grass under trees on a summer's day, listening to the murmur of the water, or watching the clouds float across the sky, is by no means a waste of time.", author: "John Lubbock", source: "The Use of Life" },
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King", source: "On Writing" },

  // Scientists and builders
  { text: "The first principle is that you must not fool yourself — and you are the easiest person to fool.", author: "Richard Feynman", source: "Cargo Cult Science" },
  { text: "What I cannot create, I do not understand.", author: "Richard Feynman" },
  { text: "I have no special talent. I am only passionately curious.", author: "Albert Einstein" },
  { text: "If I have seen further it is by standing on the shoulders of giants.", author: "Isaac Newton" },
  { text: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "There is nothing so useless as doing efficiently that which should not be done at all.", author: "Peter Drucker" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs", source: "Stanford commencement, 2005" },
  { text: "We shape our tools and thereafter our tools shape us.", author: "John Culkin" },

  // Judgement, money and long games
  { text: "Spend each day trying to be a little wiser than you were when you woke up.", author: "Charlie Munger" },
  { text: "Invert, always invert.", author: "Carl Jacobi", source: "a favourite maxim of Charlie Munger" },
  { text: "Play iterated games. All the returns in life, whether in wealth, relationships, or knowledge, come from compound interest.", author: "Naval Ravikant" },
  { text: "Desire is a contract that you make with yourself to be unhappy until you get what you want.", author: "Naval Ravikant" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin", source: "Poor Richard's Almanack" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin", source: "Poor Richard's Almanack" },

  // Habits and discipline
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear", source: "Atomic Habits" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear", source: "Atomic Habits" },
  { text: "Habits are the compound interest of self-improvement.", author: "James Clear", source: "Atomic Habits" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "Don't wish it were easier, wish you were better.", author: "Jim Rohn" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg", source: "Lean In" },
  { text: "Inaction breeds doubt and fear. Action breeds confidence and courage.", author: "Dale Carnegie" },

  // Courage and character
  { text: "I learned that courage was not the absence of fear, but the triumph over it.", author: "Nelson Mandela", source: "Long Walk to Freedom" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", source: "Autobiography" },
  { text: "Nothing in the world is worth having or worth doing unless it means effort, pain, difficulty.", author: "Theodore Roosevelt" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "Courage is grace under pressure.", author: "Ernest Hemingway" },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },

  // Sport and practice
  { text: "Do not let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "Be quick, but don't hurry.", author: "John Wooden" },
  { text: "Failure is not fatal, but failure to change might be.", author: "John Wooden" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "I've failed over and over and over again in my life. And that is why I succeed.", author: "Michael Jordan" },
  { text: "Absorb what is useful, discard what is useless, add what is specifically your own.", author: "Bruce Lee" },
  { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" },
];

// Walk the list with a stride so consecutive days jump between sections and authors.
const STRIDE = 37;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function stride(n: number): number {
  let s = STRIDE;
  while (gcd(s, n) !== 1) s++;
  return s;
}

/** Same quote for everyone on a given local date (`YYYY-MM-DD`); cycles through all of them. */
export function quoteForDate(date: string, quotes: Quote[] = QUOTES): Quote {
  const [y, m, d] = date.split("-").map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const n = quotes.length;
  const index = (((day * stride(n)) % n) + n) % n;
  return quotes[index];
}
