declare module '*';
declare var process: any;
declare class Buffer extends Uint8Array {
  static from(input: any, encoding?: string): Buffer;
  static concat(list: readonly Uint8Array[]): Buffer;
  static alloc(size: number): Buffer;
  equals(other: Uint8Array): boolean;
  subarray(start?: number, end?: number): Buffer;
  toString(encoding?: string): string;
}
declare namespace NodeJS { interface ReadableStream extends AsyncIterable<any> {} }
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }
declare namespace React { type ReactNode = any; }
