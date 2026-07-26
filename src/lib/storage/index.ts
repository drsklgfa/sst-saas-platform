import {env} from '../env'; import {LocalStorageProvider} from './local'; import {S3StorageProvider} from './s3';
export const storage=env.STORAGE_DRIVER==='s3'?new S3StorageProvider():new LocalStorageProvider();
