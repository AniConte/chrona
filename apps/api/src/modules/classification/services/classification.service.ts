import { readFile } from "fs/promises";
import { inject, injectable } from "inversify";
import { IDENTIFIERS } from "../../../shared/di/config.js";
import type { IOllamaService } from "../../ollama/services/IOllamaService.js";
import type { UploadedImage } from "../../upload/services/IUploadService.js";
import type {
	ClassificationMode,
	ClassificationResult,
	IClassificationService,
	RankedImage,
	StageOneClassification,
} from "./IClassificationService.js";

interface StageOneModelResponse {
	summary: string;

	childPresent: boolean;
	estimatedChildAgeMonths: number | null;

	estimatedYear: number | null;

	chronologyHints: string[];

	confidence: number;
}

interface StageTwoModelResponse {
	ranking: number[];
}

const CLASSIFICATION_CONCURRENCY = 1;

@injectable()
class ClassificationService implements IClassificationService {
	constructor(@inject(IDENTIFIERS.OllamaService) private ollamaService: IOllamaService) {}

	private getStageOnePrompt(mode: ClassificationMode): string {
		if (mode === "child_age") {
			return `
Analyze this photograph independently.

The goal - is to later sort many photographs by the apparent age of the main child.

Estimate only what can reasonably be inferred from the image.

Return JSON exactly in this structure:

{
    "summary": "short visual description",
    "childPresent": true,
    "estimatedChildAgeMonths": 24,
    "estimatedYear": null,
    "chronologyHints": [],
    "confidence": 0.8
}

Rules:

- estimatedChildAgeMonths must be a number or null.
- If no child is visible, use null.
- Do not invent exact age if evidence is insuffient.
- confidence must be between 0 and 1.
- Do not use information from other photographs.
`.trim();
		}

		return `
Analyze this photograph independently.

The goal - is to later reconstruct chronological order across many photographs.

Extract visual evidence useful for chronology.

Return JSON exactly in this structure:
{
    "summary": "short visual description",
    "childPresent": true,
    "estimatedChildAgeMonths": 24,
    "estimatedYear": null,
    "chronologyHints": [
        "winter clothing",
        "child appears approximately two years old"
    ],
    "confidence": 0.7
}

Rules:

- estimatedChildAgeMonths must be a number or null.
- estimatedYear must be a number only when there is meaningful visual evidence, otherwise null.
- chronologyHints must contain only observable chronology-related clues.
- confidence must be between 0 and 1.
- Analyze this image independently.
        `.trim();
	}

	private normalizeConfidence(value: unknown): number {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return 0;
		}

