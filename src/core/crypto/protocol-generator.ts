export interface ProtocolGenerator {
  generate(value: number, mask: string): string;
}