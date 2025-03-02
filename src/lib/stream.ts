import { Stream } from "node:stream";

export async function streamToBuffer(stream: Stream): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const buffer: Uint8Array[] = [];

		stream.on("data", (chunk) => buffer.push(chunk));
		stream.on("end", () => resolve(Buffer.concat(buffer)));
		stream.on("error", (err) => reject(err));
	});
}
