/**
 * Tests for the core hex encoding/decoding and Matrix ID functions.
 *
 * These are the MOST critical functions in the app — a bug here breaks:
 * - User identity (who sent a message)
 * - Encryption key lookup (decryptKey uses hex-encoded sender)
 * - Avatar resolution (Pocketnet API needs raw address)
 * - Typing indicators, reactions, read receipts
 */
import { describe, it, expect } from "vitest";
import { hexEncode, hexDecode, getmatrixid, getmatrixidFA, Base64 } from "./functions";

// Real Bastyon addresses from production
const BASTYON_ADDRESSES = [
  "PPbNqCweFnTePQyXWR21B9jXWCiDJa2yYu",
  "PHxLqCwAG4s2G9DmNHHWxMXXm77EkzqJUf",
  "P9hB2dZ7YLfDGGBDYRwn6u38AQ6cNg12Rx",
];

describe("hexEncode", () => {
  it("encodes ASCII strings to hex", () => {
    expect(hexEncode("A")).toBe("41");
    expect(hexEncode("AB")).toBe("4142");
    expect(hexEncode("abc")).toBe("616263");
  });

  it("encodes a real Bastyon address deterministically", () => {
    const hex = hexEncode("PPbNqCweFnTePQyXWR21B9jXWCiDJa2yYu");
    // Must be lowercase hex of ASCII codes
    expect(hex).toMatch(/^[0-9a-f]+$/);
    // Each char → 2 hex digits, so length doubles
    expect(hex.length).toBe("PPbNqCweFnTePQyXWR21B9jXWCiDJa2yYu".length * 2);
  });

  it("handles empty string", () => {
    expect(hexEncode("")).toBe("");
  });
});

describe("hexDecode", () => {
  it("decodes hex back to ASCII", () => {
    expect(hexDecode("41")).toBe("A");
    expect(hexDecode("4142")).toBe("AB");
    expect(hexDecode("616263")).toBe("abc");
  });

  it("handles empty string", () => {
    expect(hexDecode("")).toBe("");
  });
});

describe("hexEncode ↔ hexDecode roundtrip", () => {
  it("roundtrips for all real Bastyon addresses", () => {
    for (const addr of BASTYON_ADDRESSES) {
      const encoded = hexEncode(addr);
      const decoded = hexDecode(encoded);
      expect(decoded).toBe(addr);
    }
  });

  it("roundtrips for alphanumeric strings", () => {
    const strings = ["hello", "Test123", "0x00FF", "ABCDEFGHIJKLMNOP"];
    for (const s of strings) {
      expect(hexDecode(hexEncode(s))).toBe(s);
    }
  });

  it("hexEncode output is always lowercase hex for ASCII input", () => {
    for (const addr of BASTYON_ADDRESSES) {
      const hex = hexEncode(addr);
      expect(hex).toMatch(/^[0-9a-f]+$/);
    }
  });
});

describe("getmatrixid", () => {
  it("strips @ prefix and :server suffix from Matrix user ID", () => {
    expect(getmatrixid("@username:matrix.server.com")).toBe("username");
  });

  it("handles bare hex-encoded address (no @ or :)", () => {
    const hex = hexEncode("PPbNqCweFnTePQyXWR21B9jXWCiDJa2yYu");
    expect(getmatrixid(hex)).toBe(hex);
  });

  it("handles full Matrix ID with hex-encoded address", () => {
    const hex = hexEncode("PPbNqCweFnTePQyXWR21B9jXWCiDJa2yYu");
    const matrixId = `@${hex}:matrix.pocketnet.app`;
    expect(getmatrixid(matrixId)).toBe(hex);
  });

  it("returns empty string for null/undefined", () => {
    expect(getmatrixid(null)).toBe("");
    expect(getmatrixid(undefined)).toBe("");
    expect(getmatrixid("")).toBe("");
  });
});

describe("getmatrixidFA", () => {
  it("preserves @ prefix", () => {
    expect(getmatrixidFA("@username:server")).toBe("@username");
  });

  it("returns empty for null", () => {
    expect(getmatrixidFA(null)).toBe("");
  });
});

describe("Base64", () => {
  it("encodes and decodes ASCII text", () => {
    const text = "Hello, World!";
    expect(Base64.decode(Base64.encode(text))).toBe(text);
  });

  it("encodes and decodes JSON payloads (like encryption secrets)", () => {
    const json = JSON.stringify({ keys: "abc123", block: 42, v: 1 });
    expect(Base64.decode(Base64.encode(json))).toBe(json);
  });

  it("handles empty string", () => {
    expect(Base64.decode(Base64.encode(""))).toBe("");
  });
});
