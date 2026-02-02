declare module "node-rsa" {
  class NodeRSA {
    constructor(options?: { b?: number });
    setOptions(options: {
      encryptionScheme?: string;
      environment?: string;
    }): void;
    exportKey(format: string): string;
    encrypt(data: string, encoding?: string): string;
    decrypt(buffer: Buffer, encoding: string): string;
  }
  export = NodeRSA;
}
