/** Default ISO currency for a tenant region (used before org API load, e.g. registration). */
export function currencyForRegion(
  region: string | null | undefined,
): string {
  const r = String(region || '')
    .trim()
    .toUpperCase();
  const map: Record<string, string> = {
    INDIA: 'INR',
    UAE: 'AED',
    SAUDI: 'SAR',
    OMAN: 'OMR',
    KUWAIT: 'KWD',
    BAHRAIN: 'BHD',
    QATAR: 'QAR',
  };
  return map[r] || 'AED';
}
