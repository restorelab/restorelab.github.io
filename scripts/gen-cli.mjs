#!/usr/bin/env node
// Generates src/content/docs/reference/cli.md from the restorelab binary.
//
// The command tree is discovered by parsing the `Available Commands:` section
// of every `--help` output, so the page follows the binary instead of a list
// kept in sync by hand.
//
// Usage:
//   node scripts/gen-cli.mjs            write the page
//   node scripts/gen-cli.mjs --check    compare only, exit 1 on a difference
//
// The binary is located through RESTORELAB_BIN, defaulting to a sibling
// checkout of the main repository.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const SITE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = resolve(SITE_ROOT, "src/content/docs/reference/cli.md");

const BANNER =
  "<!-- Generated from `restorelab --help` in github.com/restorelab/restorelab. Do not edit here. -->";

// Cobra adds these to every command tree; they document the shell, not
// RestoreLab, so they stay out of the reference.
const BUILTIN_COMMANDS = new Set(["help", "completion"]);

const MAX_DEPTH = 6;

// ---------------------------------------------------------------------------
// Binary discovery
// ---------------------------------------------------------------------------

function binaryPath() {
  const fromEnv = process.env.RESTORELAB_BIN;
  const fallback =
    process.platform === "win32"
      ? "../RestoreLab/bin/restorelab.exe"
      : "../RestoreLab/bin/restorelab";
  const candidate = resolve(SITE_ROOT, fromEnv || fallback);

  if (!existsSync(candidate)) {
    throw new Error(
      `restorelab binary not found at ${candidate}\n` +
        "Build it in the main repository first:\n" +
        "  go build -o bin/restorelab ./cmd/restorelab\n" +
        "or point RESTORELAB_BIN at an existing binary.",
    );
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Privacy scrubbing
//
// `--help` prints default paths taken from the machine it runs on. Nothing
// that identifies the developer's machine may reach the published page, so the
// home directory, the user name, the host name and the machine's own IP
// addresses are rewritten before anything is written to disk.
// ---------------------------------------------------------------------------

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localAddresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (!entry.internal && entry.address) addresses.push(entry.address);
    }
  }
  // Longest first, so 10.0.0.100 is not half-replaced by 10.0.0.10.
  return [...new Set(addresses)].sort((a, b) => b.length - a.length);
}

