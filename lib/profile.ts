export const MAX_AVATAR_LENGTH = 160000;
export const SOCIAL_PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'GitHub', 'TikTok', 'YouTube', 'X', 'Website'] as const;
export type SocialLink = { platform: string; url: string };
export type ProfileInput = { name: string; bio: string; interests: string[]; slogan: string; socials: SocialLink[]; avatar: string };
export class ProfileError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new ProfileError('PROFILE_INVALID');
  return value.trim();
}
export function validateProfile(value: unknown): ProfileInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProfileError('PROFILE_INVALID');
  const b = value as Record<string, unknown>;
  const name = text(b.name, 80, true), bio = text(b.bio, 1000), slogan = text(b.slogan, 180);
  if (!Array.isArray(b.interests) || b.interests.length > 12) throw new ProfileError('PROFILE_INVALID');
  const interests = [...new Set(b.interests.map(x => text(x, 40, true)))];
  if (!Array.isArray(b.socials) || b.socials.length > 8) throw new ProfileError('PROFILE_INVALID');
  const socials = b.socials.map(item => {
    if (!item || typeof item !== 'object' || !SOCIAL_PLATFORMS.includes(item.platform)) throw new ProfileError('PROFILE_LINK_INVALID');
    const raw = text(item.url, 500, true);
    let url: URL;
    try { url = new URL(raw); } catch { throw new ProfileError('PROFILE_LINK_INVALID'); }
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) throw new ProfileError('PROFILE_LINK_INVALID');
    return { platform: item.platform as string, url: url.href };
  });
  if (typeof b.avatar !== 'string' || b.avatar.length > MAX_AVATAR_LENGTH) throw new ProfileError('PROFILE_IMAGE_INVALID');
  if (b.avatar) {
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(b.avatar);
    if (!match || match[2].length % 4 !== 0) throw new ProfileError('PROFILE_IMAGE_INVALID');
    const bytes = Buffer.from(match[2], 'base64');
    const valid = match[1] === 'jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid || bytes.length < 16) throw new ProfileError('PROFILE_IMAGE_INVALID');
  }
  return { name, bio, slogan, interests, socials, avatar: b.avatar };
}
