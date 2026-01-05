declare module "word-extractor" {
  interface ExtractedDocument {
    getBody(): string;
    getHeaders(): string[];
    getFooters(): string[];
    getFootnotes(): string[];
    getEndnotes(): string[];
    getAnnotations(): string[];
  }

  class WordExtractor {
    constructor();
    extract(input: Buffer | string): Promise<ExtractedDocument>;
  }

  export = WordExtractor;
}
