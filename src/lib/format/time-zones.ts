const FALLBACK_TIME_ZONES = [
  'UTC',
  'Europe/Kyiv',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Warsaw',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
];

export const listTimeZones = (current: string): string[] => {
  const supported =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_TIME_ZONES;

  return supported.includes(current) ? [...supported] : [current, ...supported];
};
