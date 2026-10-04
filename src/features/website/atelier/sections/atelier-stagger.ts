/** A group rises with a 60ms stagger, capped at 400ms in total (plan §4). */
export const stagger = (index: number): number => Math.min(index * 60, 400);
