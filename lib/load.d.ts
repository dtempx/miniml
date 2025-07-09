import { MinimlModel } from "./common.js";
export declare function createModel(obj: string | {}, file?: string): MinimlModel;
export declare function loadModel(file: string): Promise<MinimlModel>;
export declare function loadModelSync(file: string): MinimlModel;
