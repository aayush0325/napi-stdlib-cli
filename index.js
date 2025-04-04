#!/usr/bin/env node

const fs = require("fs");
const generate_addon = require("./utils/generate_addon");
const pkg = require("./package.json");
const args = process.argv.slice(2);

function displayHelp() {
  console.log(`
Usage: napi-stdlib-cli <sourceFile> <headerFile>

Arguments:
  <sourceFile>   The source file to generate the addon from.
  <headerFile>   The header file to generate the addon from.

Examples:
  napi-stdlib-cli source.c header.h
  napi-stdlib-cli --help
  napi-stdlib-cli --version
`);
}

if (args.length === 0) {
  console.log(
    "Welcome to napi-stdlib-cli! Use 'napi-stdlib-cli --help' for usage information.",
  );
} else if (args.length === 1 && args[0] === "--help") {
  displayHelp();
} else if (args.length === 1 && args[0] === "--version") {
  console.log(`${pkg.version}`);
} else if (args.length === 2) {
  const sourceFile = args[0];
  const headerFile = args[1];

  fs.readFile(sourceFile, "utf8", (err, sourceData) => {
    if (err) {
      console.error(`Error: File '${sourceFile}' not found.`);
      process.exit(1);
    }

    fs.readFile(headerFile, "utf8", (headerErr, headerData) => {
      if (headerErr) {
        console.error(`Error: File '${headerFile}' not found.`);
        process.exit(1);
      }

      try {
        generate_addon(sourceFile, sourceData, headerFile, headerData);
        console.log("Addon generation completed successfully!");
      } catch (e) {
        console.error(`Error during addon generation: ${e.message}`);
        process.exit(1);
      }
    });
  });
} else {
  console.error("Error: Invalid arguments.");
  console.log("Use 'napi-stdlib-cli --help' for usage information.");
  process.exit(1);
}
