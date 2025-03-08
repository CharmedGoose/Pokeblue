export function gcd(a: number, b: number): number {
	if (!b) return b === 0 ? a : NaN;
	return gcd(b, a % b);
}
export function lcm(array: number[]): number {
	let n = 1;
	for (let i = 0; i < array.length; ++i) n = lcm2(array[i], n);
	return n;
}
function lcm2(a: number, b: number): number {
	return (a * b) / gcd(a, b);
}
