import { fileTypeFromFile } from "file-type";
import { inject, injectable } from "inversify";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { IDENTIFIERS } from "../../../shared/di/config.js";
import type { IArchiveService } from "./IArchiveService.js";
import type { IImageService } from "./IImageService.js";
import type { InputFile, IUploadService, UploadedImage } from "./IUploadService.js";

@injectable()
class UploadService implements IUploadService {
	constructor(
		@inject(IDENTIFIERS.ArchiveService) private archiveService: IArchiveService,
		@inject(IDENTIFIERS.ImageService) private imageService: IImageService
	) {}

	async processUploads(files: InputFile[], batchDirectory: string): Promise<UploadedImage[]> {
		const extractedDirectory = join(batchDirectory, "extracted");

		const processedDirectory = join(batchDirectory, "processed");

		await mkdir(extractedDirectory, {
			recursive: true,
		});

		await mkdir(processedDirectory, {
			recursive: true,
		});

		const images: InputFile[] = [];

		for (const file of files) {
			const type = await fileTypeFromFile(file.filePath);
			if (!type) {
				await rm(file.filePath, { force: true });
				continue;
			}

			if (type.ext === "zip") {
				const archiveFiles = await this.archiveService.extractZip(file.filePath, extractedDirectory);

				await rm(file.filePath, { force: true });

				for (const archiveFile of archiveFiles) {
					const archiveFileType = await fileTypeFromFile(archiveFile.path);

					if (!archiveFileType || !this.imageService.isSupportedImage(archiveFileType.ext)) {
						await rm(archiveFile.path, { force: true });

						continue;
					}

					images.push({
						filePath: archiveFile.path,
						originalName: archiveFile.originalName,
					});
				}

				continue;
			}

			// Basic photo
			if (this.imageService.isSupportedImage(type.ext)) {
				images.push(file);
				continue;
			}

			// Delete the remaining files...
			await rm(file.filePath, { force: true });
		}

		const result: UploadedImage[] = [];

		for (const image of images) {
			const id = randomUUID();

			const outputPath = join(processedDirectory, `${id}.jpg`);

			try {
				const metadata = await this.imageService.normalizeImage(image.filePath, outputPath);

				result.push({
					id,
					originalName: basename(image.originalName), // extract xxx/sss/kfwa.pdf -> only name kfwa.pdf
					path: outputPath,
					...metadata,
				});
			} catch (error) {
				// Just skip if something happened
			} finally {
				// Delete the source after normalization
				await rm(image.filePath, {
					force: true,
				});
			}
		}

		return result;
	}
}

export default UploadService;