function scrub(text) {
  let out = text;

  // 1. The literal home directory, in either slash flavour.
  const home = os.homedir();
  if (home) {
    const variants = [home, home.replace(/\\/g, "/"), home.replace(/\//g, "\\")];
    for (const variant of variants) {
      out = out.replace(new RegExp(escapeRegExp(variant), "gi"), "~");
    }
  }

  // 2. Any remaining user-profile path, whoever the user is.
  out = out.replace(/[A-Za-z]:\\Users\\[^\\\s"'`,;:)\]]+/g, "~");
  out = out.replace(/\/(?:home|Users)\/[^/\s"'`,;:)\]]+/g, "~");

  // 3. The machine's own name and its own addresses. Loopback and
  //    documentation hosts are left alone: they are part of the documentation.
  const hostname = os.hostname();
  if (hostname && hostname.length > 2) {
    out = out.replace(new RegExp(escapeRegExp(hostname), "gi"), "<hostname>");
    const short = hostname.split(".")[0];
    if (short.length > 2) {
      out = out.replace(new RegExp(`\\b${escapeRegExp(short)}\\b`, "gi"), "<hostname>");
    }
  }
  for (const address of localAddresses()) {
    out = out.replace(new RegExp(escapeRegExp(address), "g"), "<local-ip>");
  }

  // 4. The user name on its own, in case it shows up outside a path.
  const user = os.userInfo().username;
  if (user && user.length > 2) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(user)}\\b`, "gi"), "<user>");
  }

  return out;
}

// ---------------------------------------------------------------------------
// Help capture and tree discovery
// ---------------------------------------------------------------------------

const failures = [];

function helpFor(bin, path) {
  // `--help` is the only invocation this script ever makes: several commands
  // (recovery test, cleanup, connect) are destructive when run for real.
  const result = spawnSync(bin, [...path, "--help"], {
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, NO_COLOR: "1" },
  });

  if (result.error) {
    failures.push({ path, reason: result.error.message });
    return null;
  }
  const output = (result.stdout || "") + (result.stderr || "");
  if (result.status !== 0) {
    failures.push({ path, reason: `exit code ${result.status}` });
  }
  const text = output.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trimEnd();
  if (!text) {
    failures.push({ path, reason: "empty output" });
    return null;
  }
  return text;
}

// Parses the `Available Commands:` block of a help output into
// [{ name, description }]. The block ends at the first blank line or the first
// line that is not indented, which is the next section header.
function parseSubcommands(help) {
  const lines = help.split("\n");
  const start = lines.findIndex((line) => /^Available Commands:\s*$/.test(line));
  if (start === -1) return [];

  const found = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") break;
    if (!/^\s/.test(line)) break;
    const match = line.match(/^\s+(\S+)\s*(.*)$/);
    if (!match) continue;
    const [, name, description] = match;
    if (BUILTIN_COMMANDS.has(name)) continue;
    found.push({ name, description: description.trim() });
  }
  return found;
}

// Root description: everything before the `Usage:` block, as one line.
function rootDescription(help) {
  const head = help.split(/\n\s*Usage:\s*\n/)[0].trim();
  if (!head) return "";
  return head.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ").trim();
}

function discover(bin) {
  const commands = [];

  function walk(path, description, depth) {
    const help = helpFor(bin, path);
    if (help === null) return;

    commands.push({
      path,
      description: description || (path.length === 0 ? rootDescription(help) : ""),
      help,
    });

    if (depth >= MAX_DEPTH) return;
    for (const child of parseSubcommands(help)) {
      walk([...path, child.name], child.description, depth + 1);
    }
  }

  walk([], "", 0);
  return commands;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function render(commands) {
  const parts = [
    "---",
    "title: CLI reference",
    "sidebar:",
    "  order: 4",
    "---",
    "",
    BANNER,
    "",
    "Every command of the `restorelab` binary, with its own `--help` output.",
    "",
  ];

  for (const command of commands) {
    const heading = ["restorelab", ...command.path].join(" ");
    parts.push(`## ${heading}`, "");
    // Skip the lead line when the help output already opens with it, which is
    // the case for commands whose short and long descriptions are the same.
    const helpLead = command.help.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ").trim();
    if (command.description && command.description !== helpLead) {
      parts.push(command.description, "");
    }
    parts.push("```text", command.help, "```", "");
  }

  const body = parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  return scrub(`${body}\n`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const check = process.argv.slice(2).includes("--check");
  const bin = binaryPath();

  const commands = discover(bin);
  if (commands.length === 0) {
    throw new Error("no commands discovered; is the binary usable?");
  }

  const content = render(commands);

  if (check) {
    if (!existsSync(OUT_PATH)) {
      console.error(`${OUT_PATH} is missing. Run: npm run gen:cli`);
      process.exitCode = 1;
      return;
    }
    const current = readFileSync(OUT_PATH, "utf8").replace(/\r\n/g, "\n");
    if (current !== content) {
      console.error(`${OUT_PATH} is out of date with the binary. Run: npm run gen:cli`);
      process.exitCode = 1;
      return;
    }
    console.log(`cli.md is up to date (${commands.length} commands).`);
    return;
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, content, "utf8");
  for (const command of commands) {
    console.log(`  restorelab ${command.path.join(" ")}`.trimEnd());
  }
  console.log(`${commands.length} commands written to ${OUT_PATH}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(
      `--help failed for "restorelab ${failure.path.join(" ")}": ${failure.reason}`,
    );
  }
  process.exitCode = 1;
}
