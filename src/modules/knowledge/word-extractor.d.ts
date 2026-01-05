declare module "word-extractor" {
  class WordExtractor {
    constructor();
    extract(input: Buffer | string): Promise<{
      getBody(): string;
      getHeaders(): string[];
      getFooters(): string[];
      getFootnotes(): string[];
      getEndnotes(): string[];
      getAnnotations(): string[];
    }>;
  }
  export default WordExtractor;
}
