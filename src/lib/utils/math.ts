export function roundToNearestEven(value: number): number {
	return Math.round(value / 2) * 2;
}

export function randomNumber(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1) + min);
}
