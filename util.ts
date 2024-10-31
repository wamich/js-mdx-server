import { Buffer } from "node:buffer";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

// 插入 injection.js
export function fixHtml(html: string) {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  const injection = document.createElement("script");
  injection.innerHTML = injectionScriptHtml;
  document.body.appendChild(injection);

  const modifiedHtml = dom.serialize();
  return modifiedHtml;
}

export const injectionScriptHtml = readFileSync(
  join(import.meta.dirname!, "injection.js")
).toString();
