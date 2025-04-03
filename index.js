#!/usr/bin/env node

const fs = require("fs");
const generate_addon = require("./utils/generate_addon");

const args = process.argv.slice(2);

function displayHelp() {
  console.log(`
Usage: napi-cli <command> [options]

Commands:
  generate <sourceFile> <headerFile>   Generate a Node.js addon from the provided files.
  help                                 Show this help message.

Examples:
  napi-cli generate source.c header.h
  napi-cli help
`);
}

if (args.length === 0) {
  console.log(
    "Welcome to napi-cli! Use 'napi-cli help' for usage information.",
  );
} else {
  const command = args[0];

  switch (command) {
    case "help":
      displayHelp();
      break;

    case "generate":
      if (args.length < 3) {
        console.error("Error: Missing arguments for 'generate' command.");
        console.log("Usage: napi-cli generate <sourceFile> <headerFile>");
        process.exit(1);
      }

      const sourceFile = args[1];
      const headerFile = args[2];

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
            generate_addon(sourceData, headerFile, headerData);
            console.log("Addon generation completed successfully!");
          } catch (e) {
            console.error(`Error during addon generation: ${e.message}`);
            process.exit(1);
          }
        });
      });
      break;

    default:
      console.error(`Error: Unknown command '${command}'.`);
      console.log("Use 'napi-cli help' for usage information.");
      process.exit(1);
  }
}
