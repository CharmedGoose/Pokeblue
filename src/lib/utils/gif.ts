import { GIF_MAX_TOTAL_FRAMES, GIF_ACCEPTABLE_REMAINDER } from "#config";
import { roundToNearestEven } from "#lib/utils/math";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";

export interface GIFs {
	gifInfo: GIFInfo;
	x: number;
	y: number;
	width?: number;
	height?: number;
	widthMultiplier?: number;
	heightMultiplier?: number;
	bottomCenterPivot?: boolean;
}

interface GIFInfo {
	frameCount: number;
	width: number;
	height: number;
	path: string;
}

export async function fetchGIFInfo(url: string): Promise<GIFInfo> {
	const response = await fetch(url);
	const responseBuffer = Buffer.from(await response.arrayBuffer());

	const path = join(tmpdir(), `${Bun.randomUUIDv7()}.gif`);
	await Bun.write(path, responseBuffer);

	const getFrameCountProcess = $`ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 ${path}`;
	const getWidthProcess = $`ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=noprint_wrappers=1:nokey=1 ${path}`;
	const getHeightProcess = $`ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=noprint_wrappers=1:nokey=1 ${path}`;

	const frameCount = await getFrameCountProcess.text();
	const width = await getWidthProcess.text();
	const height = await getHeightProcess.text();

	return { frameCount: parseInt(frameCount), width: parseInt(width), height: parseInt(height), path };
}

export async function createGIF(
	width: number,
	height: number,
	gifs: GIFs[],
	backgroundPath: string,
): Promise<ArrayBuffer> {
	const tmpPath = await mkdtemp(join(tmpdir(), "gif-"));
	const outputGIFPath = join(tmpPath, "output.gif");

	const frameCounts = gifs.map((gif) => roundToNearestEven(gif.gifInfo.frameCount));
	const maxFrames = Math.max(...frameCounts);

	let multiplier = 1;
	while (multiplier * maxFrames < GIF_MAX_TOTAL_FRAMES) {
		const workingWell = frameCounts.every((count) => {
			const remainder = (multiplier * maxFrames) % count;
			return (
				remainder === 0 ||
				remainder / count < GIF_ACCEPTABLE_REMAINDER ||
				(count - remainder) / count < GIF_ACCEPTABLE_REMAINDER
			);
		});

		if (workingWell) break;
		multiplier++;
	}

	if (multiplier * maxFrames >= GIF_MAX_TOTAL_FRAMES) {
		multiplier = Math.floor(GIF_MAX_TOTAL_FRAMES / maxFrames);
		if (multiplier < 1) multiplier = 1;
	}

	const totalFrames = multiplier * maxFrames;

	const paletteString =
		"[s0]palettegen=reserve_transparent=1:stats_mode=full[p];[s1][p]paletteuse=new=1:alpha_threshold=128";

	for (let i = 0; i < gifs.length; i++) {
		const gif = gifs[i];
		const gifMultiplier = Math.round(totalFrames / gif.gifInfo.frameCount);

		await Bun.spawn({
			cmd: [
				"ffmpeg",
				"-v",
				"error",
				"-stream_loop",
				`${gifMultiplier - 1}`,
				"-i",
				gif.gifInfo.path,
				"-filter_complex",
				`split[s0][s1];${paletteString}`,
				join(tmpPath, `${i}.gif`),
			],
		}).exited;

		await Bun.file(gif.gifInfo.path).delete();
	}

	const gifInputArray = [];
	let scaleString = `[0:v]scale=${width}:${height}:flags=neighbor[g0]`;
	let gifOverlayString = "";

	for (let i = 0; i < gifs.length; i++) {
		const gif = gifs[i];

		const gifWidth = gif.width ? gif.width : gif.widthMultiplier ? gif.gifInfo.width * gif.widthMultiplier : 1;
		const gifHeight = gif.height
			? gif.height
			: gif.heightMultiplier
				? gif.gifInfo.height * gif.heightMultiplier
				: 1;

		const gifX = gif.bottomCenterPivot ? gif.x - gifWidth / 2 : gif.x;
		const gifY = gif.bottomCenterPivot ? gif.y - gifHeight : gif.y;

		gifInputArray.push("-i", join(tmpPath, `${i}.gif`));

		scaleString += `;[${i + 1}:v]scale=${gifWidth}:${gifHeight}:flags=neighbor[g${i + 1}]`;

		if (gifs.length === 1) {
			gifOverlayString = `[g0][g1]overlay=${gifX}:${gifY},split[s0][s1]`;
			break;
		}

		if (i === 0) {
			gifOverlayString = `[g0][g${i + 1}]overlay=${gifX}:${gifY}[bg${i + 1}]`;
		} else if (i === gifs.length - 1) {
			gifOverlayString += `;[bg${i}][g${i + 1}]overlay=${gifX}:${gifY}:shortest=1,split[s0][s1]`;
		} else {
			gifOverlayString += `;[bg${i}][g${i + 1}]overlay=${gifX}:${gifY}[bg${i + 1}]`;
		}
	}

	await Bun.spawn({
		cmd: [
			"ffmpeg",
			"-v",
			"error",
			"-i",
			backgroundPath,
			...gifInputArray,
			"-filter_complex",
			`${scaleString};${gifOverlayString};${paletteString}`,
			outputGIFPath,
		],
	}).exited;

	const output = await Bun.file(outputGIFPath).arrayBuffer();
	await rm(tmpPath, { recursive: true, force: true });

	return output;
}
