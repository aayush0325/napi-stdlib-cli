#!/usr/bin/env node

// Core Node.js modules
const fs = require("fs");

// Local utility modules
const generate_addon = require("./utils/generate_addon");

// Package metadata
const pkg = require("./package.json");

// Process command-line arguments, excluding 'node' and the script name
const args = process.argv.slice(2);

/**
 * Displays the help message for the CLI tool.
 */
function displayHelp() {
  console.log(`
Usage: napi-stdlib-cli <sourceFile> <headerFile>

Arguments:
  <sourceFile>   The C source file (.c) to generate the Node.js native addon from.
  <headerFile>   The C header file (.h) associated with the source file.

Examples:
  napi-stdlib-cli source.c header.h
  napi-stdlib-cli --help
  napi-stdlib-cli --version
`);
}

// Main logic for parsing arguments and executing commands
if (args.length === 0) {
  // No arguments provided, display welcome message
  console.log(
    "Welcome to napi-stdlib-cli! Use 'napi-stdlib-cli --help' for usage information.",
  );
} else if (args.length === 1 && args[0] === "--help") {
  // User requested help
  displayHelp();
} else if (args.length === 1 && args[0] === "--version") {
  // User requested version information
  console.log(`${pkg.version}`);
} else if (args.length === 2) {
  // Two arguments provided, assume they are source and header files
  const sourceFile = args[0];
  const headerFile = args[1];

  // Read the source file
  fs.readFile(sourceFile, "utf8", (err, sourceData) => {
    if (err) {
      console.error(
        `Error: Could not read source file '${sourceFile}'. Please ensure the file exists and is accessible.`,
      );
      process.exit(1);
    }

    // Read the header file
    fs.readFile(headerFile, "utf8", (headerErr, headerData) => {
      if (headerErr) {
        console.error(
          `Error: Could not read header file '${headerFile}'. Please ensure the file exists and is accessible.`,
        );
        process.exit(1);
      }

      // Attempt to generate the addon
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
  // Invalid number of arguments
  console.error("Error: Invalid arguments provided.");
  console.log("Use 'napi-stdlib-cli --help' for usage information.");
  process.exit(1);
}
