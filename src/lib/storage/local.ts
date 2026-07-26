import { promises as fs } from 'node:fs'; import path from 'node:path'; import type {StorageProvider} from './types'; import {env} from '../env';
export class LocalStorageProvider implements StorageProvider{
  private path(key:string){const normalized=key.replace(/^\/+/, ''); if(normalized.includes('..'))throw new Error('Chave inválida'); return path.resolve(env.LOCAL_STORAGE_PATH,normalized);}
  async put(key:string,data:Buffer){const p=this.path(key);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,data)}
  async get(key:string){return fs.readFile(this.path(key))} async delete(key:string){await fs.rm(this.path(key),{force:true})}
  async signedUrl(key:string){return `/api/files/local?key=${encodeURIComponent(key)}`} async exists(key:string){try{await fs.access(this.path(key));return true}catch{return false}}
}
