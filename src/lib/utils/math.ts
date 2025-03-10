import { GIF_FRAME_SKIP } from "#config";

export function gcd(a: number, b: number): number {
	if (!b) return b === 0 ? a : NaN;
	return gcd(b, a % b);
}
export function lcm(array: number[]): number {
	let n = 1;
	for (let i = 0; i < array.length; ++i) n = lcm2(array[i], n);
	return n;
}
export function lcm2(a: number, b: number): number {
	return (a * b) / gcd(a, b);
}

export function getLowestTotalGIFFrames(gifLengths: number[]): number {
	const roundedFrames = [];
	for (let i = 1; i < 11; i++) {
		roundedFrames.push(
			gifLengths.map((length) => Math.round(length / i) * i),
		);
	}

	const totalFrames = [];
	for (let i = 0; i < roundedFrames.length; i++) {
		totalFrames.push(Math.floor(lcm(roundedFrames[i]) / GIF_FRAME_SKIP));
	}

	return Math.min(...totalFrames);
}
