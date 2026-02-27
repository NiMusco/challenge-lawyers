import { avatarFromSeed } from '../avatar';

export function AvatarCircle(props: { seed: string; fullName: string; size?: number }) {
  const a = avatarFromSeed(props.seed, props.fullName);
  const size = props.size ?? 36;

  return (
    <div
      aria-label={`Avatar ${props.fullName}`}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: a.backgroundColor,
        color: a.color,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 800,
        fontSize: Math.max(12, Math.floor(size * 0.4)),
        userSelect: 'none'
      }}
    >
      {a.initials}
    </div>
  );
}

