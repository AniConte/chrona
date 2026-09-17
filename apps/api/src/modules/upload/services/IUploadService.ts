export interface UploadedImage {
	id: string;
	originalName: string;
	path: string;

	width: number;
	height: number;
	size: number;

	mimeType: "image/jpeg";
}

export interface InputFile {
	filePath: string;
	originalName: string;
}

export interface IUploadService {
	processUploads(files: InputFile[], batchDirectory: string): Promise<UploadedImage[]>;
}
