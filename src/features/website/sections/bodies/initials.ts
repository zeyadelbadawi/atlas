/** Up to two initials of a name, in the name's own script ("Mariam Adel" → "MA", "مريم عادل" → "مع"). */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}
