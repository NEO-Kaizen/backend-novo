import crypto from "node:crypto";
import type { ProtocolGenerator } from "../../core/crypto/protocol-generator.ts";

// Alfabeto Base32 de Crockford (32 caracteres, sem I, L, O, U)
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const MASK_20_BITS = 0xfffffn; // 2^20 - 1

export class FeistelProtocolGenerator implements ProtocolGenerator {
  constructor(private readonly secret: string) {}

  generate(value: number, mask: string): string {
    const maxDomain = 2n ** 40n;
    let val = BigInt(value);
    if (val < 0n || val >= maxDomain) {
      throw new Error(`Contador fora do limite de 40 bits: ${value}`);
    }

    // Cifra de Feistel equilibrada (20 bits na esquerda, 20 bits na direita = 40 bits)
    let left = (val >> 20n) & MASK_20_BITS;
    let right = val & MASK_20_BITS;

    // 4 rounds de Feistel
    for (let round = 0; round < 4; round++) {
      const roundKey = `${this.secret}:${round}`;
      const hash = crypto.createHmac("sha256", roundKey).update(right.toString()).digest();
      const f = BigInt(hash.readUInt32BE(0)) & MASK_20_BITS;

      const newLeft = right;
      const newRight = (left ^ f) & MASK_20_BITS;

      left = newLeft;
      right = newRight;
    }

    const obfuscated = (left << 20n) | right;

    // Converte 40 bits para 8 caracteres Base32 (5 bits cada: 8 * 5 = 40)
    let encoded = "";
    let temp = obfuscated;
    for (let i = 0; i < 8; i++) {
      const index = Number(temp & 0x1fn);
      encoded = CROCKFORD_ALPHABET[index] + encoded;
      temp >>= 5n;
    }

    const part1 = encoded.slice(0, 4);
    const part2 = encoded.slice(4, 8);

    return `${mask}-${part1}-${part2}`;
  }
}