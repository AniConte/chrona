export const MB = 1024 * 1024;
export const GB = 1024 * MB;

export const PIXELS_8K = 33_117_600;

export const uploadConfig = {
	// Max file count
	maxMultipartFiles: 1000,

	// Max input file size
	maxInputFileSize: 50 * MB,

	// After unpacking
	maxArchiveFiles: 1000,
	maxArchiveUncompressedSize: 2 * GB,

	// 1 image in archive
	maxArchiveEntrySize: 50 * MB,

	// Normalized img for AI
	maxImageDimension: 2048,
	targetImageSize: 2 * MB,

	// Compressing
	jpegQuality: 85,
};
