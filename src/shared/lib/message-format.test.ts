/**
 * Tests for message content parsing (links, mentions).
 */
import { describe, it, expect } from "vitest";
import { parseMessage } from "./message-format";

describe("parseMessage", () => {
  it("returns single text segment for plain text", () => {
    const segments = parseMessage("Hello world");
    expect(segments).toEqual([{ type: "text", content: "Hello world" }]);
  });

  it("detects HTTP links", () => {
    const segments = parseMessage("Visit https://example.com today");
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ type: "text", content: "Visit " });
    expect(segments[1]).toEqual({ type: "link", content: "https://example.com", href: "https://example.com" });
    expect(segments[2]).toEqual({ type: "text", content: " today" });
  });

  it("auto-prefixes www links with https", () => {
    const segments = parseMessage("Go to www.example.com");
    const link = segments.find(s => s.type === "link");
    expect(link).toBeDefined();
    expect((link as any).href).toBe("https://www.example.com");
  });

  it("handles multiple links", () => {
    const text = "Link1: https://a.com Link2: https://b.com";
    const links = parseMessage(text).filter(s => s.type === "link");
    expect(links).toHaveLength(2);
  });

  it("handles empty string", () => {
    const segments = parseMessage("");
    expect(segments).toEqual([{ type: "text", content: "" }]);
  });

  it("preserves text between and around links", () => {
    const segments = parseMessage("before https://url.com after");
    expect(segments[0]).toEqual({ type: "text", content: "before " });
    expect(segments[2]).toEqual({ type: "text", content: " after" });
  });
});