		return Math.min(1, Math.max(0, value));
	}

	private async classifyOne(image: UploadedImage, mode: ClassificationMode): Promise<StageOneClassification> {
		const imageBuffer = await readFile(image.path);

		const systemMessage = `
You are a computer vision analysis component.
Return valid JSON only.
Do not add markdown.
Do not add explanations outside JSON.
`.trim();

		const response = await this.ollamaService.chatJson<StageOneModelResponse>({
			system: systemMessage,
			prompt: this.getStageOnePrompt(mode),
			images: [imageBuffer],
			think: false,
			numPredict: 256,
		});

		return {
			imageId: image.id,
			originalName: image.originalName,

			summary: typeof response.summary === "string" ? response.summary : "",
			childPresent: response.childPresent === true,

			estimatedChildAgeMonths:
				typeof response.estimatedChildAgeMonths === "number" ? response.estimatedChildAgeMonths : null,

			estimatedYear: typeof response.estimatedYear === "number" ? response.estimatedYear : null,

			chronologyHints: Array.isArray(response.chronologyHints)
				? response.chronologyHints.filter((value): value is string => typeof value === "string")
				: [],

			confidence: this.normalizeConfidence(response.confidence),
		};
	}

	private async mapWithConcurrency<T, R>(
		items: T[],
		concurrency: number,
		handler: (item: T, index: number) => Promise<R>
	): Promise<R[]> {
		const result = new Array<R>(items.length);

		let index = 0;

		const worker = async () => {
			while (true) {
				const currentIndex = index++;

				if (currentIndex >= items.length) {
					return;
				}

				const item = items[currentIndex] as T;

				console.log(`Worker handle #${currentIndex}`);

				result[currentIndex] = await handler(item, currentIndex);
			}
		};

		await Promise.all(
			Array.from(
				{
					length: Math.min(concurrency, items.length),
				},
				worker
			)
		);

		return result;
	}

	private buildStageTwoPrompt(mode: ClassificationMode, stageOne: StageOneClassification[]): string {
		const criterion =
			mode === "child_age"
				? `
Sort from youngest child to oldest child.

Use estimatedChildAgeMonths as the primary signal.
Use summary, chronologyHints and confidence only to resolve uncertain or close estimates.
`
				: `
Sort from chronologically earliest photograph to latest photograph.

Use estimated years, apparent child age, visual chronology hints, seasons, clothing, environment and other useful temporal evidence.
`;

		const input = stageOne.map((item, index) => ({
			index,
			estimatedChildAgeMonths: item.estimatedChildAgeMonths,
			summary: item.summary,
			chronologyHints: item.chronologyHints,
			confidence: item.confidence,
		}));

		return `
You are performing the second stage of photo ordering.

The photographs have already been analyzed independently.

${criterion}

Input:

${JSON.stringify(input)}

Return JSON exactly:

{
    "ranking": [3, 0, 2, 1]
}

Rules:

- ranking contains ONLY indexes from the input.
- Every input index must appear exactly once.
- Do not repeat indexes.
- Do not omit indexes.
- Do not invent indexes.
- ranking must contain exactly ${stageOne.length} numbers.
- First element represents the youngest/earliest photograph.
- Return JSON only.
`.trim();
	}

	private validateRanking(stageOne: StageOneClassification[], response: StageTwoModelResponse): RankedImage[] {
		if (!Array.isArray(response.ranking)) {
			throw new Error("INVALID_STAGE_TWO_RESPONSE");
		}

		if (response.ranking.length !== stageOne.length) {
			throw new Error(`STAGE_TWO_INVALID_LENGTH: expected=${stageOne.length}, received=${response.ranking.length}`);
		}

		const seenIndexes = new Set<number>();

		const result: RankedImage[] = [];

		for (let rank = 0; rank < response.ranking.length; rank++) {
			const imageIndex = response.ranking[rank];

			if (typeof imageIndex !== "number" || !Number.isInteger(imageIndex)) {
				throw new Error(`STAGE_TWO_INVALID_INDEX: ${imageIndex}`);
			}

			if (imageIndex < 0 || imageIndex >= stageOne.length) {
				throw new Error(`STAGE_TWO_UNKNOWN_INDEX: ${imageIndex}`);
			}

			if (seenIndexes.has(imageIndex)) {
				throw new Error(`STAGE_TWO_DUPLICATE_INDEX: ${imageIndex}`);
			}

			seenIndexes.add(imageIndex);

			const image = stageOne[imageIndex];

			if (!image) {
				throw new Error(`STAGE_TWO_IMAGE_NOT_FOUND: ${imageIndex}`);
			}

			result.push({
				imageId: image.imageId,

				rank,

				confidence: image.confidence,
			});
		}

		return result;
	}

	async classify(images: UploadedImage[], mode: ClassificationMode): Promise<ClassificationResult> {
		if (images.length === 0) {
			throw new Error("NO_IMAGES_TO_CLASSIFY");
		}

		/**
		 * Stage 1:
		 *
		 * Every img is analyzed independently.
		 */
		const stageOne = await this.mapWithConcurrency(images, CLASSIFICATION_CONCURRENCY, (image) =>
			this.classifyOne(image, mode)
		);

		const classifiable =
			mode === "child_age"
				? stageOne.filter((item) => item.childPresent && item.estimatedChildAgeMonths !== null)
				: stageOne;

		const excluded: { imageId: string; reason: string }[] =
			mode === "child_age"
				? stageOne
						.filter((item) => !item.childPresent || item.estimatedChildAgeMonths === null)
						.map((x) => ({
							imageId: x.imageId,
							reason: !x.childPresent ? "NO_CHILD_DETECTED" : "AGE_NOT_DETERMINED",
						}))
				: [];

		/**
		 * Stage 2:
		 *
		 * Ollama sees only Stage 1 structured results
		 * and produces the global ordering
		 */
		let ranking: RankedImage[] = [];

		if (classifiable.length === 0) {
			ranking = [];
		} else if (classifiable.length === 1) {
			const image = classifiable[0]!;

			ranking = [
				{
					imageId: image.imageId,
					rank: 0,
					confidence: image.confidence,
				},
			];
		} else {
			const systemMessage = `
You are a photo ordering engine.
Return valid JSON only.
`.trim();

			console.log(`[ AI ] Stage 2 started.`);

			const stageTwo = await this.ollamaService.chatJson<StageTwoModelResponse>({
				system: systemMessage,
				prompt: this.buildStageTwoPrompt(mode, classifiable),
				think: true,
				// numPredict: 8192,
			});

			console.log(`[ AI ] Stage 2 response`, JSON.stringify(stageTwo, null, 2));

			ranking = this.validateRanking(classifiable, stageTwo);
		}

		return {
			mode,
			stageOne,
			ranking,
			excluded,
			createdAt: new Date().toISOString(),
		};
	}
}

export default ClassificationService;
