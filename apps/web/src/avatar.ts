export type AvatarStyle = {
  initials: string;
  backgroundColor: string;
  color: string;
};

function hashString(input: string): number {
  let h = 2166136261; // FNV-1a-ish
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getInitials(fullName: string, fallback?: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const letters =
    parts.length >= 2
      ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`
      : parts.length === 1
        ? `${parts[0][0] ?? ''}${parts[0][1] ?? ''}`
        : `${fallback?.[0] ?? ''}${fallback?.[1] ?? ''}`;

  return letters.toUpperCase() || '??';
}

export function avatarFromSeed(seed: string, fullName: string): AvatarStyle {
  const h = hashString(seed);
  const hue = h % 360;
  const sat = 70;
  const light = 42 + (h % 12); // 42-53

  return {
    initials: getInitials(fullName, seed),
    backgroundColor: `hsl(${hue} ${sat}% ${light}%)`,
    color: '#fff'
  };
}

