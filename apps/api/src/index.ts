import type { IArchiveService } from "./modules/archive/services/IArchiveService.js";
import type { IImageService } from "./modules/image/services/IImageService.js";
import type { IOllamaService } from "./modules/ollama/services/IOllamaService.js";
import type { IStorageService } from "./modules/storage/services/IStorageService.js";
import { IDENTIFIERS } from "./shared/di/config.js";
import container from "./shared/di/identifiers.js";

console.log("hello, world!");
const imageService = container.get<IImageService>(IDENTIFIERS.ImageService);
const archiveService = container.get<IArchiveService>(IDENTIFIERS.ArchiveService);
const storageService = container.get<IStorageService>(IDENTIFIERS.StorageService);
const ollamaService = container.get<IOllamaService>(IDENTIFIERS.OllamaService);
