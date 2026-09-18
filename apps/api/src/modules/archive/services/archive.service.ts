import { injectable } from "inversify";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import { GB, MB } from "../../../config/upload.js";
import type { ExtractedFile, IArchiveService } from "./IArchiveService.js";

const MAX_ZIP_SIZE = 1 * GB;
const MAX_ENTRY_SIZE = 50 * MB;
const MAX_TOTAL_UNCOMPRESSED_SIZE = 2 * GB;
const MAX_FILES = 1000;

@injectable()
class ArchiveService implements IArchiveService {
	constructor() {}

	async openZip(path: string): Promise<yauzl.ZipFile> {
		return yauzl.openPromise(path, {
			validateEntrySizes: true,
			lazyEntries: true,
		});
	}

	async openEntryStream(zip: yauzl.ZipFile, entry: yauzl.Entry): Promise<NodeJS.ReadableStream> {
		const stream = await zip.openReadStreamPromise(entry);
		return stream;
	}

	async extractZip(zipPath: string, targetDirectory: string): Promise<ExtractedFile[]> {
		const zipStats = await stat(zipPath);

		if (zipStats.size > MAX_ZIP_SIZE) {
			throw new Error("ZIP_TOO_LARGE");
		}

		await mkdir(targetDirectory, { recursive: true });

		const zip = await this.openZip(zipPath);

		const files: ExtractedFile[] = [];

		let fileCount = 0;
		let totalUncompressedSize = 0;

		// if(zip.fileSize )

		try {
			for await (const entry of zip.eachEntry()) {
				// Directory in the ZIP
				if (entry.fileName.endsWith("/")) {
					continue;
				}

				// Macos bullshit
				if (entry.fileName.startsWith("__MACOSX/") || entry.fileName.endsWith(".DS_Store")) {
					continue;
				}

				fileCount++;

				if (fileCount > MAX_FILES) {
					throw new Error("ZIP_TOO_MANY_FILES");
				}

				if (entry.uncompressedSize > MAX_ENTRY_SIZE) {
					throw new Error("ZIP_ENTRY_TOO_LARGE");
				}

				totalUncompressedSize += entry.uncompressedSize;

				if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
					throw new Error("ZIP_UNCOMPRESSED_SIZE_TOO_LARGE");
				}

				const id = randomUUID();

				const outputPath = join(targetDirectory, id);

				try {
					const stream = await zip.openReadStreamPromise(entry);

					await pipeline(stream, createWriteStream(outputPath));

					files.push({
						path: outputPath,
						originalName: entry.fileName,
					});
				} catch (error) {
					// If something happened, del entire file
					await rm(outputPath, {
						force: true,
					});

					throw error;
				}
			}

			return files;
		} finally {
			zip.close();
		}
	}
}

export default ArchiveService;
