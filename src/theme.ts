export const colors = {
  // Surfaces — derived from the brand navy #2B2D41 (bg is a darker shade, card is the brand color).
  bg: '#1b1c29',
  card: '#2b2d41',
  cardAlt: '#343650',
  // Text — light greys from the palette.
  text: '#eeeeee',
  subtle: '#dedede',
  muted: '#9a9cb3',
  // Accents — palette reds. accent = bright (interactive), accentDeep/danger = deep red.
  accent: '#ff4949',
  accentDeep: '#c10000',
  danger: '#c10000',
  border: '#3a3c52',
  // Positive / progress highlight. No green in the palette, so we use the bright red
  // (PR-style "push it up") with a deep red-tinted surface behind it.
  success: '#ff4949',
  successBg: '#3a1620',
};

export const spacing = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

/** Poppins font families (loaded in App.tsx). On Android the family encodes the
 *  weight, so we set fontFamily instead of relying on fontWeight. */
export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
};
