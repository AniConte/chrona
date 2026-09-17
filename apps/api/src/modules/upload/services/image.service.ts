import { fileTypeFromFile } from "file-type";
import heicConvert from "heic-convert";
import { injectable } from "inversify";
import { readFile, stat, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { PIXELS_8K, uploadConfig } from "../../../config/upload.js";
import type { IImageService, SupportedImageType } from "./IImageService.js";

export const IMAGE_TYPES = new Set(["jpg", "png", "heic"]);

@injectable()
class ImageService implements IImageService {
	constructor() {}

	async detectImageType(path: string): Promise<SupportedImageType | null> {
		const type = await fileTypeFromFile(path);

		if (!type) {
			return null;
		}

		if (!IMAGE_TYPES.has(type.ext)) {
			return null;
		}

		return type.ext as SupportedImageType;
	}

	async convertHeicToJpeg(input: Buffer): Promise<Buffer> {
		const output = await heicConvert({
			buffer: input,
			format: "JPEG",
			quality: uploadConfig.jpegQuality,
		});

		return Buffer.from(output);
	}

	async encodeJpeg(input: Buffer, width: number, quality: number): Promise<Buffer> {
		return sharp(input, {
			// Protect against high-resolution image threats
			limitInputPixels: PIXELS_8K,
		})
			.autoOrient()
			.resize({
				width, // max width
				height: width, // max height
				fit: "inside", // without crop and stretch
				withoutEnlargement: true, // if img has smaller size
			})
			.jpeg({
				quality,
				mozjpeg: true, // smart mozilla compressing (5-15% less weight)
			})
			.toBuffer();
	}

	async compressImage(input: Buffer): Promise<Buffer> {
		const attempts: { dimension: number; quality: number }[] = [
			{ dimension: 2048, quality: 85 },
			{ dimension: 2048, quality: 78 },
			{ dimension: 1800, quality: 80 },
			{ dimension: 1600, quality: 80 },
			{ dimension: 1400, quality: 78 },
		];

		let smallest: Buffer | null = null;

		for (const attempt of attempts) {
			const output = await this.encodeJpeg(input, attempt.dimension, attempt.quality);

			if (!smallest || output.length < smallest.length) {
				smallest = output;
			}

			if (output.length <= uploadConfig.targetImageSize) {
				return output;
			}
		}

		if (!smallest || smallest.length > uploadConfig.targetImageSize) {
			throw new Error("Compressed image notsize more than target");
		}

		return smallest;
	}

	async normalizeImage(
		inputPath: string,
		outputPath: string
	): Promise<{
		width: number;
		height: number;
		size: number;
		mimeType: string;
	}> {
		const type = await this.detectImageType(inputPath);
		if (!type) {
			throw new Error("UNSUPPORTED_IMAGE_TYPE");
		}

		const stats = await stat(inputPath);
		if (stats.size > uploadConfig.maxInputFileSize) {
			throw new Error("IMAGE_TOO_LARGE");
		}

		let input = await readFile(inputPath);

		if (type === "heic") {
			input = Buffer.from(await this.convertHeicToJpeg(input));
		}

		const output = await this.compressImage(input);

		await writeFile(outputPath, output);

		const metadata = await sharp(output).metadata();

		return {
			width: metadata.width,
			height: metadata.height,
			size: output.length,
			mimeType: "image/jpeg" as const,
		};
	}
}

export default ImageService;
