import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../../',import.meta.url));
export const buildPath=path=>resolve(process.env.LEGENDS_BUILD_DIR||resolve(project,'build'),path);
