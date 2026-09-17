export type SupportedImageType = "jpg" | "png" | "heic";

export interface IImageService {
	detectImageType(path: string): Promise<SupportedImageType | null>;
	convertHeicToJpeg(input: Buffer): Promise<Buffer>;

	/**
	 * Compressing / encoding jpeg
	 * @param input
	 * @param width
	 * @param quality
	 */
	encodeJpeg(input: Buffer, width: number, quality: number): Promise<Buffer>;

	compressImage(input: Buffer): Promise<Buffer>;

	normalizeImage(inputPath: string, outputPath: string): Promise<any>;
}
