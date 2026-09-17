import { Container } from "inversify";
import ArchiveService from "../../modules/upload/services/archive.service.js";
import ImageService from "../../modules/upload/services/image.service.js";
import UploadService from "../../modules/upload/services/upload.service.js";
import { IDENTIFIERS } from "./config.js";

const container = new Container();

container.bind(IDENTIFIERS.ImageService).to(ImageService).inSingletonScope();
container.bind(IDENTIFIERS.ArchiveService).to(ArchiveService).inSingletonScope();
container.bind(IDENTIFIERS.UploadService).to(UploadService).inSingletonScope();

export default container;
