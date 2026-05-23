/**
 * Curated rotating quotes for the dashboard.
 * Plain strings — no attribution.
 */
export const QUOTES = [
  'The journey of a thousand miles begins with a single step.',
  'What you do today can improve all your tomorrows.',
  'Stars can’t shine without darkness.',
  'Do something today that your future self will thank you for.',
  'Small steps every day.',
  'Be the energy you want to attract.',
  'Discipline is choosing between what you want now and what you want most.',
  'The best time to plant a tree was twenty years ago. The second best time is now.',
  'Wherever you go, go with all your heart.',
  'Storms make trees take deeper roots.',
  'Quiet the mind and the soul will speak.',
  'Done is better than perfect.',
  'You are exactly where you need to be.',
  'A smooth sea never made a skilled sailor.',
  'Bloom where you’re planted.',
  'Difficult roads often lead to beautiful destinations.',
  'Make today so awesome that yesterday gets jealous.',
  'Collect moments, not things.',
  'Big things often have small beginnings.',
  'Trust the slow pace of meaningful progress.',
  'Be soft. Do not let the world make you hard.',
  'You don’t have to be perfect to be amazing.',
  'Stay close to anything that makes you glad you are alive.',
  'Do more of what makes you forget to check your phone.',
  'The world is full of magic things, patiently waiting for our senses to grow sharper.',
  'A year from now you will wish you had started today.',
  'Calm mind brings inner strength and self-confidence.',
  'Travel light, live light, spread the light, be the light.',
  'You can’t pour from an empty cup.',
  'And suddenly you just knew — it was time to start something new.',
];

/**
 * Returns a daily-stable quote so the dashboard doesn't reshuffle on every
 * render but does change at least once a day.
 */
export function getDailyQuote() {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return QUOTES[day % QUOTES.length];
}

/** Returns a random quote that isn't the one currently shown. */
export function getRandomQuote(current) {
  if (QUOTES.length <= 1) return QUOTES[0];
  let next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  let safety = 5;
  while (current && next === current && safety-- > 0) {
    next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }
  return next;
}
