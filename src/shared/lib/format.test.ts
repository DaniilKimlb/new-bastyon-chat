/**
 * Tests for date/time formatting utilities.
 */
import { describe, it, expect } from "vitest";
import { formatDate, formatDuration } from "./format";

describe("formatDate", () => {
  it("returns 'Today' for today's date", () => {
    expect(formatDate(new Date())).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDate(yesterday)).toBe("Yesterday");
  });

  it("returns formatted date for older dates", () => {
    const old = new Date("2023-06-15");
    const result = formatDate(old);
    // Should contain month and day (not "Today" or "Yesterday")
    expect(result).not.toBe("Today");
    expect(result).not.toBe("Yesterday");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatDuration", () => {
  it("formats 0 seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats seconds less than a minute", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats exact minutes", () => {
    expect(formatDuration(120)).toBe("2:00");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1:30");
  });

  it("pads single-digit seconds", () => {
    expect(formatDuration(61)).toBe("1:01");
  });
});
