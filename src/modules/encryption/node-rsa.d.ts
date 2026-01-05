declare module "node-rsa" {
  interface NodeRSAOptions {
    b?: number;
  }

  interface NodeRSASetOptions {
    encryptionScheme?: string;
    environment?: string;
  }

  export default class NodeRSA {
    constructor(options?: NodeRSAOptions);
    setOptions(options: NodeRSASetOptions): void;
    exportKey(format: string): string;
    decrypt(buffer: Buffer, encoding: BufferEncoding): string;
  }
}
