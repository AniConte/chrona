import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { injectable } from "inversify";
import { dirname } from "path";
import yazl from "yazl";
import type { ClassificationResult } from "../../classification/services/IClassificationService.js";
import type { UploadedImage } from "../../upload/services/IUploadService.js";
import type { IExportService } from "./IExportService.js";

@injectable()
class ExportService implements IExportService {
	constructor() {}
	async createOrderedArchive(
		images: UploadedImage[],
		result: ClassificationResult,
		outputPath: string
	): Promise<string> {
		await mkdir(dirname(outputPath), { recursive: true });

		const imagesById = new Map(images.map((img) => [img.id, img]));

		const ranking = [...result.ranking].sort((a, b) => a.rank - b.rank);

		const digits = Math.max(3, String(ranking.length).length);

		const zip = new yazl.ZipFile();

		const outputStream = createWriteStream(outputPath);

		const completed = new Promise<void>((resolve, reject) => {
			outputStream.once("close", resolve);

			outputStream.once("error", reject);

			zip.outputStream.once("error", reject);
		});

		zip.outputStream.pipe(outputStream);

		for (const rankedImage of ranking) {
			const image = imagesById.get(rankedImage.imageId);
			if (!image) {
				throw new Error(`RANKED_IMAGE_NOT_FOUND: ${rankedImage.imageId}`);
			}

			const index = rankedImage.rank + 1;

			const fileName = `IMG_${String(index).padStart(digits, "0")}.jpg`;

			zip.addFile(image.path, fileName, { compress: false }); // img already compressed
		}

		for (const excluded of result.excluded) {
			const image = imagesById.get(excluded.imageId);
			if (!image) {
				continue;
			}

			zip.addFile(image.path, `unclassified/${image.originalName}`, {
				compress: false,
			});
		}

		zip.end();

		await completed;

		return outputPath;
	}
}

export default ExportService;
