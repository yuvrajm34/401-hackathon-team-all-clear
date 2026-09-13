import type { Stage } from "./types";

interface MemeConfig {
  images: string[];
  /** Good news gets a confetti burst; bad news just pops up and fades. */
  confetti: boolean;
  /** Plays once, right as the popup appears. Not every stage has one. */
  sound?: string;
}

/**
 * No entry for "wishlist" — moving a card back to the wishlist isn't really
 * a win or a loss, so nothing pops up for it.
 */
const MEME_CONFIG: Partial<Record<Stage, MemeConfig>> = {
  applied: { images: ["/memes/applied.jpg"], confetti: true },
  interview: { images: ["/memes/interview.jpg"], confetti: true },
  offer: {
    images: ["/memes/offer.jpg"],
    confetti: true,
    sound: "/memes/cha-ching.mp3",
  },
  rejected: {
    images: [
      "/memes/rejection.jpg",
      "/memes/rejection2.jpg",
      "/memes/rejection3.jpg",
    ],
    confetti: false,
    sound: "/memes/faah.mp3",
  },
};

export interface MemePick {
  src: string;
  confetti: boolean;
  sound?: string;
}

/** Last image shown per stage, so a stage with more than one option (only
 * "rejected" has that today) never repeats the same one twice in a row. */
const lastShownByStage = new Map<Stage, string>();

/** Picks a random image for the stage (rejection has three), or `null` for
 * a stage with no configured meme. */
export function pickMemeForStage(stage: Stage): MemePick | null {
  const config = MEME_CONFIG[stage];
  if (!config || config.images.length === 0) return null;

  const last = lastShownByStage.get(stage);
  const pool =
    config.images.length > 1 && last
      ? config.images.filter((src) => src !== last)
      : config.images;

  const src = pool[Math.floor(Math.random() * pool.length)];
  lastShownByStage.set(stage, src);
  return { src, confetti: config.confetti, sound: config.sound };
}

export function hasMemeForStage(stage: Stage): boolean {
  return Boolean(MEME_CONFIG[stage]);
}
