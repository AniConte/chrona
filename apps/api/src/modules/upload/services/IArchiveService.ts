import yauzl from "yauzl";

export interface ExtractedFile {
	path: string;
	originalName: string;
}

export interface IArchiveService {
	openZip(path: string): Promise<yauzl.ZipFile>;

	openEntryStream(zip: yauzl.ZipFile, entry: yauzl.Entry): Promise<NodeJS.ReadableStream>;

	extractZip(zipPath: string, targetDirectory: string): Promise<ExtractedFile[]>;
}
