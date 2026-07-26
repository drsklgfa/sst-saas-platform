declare module 'unzipper' {
  export interface Entry {
    path: string;
    type: 'File' | 'Directory' | string;
    buffer(): Promise<Buffer>;
  }

  export interface CentralDirectory {
    files: Entry[];
  }

  const unzipper: {
    Open: {
      buffer(input: Buffer | Uint8Array): Promise<CentralDirectory>;
    };
  };

  export default unzipper;
}
