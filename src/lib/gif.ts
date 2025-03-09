import { mkdtemp, readFile, rm } from "node:fs/promises";
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
	const buffer = Buffer.from(await response.arrayBuffer());

	const tmpPath = join(tmpdir(), `${Bun.randomUUIDv7()}.gif`);
	await Bun.write(tmpPath, buffer);

	const gifsicle = Bun.spawn({
		cmd: ["gifsicle", "-b", "--unoptimize", tmpPath],
		stdout: null,
	});

	if ((await gifsicle.exited) != 0) {
		throw new Error(new TextDecoder().decode(gifsicle.stderr));
	}

	const gif = await gifFrames({
		url: await readFile(tmpPath),
		frames: "all",
		outputType: "png",
	});

	await rm(tmpPath, { recursive: true, force: true });

	return gif;
}

export async function createGIF(
	width: number,
	height: number,
	gifs: GIFs[],
	bg?: string,
): Promise<Buffer> {
	const tmpPath = await mkdtemp(join(tmpdir(), "gif-"));

	const totalTime = Date.now();

	const roundedFrames = gifs.map(
		(gif) => 2 * Math.round(gif.frames.length / 2),
	);
	const totalFrames = Math.floor(lcm(roundedFrames) / FRAME_SKIP);

	const currentFrames: number[] = Array(gifs.length).fill(0);

	const image = sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	});

	container.logger.debug(`Creating GIF with ${totalFrames} frames`);
	let time = Date.now();

	for (let frame = 0; frame < totalFrames; frame++) {
		if (container.debug) {
			process.stdout.write(`\rFrame: ${frame + 1}/${totalFrames}`);
		}

		const currentImage = image.clone();

		const images: Promise<sharp.OverlayOptions>[] = [];

		for (let i = 0; i < gifs.length; i++) {
			const gif = gifs[i];
			const currentFrame = gif.frames[currentFrames[i]];

			images.push(drawFrame(currentFrame, gif));

			currentFrames[i] += FRAME_SKIP;
			if (currentFrames[i] >= gif.frames.length) {
				currentFrames[i] = 0;
			}
		}

		const paddedFrame = frame.toString().padStart(4, "0");
		await currentImage
			.composite(await Promise.all(images))
			.toFile(join(tmpPath, `${paddedFrame}.gif`));
	}

	if (container.debug) {
		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
	}

	container.logger.debug(`Frames created in ${Date.now() - time}ms`);
	container.logger.debug("Encoding GIF");
	time = Date.now();

	const outputPath = join(tmpPath, "output.gif");

	const gif = Bun.spawn({
		cmd: [
			"gifsicle",
			`--delay=${DELAY}`,
			"--disposal=background",
			join(tmpPath, "*.gif"),
			"--loop=0",
			"--colors=256",
			"--output",
			outputPath,
		],
		stdout: null,
	});

	if ((await gif.exited) != 0) {
		throw new Error(new TextDecoder().decode(gif.stderr));
	}

	container.logger.debug(`GIF encoded in ${Date.now() - time}ms`);
	container.logger.debug("Adding background to GIF");
	time = Date.now();

	if (bg) {
		const background = await sharp(bg)
			.resize(width, height, { kernel: "nearest" })
			.toBuffer();

		const overlayedGif = await overlayGIF(
			background,
			await readFile(outputPath),
		);
		await overlayedGif.toFile(outputPath);
	}

	container.logger.debug(`Background finished, took ${Date.now() - time}ms`);

	container.logger.debug("Optimizing GIF");
	time = Date.now();

	const optimized = Bun.spawn({
		cmd: [
			"gifsicle",
			"--batch",
			"--optimize=2",
			"--lossy=100",
			"--colors=256",
			"--no-app-extensions",
			"--no-comments",
			outputPath,
		],
		stdout: null,
	});

	if ((await optimized.exited) != 0) {
		throw new Error(new TextDecoder().decode(optimized.stderr));
	}

	container.logger.debug(`GIF optimized in ${Date.now() - time}ms`);

	const output = await readFile(outputPath);
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

export async function overlayGIF(
	background: Buffer,
	gifOverlay: Buffer,
): Promise<sharp.Sharp> {
	const overlay = sharp(gifOverlay, { animated: true });
	const metadata = await overlay.metadata();
	const backgroundImage = sharp(background).resize(
		metadata.width,
		metadata.pageHeight,
		{
			kernel: "nearest",
		},
	);
	const imageRoll = backgroundImage.extend({
		bottom: (metadata.pageHeight || 0) * ((metadata.pages || 0) - 1),
		extendWith: "repeat",
	});
	const result = imageRoll
		.composite([
			{
				input: await overlay.toBuffer(),
				animated: true,
			},
		])
		.gif({
			progressive: metadata.isProgressive,
			delay: metadata.delay,
			loop: metadata.loop,
		});
	return result;
}
