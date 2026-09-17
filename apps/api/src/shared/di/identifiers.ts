import { Container } from "inversify";
import ArchiveService from "../../modules/upload/services/archive.service.js";
import ImageService from "../../modules/upload/services/image.service.js";
import { IDENTIFIERS } from "./config.js";

const container = new Container();

container.bind(IDENTIFIERS.ImageService).to(ImageService).inSingletonScope();
container.bind(IDENTIFIERS.ArchiveService).to(ArchiveService).inSingletonScope();

export default container;
