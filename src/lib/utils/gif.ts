import { container } from "@sapphire/framework";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PokemonGenerationStarters } from "#lib/pokemon";
import { getLowestTotalGIFFrames, lcm } from "#lib/utils/math";
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
	const getHeightProcess = $`ffprobe -v warning  -select_streams v:0 -show_entries stream=height -of default=noprint_wrappers=1:nokey=1 ${path}`;

	const frameCount = await getFrameCountProcess.text();
	const width = await getWidthProcess.text();
	const height = await getHeightProcess.text();

	return { frameCount: parseInt(frameCount), width: parseInt(width), height: parseInt(height), path };
}

export async function createGIF(width: number, height: number, gifs: GIFs[], backgroundPath: string): Promise<string> {
	const tmpPath = await mkdtemp(join(tmpdir(), "gif-"));
	const outputGIFPath = join(tmpPath, "output.gif");

	const totalFrames = getLowestTotalGIFFrames(gifs.map((gif) => gif.gifInfo.frameCount));

	for (let i = 0; i < gifs.length; i++) {
		const gif = gifs[i];
		const gifMultiplier = Math.round(totalFrames / gif.gifInfo.frameCount);
		const gifMultiplierString = Array.from({ length: gifMultiplier }, (_, i) => `[${i + 1}]`).join("");

		await Bun.spawn({
			cmd: [
				"ffmpeg",
				`-f`,
				"gif",
				"-i",
				gif.gifInfo.path,
				"-filter_complex",
				`[0:v]split=${Math.round(gifMultiplier)}${gifMultiplierString};${gifMultiplierString}concat=n=${gifMultiplier}:v=1:a=0`,
				join(tmpPath, i + ".gif"),
			],
		}).exited;
	}

	let gifInputString = "";
	let gifOverlayString = "";

	for (let i = 0; i < gifs.length; i++) {
		const gif = gifs[i];

		const gifWidth = gif.width ? gif.width : gif.widthMultiplier ? gif.gifInfo.width * gif.widthMultiplier : 1;
		const gifHeight = gif.height ? gif.height : gif.heightMultiplier ? gif.gifInfo.width * gif.heightMultiplier : 1;

		const gifX = gif.bottomCenterPivot ? gif.x - gifWidth / 2 : gif.x;
		const gifY = gif.bottomCenterPivot ? gif.y - gifHeight : gif.y;

		if (i === 0) {
			gifOverlayString = `[0][${i + 1}]overlay=${gifX}:${gifY}[bg${i + 1}]`;
		} else {
			gifOverlayString += `;[bg${i}][${i + 1}]overlay=${gifX}:${gifY}[bg${i + 1}]`;
		}

		gifInputString += `-i ${join(tmpPath, `${i}.gif`)} `;
	}

	Bun.spawn({
		cmd: [
			"ffmpeg",
			"-i",
			backgroundPath,
			...gifInputString.split(" "),
			"-filter_complex",
			gifOverlayString,
			"-y",
			outputGIFPath,
		],
	})

	return outputGIFPath;
}
