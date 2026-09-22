/**
 * Reusable helper function to format large numbers cleanly with a mandatory '+' suffix:
 * - < 1,000: Show exact number with '+' (e.g., 14+, 450+, 850+)
 * - 1,000 to 999,999: Show in 'K' format with '+' (e.g., 1.2K+, 50K+)
 * - 1,000,000+: Show in 'M' format with '+' (e.g., 1.2M+)
 */
export function formatNumber(num: number | undefined | null): string {
  if (typeof num !== "number" || isNaN(num) || num <= 0) return "0+";

  if (num < 1000) {
    return `${num.toLocaleString()}+`;
  }

  if (num < 1000000) {
    const kVal = (num / 1000).toFixed(1).replace(/\.0$/, "");
    return `${kVal}K+`;
  }

  const mVal = (num / 1000000).toFixed(1).replace(/\.0$/, "");
  return `${mVal}M+`;
}

export default formatNumber;
