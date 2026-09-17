import type { IImageService } from "./modules/upload/services/IImageService.js";
import { IDENTIFIERS } from "./shared/di/config.js";
import container from "./shared/di/identifiers.js";

console.log("hello, world!");
const ImageService = container.get<IImageService>(IDENTIFIERS.ImageService);
