export interface MajorityVoteOptions<T> {
  n: number;
  keyOf: (result: T) => string;
}

/**
 * Run `call` N times sequentially and return the most common result, keyed by `keyOf`.
 * Ties are broken by returning the FIRST occurrence in call order.
 */
export async function majorityVote<T>(
  call: () => Promise<T>,
  opts: MajorityVoteOptions<T>,
): Promise<T> {
  if (opts.n < 1) throw new Error("majorityVote: n must be >= 1");
  const results: T[] = [];
  for (let i = 0; i < opts.n; i++) results.push(await call());

  const counts = new Map<string, number>();
  const firstByKey = new Map<string, T>();
  for (const r of results) {
    const k = opts.keyOf(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (!firstByKey.has(k)) firstByKey.set(k, r);
  }

  let bestKey = "";
  let bestCount = -1;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      bestKey = k;
    }
  }
  return firstByKey.get(bestKey)!;
}
