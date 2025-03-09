import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { Stream } from "node:stream";
import { container } from "@sapphire/framework";
import gifFrames, { type GifFrameReadableStream } from "gif-frames";
import sharp from "sharp";

const FRAME_SKIP = 3;

export interface GIFS {
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
	const buffer = await response.arrayBuffer();
	const gif = await gifFrames({
		url: Buffer.from(buffer),
		frames: "all",
		outputType: "png",
	});
	return gif;
}

export async function createGIF(
	width: number,
	height: number,
	gifs: GIFS[],
	bg?: string,
): Promise<Buffer> {
	const totalTime = Date.now();

	const roundedFrames = gifs.map(
		(gif) => 2 * Math.round(gif.frames.length / 2),
	);
	const totalFrames = lcm(roundedFrames);

	const currentFrames: number[] = Array(gifs.length).fill(0);

	const image = sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	});

	container.logger.debug(
		`Creating GIF with ${totalFrames / FRAME_SKIP} frames`,
	);

	let time = Date.now();

	const encoder = GIFEncoder();

	for (let frame = 0; frame < totalFrames / FRAME_SKIP; frame++) {
		container.logger.debug(
			`Creating frame ${frame + 1}/${totalFrames / FRAME_SKIP}`,
		);

		const currentImage = image.clone();

		const images = gifs.map(async (gif, i) => {
			const currentFrame = gif.frames[currentFrames[i]];

			currentFrames[i] += FRAME_SKIP;

			if (currentFrames[i] >= gif.frames.length) {
				currentFrames[i] = 0;
			}

			const currentGIFWidth = gif.width
				? gif.width
				: gif.widthMultiplier
					? gif.frames[0].frameInfo.width * gif.widthMultiplier
					: 1;
			const currentGIFHeight = gif.height
				? gif.height
				: gif.heightMultiplier
					? gif.frames[0].frameInfo.height * gif.heightMultiplier
					: 1;

			const gifFrame = await sharp(
				await streamToBuffer(currentFrame.getImage()),
			)
				.resize(currentGIFWidth, currentGIFHeight, { fit: "inside" })
				.toBuffer();

			return {
				input: gifFrame,
				left: gif.x - (gif.bottomCenterPivot ? currentGIFWidth / 2 : 0),
				top: gif.y - (gif.bottomCenterPivot ? currentGIFHeight : 0),
			};
		});

		currentImage.composite(await Promise.all(images));

		const data = Uint8ClampedArray.from(
			await currentImage.raw().toBuffer(),
		);
		const palette = quantize(data, 256);
		const index = applyPalette(data, palette);

		encoder.writeFrame(index, width, height, {
			palette,
			transparent: true,
			delay: 50 * FRAME_SKIP,
		});

		container.logger.debug(
			`Frame ${frame + 1}/${totalFrames / FRAME_SKIP} finished`,
		);
	}

	encoder.finish();

	container.logger.debug(`Frames created in ${Date.now() - time}ms`);

	container.logger.debug("Adding background to GIF");

	time = Date.now();

	let result: Buffer = Buffer.from(encoder.bytes());

	if (bg) {
		const output = await overlayGif(
			await sharp(bg).resize(width, height).toBuffer(),
			result,
		);
		result = await output.toBuffer();
	}

	container.logger.debug(
		`Background finished, took ${Date.now() - time}ms\nGIF created in ${Date.now() - totalTime}ms`,
	);

	return result;
}

async function overlayGif(
	background: Buffer,
	gifOverlay: Buffer,
): Promise<sharp.Sharp> {
	const overlay = sharp(gifOverlay, { animated: true });
	const metadata = await overlay.metadata();
	const backgroundImg = sharp(background).resize(
		metadata.width,
		metadata.pageHeight,
	);
	const imgRoll = backgroundImg.extend({
		bottom: (metadata.pageHeight || 0) * ((metadata.pages || 0) - 1),
		extendWith: "repeat",
	});
	const result = imgRoll
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

async function streamToBuffer(stream: Stream): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const buffer: Uint8Array[] = [];

		stream.on("data", (chunk) => buffer.push(chunk));
		stream.on("end", () => resolve(Buffer.concat(buffer)));
		stream.on("error", (err) => reject(err));
	});
}

function gcd(a: number, b: number) {
	if (!b) return b === 0 ? a : NaN;
	return gcd(b, a % b);
}
function lcm2(a: number, b: number) {
	return (a * b) / gcd(a, b);
}
function lcm(array: number[]) {
	let n = 1;
	for (let i = 0; i < array.length; ++i) n = lcm2(array[i], n);
	return n;
}
