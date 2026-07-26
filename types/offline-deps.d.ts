/// <reference path="./offline-prisma.d.ts" />

declare namespace NodeJS {
  interface ProcessEnv { [key: string]: string | undefined }
  interface ReadableStream extends AsyncIterable<any> {}
}
declare const process: { env: NodeJS.ProcessEnv; pid: number; exitCode?: number; cwd(): string; exit(code?: number): never; on(event: string, listener: (...args: any[]) => void): void };
declare class Buffer extends Uint8Array {
  static from(input: any, encoding?: string): Buffer;
  static concat(list: readonly Uint8Array[]): Buffer;
  static alloc(size: number): Buffer;
  static isBuffer(value: unknown): value is Buffer;
  equals(other: Uint8Array): boolean;
  subarray(start?: number, end?: number): Buffer;
  toString(encoding?: string): string;
}
declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): any;

declare module 'react' {
  export type Key = string | number;
  export type ReactNode = any;
  export type PropsWithChildren<P = unknown> = P & { children?: ReactNode };
  export interface HTMLAttributes<T> { children?: ReactNode; className?: string; [key: string]: any }
  export interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> { type?: 'button'|'submit'|'reset'; disabled?: boolean }
  export interface InputHTMLAttributes<T> extends HTMLAttributes<T> { type?: string; name?: string; value?: any; defaultValue?: any; required?: boolean }
  export interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> { name?: string; value?: any; defaultValue?: any; required?: boolean }
  export function useState<S>(initial: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T;
  const React: any;
  export default React;
}
declare namespace React { type ReactNode = import('react').ReactNode }
declare namespace JSX {
  type Element = any;
  interface ElementClass { render: any }
  interface ElementAttributesProperty { props: {} }
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes { key?: import('react').Key }
  interface IntrinsicElements { [elemName: string]: any }
}

declare module 'next/link' { const Link: any; export default Link; }
declare module 'next/navigation' {
  export function redirect(path: string): never;
  export function notFound(): never;
  export function useRouter(): any;
  export function usePathname(): string;
  export function useSearchParams(): any;
}
declare module 'next/headers' {
  export function cookies(): Promise<any>;
  export function headers(): Promise<any>;
}
declare module 'next/server' {
  export class NextRequest extends Request { nextUrl: URL; cookies: any }
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse;
    static next(init?: any): NextResponse;
    cookies: any;
  }
}

declare module 'node:crypto' {
  export function createHash(algorithm: string): any;
  export function createCipheriv(...args: any[]): any;
  export function createDecipheriv(...args: any[]): any;
  export function randomBytes(size: number): Buffer;
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
  export function randomUUID(): string;
  export function scryptSync(...args: any[]): Buffer;
}
declare module 'node:fs' { export const promises: any; export function createReadStream(path: string): any; export function createWriteStream(path: string): any; }
declare module 'node:path' { const path: any; export default path; export = path; }
declare module 'node:stream' { export class Readable implements AsyncIterable<any> { static fromWeb(stream: any): any; static from(input: any): any; [Symbol.asyncIterator](): AsyncIterator<any> } export class PassThrough extends Readable {} }

declare module '@aws-sdk/client-s3' {
  export class S3Client { constructor(config?: any); send(command: any): Promise<any> }
  export class PutObjectCommand { constructor(input: any) }
  export class GetObjectCommand { constructor(input: any) }
  export class DeleteObjectCommand { constructor(input: any) }
  export class HeadObjectCommand { constructor(input: any) }
}
declare module '@aws-sdk/s3-request-presigner' { export function getSignedUrl(...args: any[]): Promise<string> }
declare module 'archiver' { const archiver: any; export default archiver }
declare module 'argon2' { const argon2: any; export default argon2; export const argon2id: any }
declare module 'clsx' { export type ClassValue = any; export function clsx(...inputs: ClassValue[]): string }
declare module 'tailwind-merge' { export function twMerge(...inputs: string[]): string }
declare module 'docx' { export const Document: any; export const Packer: any; export const Paragraph: any; export const TextRun: any; export const Table: any; export const TableRow: any; export const TableCell: any; export const WidthType: any; export const AlignmentType: any; export const HeadingLevel: any; }
declare module 'exceljs' { const ExcelJS: any; export default ExcelJS }
declare module 'jose' { export const SignJWT: any; export function jwtVerify(...args: any[]): Promise<any> }
declare module 'playwright-core' { export const chromium: any }
declare module 'qrcode' { const QRCode: any; export default QRCode }
declare module 'unzipper' { const unzipper: any; export default unzipper; export const Open: any; export interface Entry { path: string; type: string; buffer(): Promise<Buffer> } }
declare module 'zod' { export const z: any; export namespace z { type infer<T> = any } }
