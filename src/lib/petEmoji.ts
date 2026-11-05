const EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶', lizard: '🦎', snake: '🐍', bird: '🐦', hamster: '🐹' };

/** Decorative icon for a pet type; unknown types (the API lets clinics add their own) get a paw. */
export const petEmoji = (typeName: string): string => EMOJI[typeName.toLowerCase()] ?? '🐾';
