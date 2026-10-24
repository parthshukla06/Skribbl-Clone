export const WORDS_LIST: string[] = [
  // Animals
  'elephant', 'giraffe', 'penguin', 'dolphin', 'kangaroo', 'butterfly',
  'monkey', 'turtle', 'rabbit', 'octopus', 'panda', 'cheetah', 'flamingo',
  'hamster', 'lion', 'tiger', 'zebra', 'crocodile', 'parrot', 'squirrel',
  'camel', 'peacock', 'hedgehog', 'whale', 'koala', 'sloth', 'bear',
  
  // Everyday Objects & Tools
  'guitar', 'umbrella', 'bicycle', 'telescope', 'backpack', 'scissors',
  'camera', 'compass', 'flashlight', 'headphones', 'keyboard', 'suitcase',
  'candle', 'hourglass', 'microscope', 'skateboard', 'trophy', 'ladder',
  'anchor', 'balloon', 'clock', 'hammer', 'key', 'sword', 'glasses',

  // Food & Drinks
  'pizza', 'burger', 'ice cream', 'strawberry', 'banana', 'cupcake',
  'popcorn', 'pancake', 'watermelon', 'donut', 'sushi', 'sandwich',
  'cookie', 'pineapple', 'avocado', 'cheese', 'hotdog', 'apple',

  // Nature, Places & Weather
  'volcano', 'rainbow', 'mountain', 'waterfall', 'pyramid', 'lighthouse',
  'island', 'castle', 'campfire', 'tornado', 'windmill', 'bridge',
  'forest', 'desert', 'cave', 'snowflake', 'sunflower', 'galaxy',

  // Vehicles & Machines
  'airplane', 'submarine', 'helicopter', 'rocket', 'sailboat', 'tractor',
  'motorcycle', 'ambulance', 'firetruck', 'train', 'bulldozer', 'scooter'
];

/**
 * Returns `count` unique random words from the dictionary.
 */
export function getRandomWords(count: number = 3): string[] {
  const shuffled = [...WORDS_LIST].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generates a masked word string (e.g. "ICE CREAM" -> "_ _ _   _ _ _ _ _").
 */
export function maskWord(word: string): string {
  return word
    .split('')
    .map((char) => (char === ' ' || char === '-' ? char : '_'))
    .join(' ');
}
