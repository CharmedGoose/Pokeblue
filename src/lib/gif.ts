import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { container } from "@sapphire/framework";
import { streamToBuffer } from "#lib/stream";
import { lcm } from "#lib/math";
import gifFrames, { type GifFrameReadableStream } from "gif-frames";
import sharp from "sharp";

const FRAME_SKIP = 3;
const DELAY = (5 * FRAME_SKIP).toString();

export interface GIFs {
	frames: GifFrameReadableStream[];
	x: number;
	y: number;
	width?: number;
	height?: number;
	widthMultiplier?: number;
	heightMultiplier?: number;
	bottomCenterPivot?: boolean;
}

export async function decodeGIFFramesFromURL(
	url: string,
): Promise<GifFrameReadableStream[]> {
	const response = await fetch(url);
	const responseBuffer = Buffer.from(await response.arrayBuffer());

	const tmpPath = join(tmpdir(), `${Bun.randomUUIDv7()}.gif`);
	await Bun.write(tmpPath, responseBuffer);

	const gifsicle = Bun.spawn({
		cmd: ["gifsicle", "--batch", "--unoptimize", tmpPath],
		stdout: null,
	});
	if ((await gifsicle.exited) != 0) {
		throw new Error(new TextDecoder().decode(gifsicle.stderr));
	}

	const gif = await gifFrames({
		url: Buffer.from(await Bun.file(tmpPath).arrayBuffer()),
		frames: "all",
		outputType: "png",
	});

	await Bun.file(tmpPath).delete();

	return gif;
}

export async function createGIF(
	width: number,
	height: number,
	gifs: GIFs[],
	background?: string,
): Promise<ArrayBuffer> {
	const tmpPath = await mkdtemp(join(tmpdir(), "gif-"));

	const totalTime = Date.now();

	const roundedToEvenFrames = gifs.map(
		(gif) => 2 * Math.round(gif.frames.length / 2),
	);
	const totalFrames = Math.floor(lcm(roundedToEvenFrames) / FRAME_SKIP);

	const currentFrames: number[] = Array(gifs.length).fill(0);

	let image;
	if (background) {
		image = sharp(background).resize(width, height, { kernel: "nearest" });
	} else {
		image = sharp({
			create: {
				width,
				height,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			},
		});
	}

	container.logger.debug(`Creating GIF with ${totalFrames} frames`);
	let time = Date.now();

	for (let frame = 0; frame < totalFrames; frame++) {
		if (process.env.DEBUG) {
			process.stdout.write(`\rFrame: ${frame + 1}/${totalFrames}`);
		}

		const currentImage = image.clone();

		const imagesToDraw: Promise<sharp.OverlayOptions>[] = [];

		for (let i = 0; i < gifs.length; i++) {
			const gif = gifs[i];
			const currentFrame = gif.frames[currentFrames[i]];

			imagesToDraw.push(drawFrame(currentFrame, gif));

			currentFrames[i] += FRAME_SKIP;
			if (currentFrames[i] >= gif.frames.length) {
				currentFrames[i] = 0;
			}
		}

		const paddedFrame = frame.toString().padStart(4, "0");
		await currentImage
			.composite(await Promise.all(imagesToDraw))
			.toFile(join(tmpPath, `${paddedFrame}.gif`));
	}

	if (process.env.DEBUG) {
		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
	}

	container.logger.debug(`Frames created in ${Date.now() - time}ms`);
	container.logger.debug("Encoding GIF");
	time = Date.now();

	const outputGIFPath = join(tmpPath, "output.gif");

	const gif = Bun.spawn({
		cmd: [
			"gifsicle",
			`--delay=${DELAY}`,
			"--disposal=background",
			join(tmpPath, "*.gif"),
			"--colors=128",
			"--optimize=3",
			"--lossy=200",
			"--no-extensions",
			"--no-comments",
			"--output",
			outputGIFPath,
		],
		stdout: null,
	});
	if ((await gif.exited) != 0) {
		throw new Error(new TextDecoder().decode(gif.stderr));
	}

	container.logger.debug(`GIF encoded in ${Date.now() - time}ms`);

	const output = await Bun.file(outputGIFPath).arrayBuffer();
	await rm(tmpPath, { recursive: true, force: true });

	container.logger.debug(`GIF created in ${Date.now() - totalTime}ms`);

	return output;
}

async function drawFrame(
	frame: GifFrameReadableStream,
	gif: GIFs,
): Promise<sharp.OverlayOptions> {
	const GIFWidth = gif.width
		? gif.width
		: gif.widthMultiplier
			? gif.frames[0].frameInfo.width * gif.widthMultiplier
			: 1;
	const GIFHeight = gif.height
		? gif.height
		: gif.heightMultiplier
			? gif.frames[0].frameInfo.height * gif.heightMultiplier
			: 1;

	const image = await streamToBuffer(frame.getImage());

	if (!image || image.length === 0) {
		return {
			input: Buffer.alloc(0),
			left: 0,
			top: 0,
		};
	}

	return {
		input: await sharp(image)
			.resize(GIFWidth, GIFHeight, { fit: "inside", kernel: "nearest" })
			.toBuffer(),
		left: gif.x - (gif.bottomCenterPivot ? GIFWidth / 2 : 0),
		top: gif.y - (gif.bottomCenterPivot ? GIFHeight : 0),
	};
}

export function getPublicGIFURL(gif: string): string {
	return new URL(`./images/${gif}`, new URL(process.env.S3_PUBLIC_URL!)).href;
}

export async function createStarterGIF(): Promise<string> {
	if (await Bun.s3.exists("images/starters.gif")) {
		return getPublicGIFURL("starters.gif");
	}

	const bulbasaurFrames = await decodeGIFFramesFromURL(
		"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif",
	);
	const charmanderFrames = await decodeGIFFramesFromURL(
		"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/4.gif",
	);
	const squirtleFrames = await decodeGIFFramesFromURL(
		"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif",
	);

	const gifBuffer = await createGIF(
		1000,
		500,
		[
			{
				frames: bulbasaurFrames,
				x: 250,
				y: 450,
				widthMultiplier: 4,
				heightMultiplier: 4,
				bottomCenterPivot: true,
			},
			{
				frames: charmanderFrames,
				x: 500,
				y: 450,
				widthMultiplier: 4,
				heightMultiplier: 4,
				bottomCenterPivot: true,
			},
			{
				frames: squirtleFrames,
				x: 750,
				y: 450,
				widthMultiplier: 4,
				heightMultiplier: 4,
				bottomCenterPivot: true,
			},
		],
		"./src/assets/starterBackground.jpg",
	);

	await Bun.s3.write("images/starters.gif", gifBuffer);

	return getPublicGIFURL("starters.gif");
}
