// Core Node.js modules
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

// Mappings and utility modules
const includeMappings = require("../mappings/include.json");
const getArgsInfo = require("./getargsinfo");
const macroMappings = require("../mappings/macros.json");
const createHeaderMappings = require("../mappings/create.json");

// Get the directory from which the user executed the command
const callingDir = process.cwd();

/**
 * Generates and compiles a Node.js N-API addon from C source and header files.
 *
 * @param {string} sourceFilePath - The absolute path to the C source file.
 * @param {string} sourceCode - The content of the C source file.
 * @param {string} headerFilePath - The absolute path to the C header file.
 * @param {string} headerCode - The content of the C header file.
 */
function generate_addon(
  sourceFilePath,
  sourceCode,
  headerFilePath,
  headerCode,
) {
  // Extract function signature information from the C source code
  const argsInfo = getArgsInfo(sourceCode);

  // console.log(argsinfo);

  let additionalIncludes = ``;
  const addedIncludes = new Set();

  // Initialize manifest dependencies with the base N-API export module
  const manifestDependencies = ["@stdlib/napi/export"];

  // Determine additional headers and manifest dependencies based on function arguments
  for (let i = 0; i < argsInfo.result.length; i++) {
    const variable = argsInfo.result[i];
    // Check if the variable is a size variable (e.g., N_ARRAY)
    const isSizeVariable = /^N_/.test(variable.variableName);

    if (isSizeVariable) {
      continue; // Skip size variables as they are handled by array macros
    }

    // If an include mapping exists for the variable type and it hasn't been added yet
    if (
      includeMappings[variable.key] &&
      !addedIncludes.has(includeMappings[variable.key])
    ) {
      const header = includeMappings[variable.key];
      additionalIncludes += header + "\n";

      // Derive package name for manifest from the variable key
      const packageName = variable.key.replace("_", "-");
      manifestDependencies.push(`@stdlib/napi/${packageName}`);

      addedIncludes.add(includeMappings[variable.key]);
    }
  }

  // Add specific headers and manifest dependencies based on the function's return type
  if (argsInfo.returnType === "double" || argsInfo.returnType === "float") {
    additionalIncludes += `${createHeaderMappings["create_double"]}\n`;
    manifestDependencies.push(`@stdlib/napi/create-double`);
  } else if (
    argsInfo.returnType === "int" ||
    argsInfo.returnType === "int32_t"
  ) {
    additionalIncludes += `${createHeaderMappings["create_int32"]}\n`;
    manifestDependencies.push(`@stdlib/napi/create-int32`);
  }

  /**
   * Generates the content for `manifest.json`.
   * This file describes the addon's dependencies and source/include paths for `@stdlib`.
   */
  const manifestJSONContent = `{
      "options": {},
      "fields": [
        {
          "field": "src",
          "resolve": true,
          "relative": true
        },
        {
          "field": "include",
          "resolve": true,
          "relative": true
        },
        {
          "field": "libraries",
          "resolve": false,
          "relative": false
        },
        {
          "field": "libpath",
          "resolve": true,
          "relative": false
        }
      ],
      "confs": [
        {
          "src": [
            "./${path.basename(sourceFilePath)}"
          ],
          "include": [
            "${path.dirname(headerFilePath)}/"
          ],
          "libraries": [],
          "libpath": [],
          "dependencies": ${JSON.stringify(manifestDependencies)}
        }
      ]
    }`;

  /**
   * Generates the content for `binding.gyp`.
   * This file is used by `node-gyp` to define how the native addon should be built.
   */
  const bindingGypContent = `
{
  # List of files to include in this file:
  'includes': [
    './include.gypi',
  ],

  # Define variables to be used throughout the configuration for all targets:
  'variables': {
    # Target name should match the add-on export name:
    'addon_target_name%': 'addon',

    # Set variables based on the host OS:
    'conditions': [
      [
        'OS=="win"',
        {
          # Define the object file suffix:
          'obj': 'obj',
        },
        {
          # Define the object file suffix:
          'obj': 'o',
        }
      ], # end condition (OS=="win")
    ], # end conditions
  }, # end variables

  # Define compile targets:
  'targets': [

    # Target to generate an add-on:
    {
      # The target name should match the add-on export name:
      'target_name': '<(addon_target_name)',

      # Define dependencies:
      'dependencies': [],

      # Define directories which contain relevant include headers:
      'include_dirs': [
        # Local include directory:
        '<@(include_dirs)',
      ],

      # List of source files:
      'sources': [
        '<@(src_files)',
      ],

      # Settings which should be applied when a target's object files are used as linker input:
      'link_settings': {
        # Define libraries:
        'libraries': [
          '<@(libraries)',
        ],

        # Define library directories:
        'library_dirs': [
          '<@(library_dirs)',
        ],
      },

      # C/C++ compiler flags:
      'cflags': [
        # Enable commonly used warning options:
        '-Wall',

        # Aggressive optimization:
        '-O3',
      ],

      # C specific compiler flags:
      'cflags_c': [
        # Specify the C standard to which a program is expected to conform:
        '-std=c99',
      ],

      # C++ specific compiler flags:
      'cflags_cpp': [
        # Specify the C++ standard to which a program is expected to conform:
        '-std=c++11',
      ],

      # Linker flags:
      'ldflags': [],

      # Apply conditions based on the host OS:
      'conditions': [
        [
          'OS=="mac"',
          {
            # Linker flags:
            'ldflags': [
              '-undefined dynamic_lookup',
              '-Wl,-no-pie',
              '-Wl,-search_paths_first',
            ],
          },
        ], # end condition (OS=="mac")
        [
          'OS!="win"',
          {
            # C/C++ flags:
            'cflags': [
              # Generate platform-independent code:
              '-fPIC',
            ],
          },
        ], # end condition (OS!="win")
      ], # end conditions
    }, # end target <(addon_target_name)

    # Target to copy a generated add-on to a standard location:
    {
      'target_name': 'copy_addon',

      # Declare that the output of this target is not linked:
      'type': 'none',

      # Define dependencies:
      'dependencies': [
        # Require that the add-on be generated before building this target:
        '<(addon_target_name)',
      ],

      # Define a list of actions:
      'actions': [
        {
          'action_name': 'copy_addon',
          'message': 'Copying addon...',

          # Explicitly list the inputs in the command-line invocation below:
          'inputs': [],

          # Declare the expected outputs:
          'outputs': [
            '<(addon_output_dir)/<(addon_target_name).node',
          ],

          # Define the command-line invocation:
          'action': [
            'cp',
            '<(PRODUCT_DIR)/<(addon_target_name).node',
            '<(addon_output_dir)/<(addon_target_name).node',
          ],
        },
      ], # end actions
    }, # end target copy_addon
  ], # end targets
}
`;

  /**
   * Generates the content for `include.gypi`.
   * This file provides common variables and paths used by `binding.gyp`.
   */
  const includeGypiContent = `{
  # Define variables to be used throughout the configuration for all targets:
  'variables': {
    # Source directory:
    'src_dir': '${path.dirname(sourceFilePath)}/',

    # Include directories:
    'include_dirs': [
      '<!@(node -e "var arr = require(\'${require.resolve("@stdlib/utils/library-manifest")}\')(\'${path.join(callingDir, "manifest.json")}\',{},{\'basedir\':\'${path.resolve(path.dirname(require.resolve("@stdlib/stdlib")), "../../..")}\'\,\'paths\':\'posix\'}).include; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Add-on destination directory:
    'addon_output_dir': '${path.dirname(sourceFilePath)}/',

    # Source files:
    'src_files': [
      '<(src_dir)/addon.c',
      '<!@(node -e "var arr = require(\'${require.resolve("@stdlib/utils/library-manifest")}\')(\'${path.join(callingDir, "manifest.json")}\',{},{\'basedir\':\'${path.resolve(path.dirname(require.resolve("@stdlib/stdlib")), "../../..")}\'\,\'paths\':\'posix\'}).src; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Library dependencies:
    'libraries': [
      '<!@(node -e "var arr = require(\'${require.resolve("@stdlib/utils/library-manifest")}\')(\'${path.join(callingDir, "manifest.json")}\',{},{\'basedir\':\'${path.resolve(path.dirname(require.resolve("@stdlib/stdlib")), "../../..")}\'\,\'paths\':\'posix\'}).libraries; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Library directories:
    'library_dirs': [
      '<!@(node -e "var arr = require(\'${require.resolve("@stdlib/utils/library-manifest")}\')(\'${path.join(callingDir, "manifest.json")}\',{},{\'basedir\':\'${path.resolve(path.dirname(require.resolve("@stdlib/stdlib")), "../../..")}\'\,\'paths\':\'posix\'}).libpath; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],
  }, # end variables
}
`;

  // Generate the N-API argument parsing and function call logic for addon.c
  let addonConfigContent = `\n\tSTDLIB_NAPI_ARGV( env, info, argv, argc, ${argsInfo.result.length} );\n`;

  // Process non-array arguments
  for (const variable of argsInfo.result) {
    // Check if the variable is a standard argument (not an array or size variable)
    if (
      variable.key === "argv_int32" ||
      variable.key === "argv_double" ||
      variable.key === "argv_float" ||
      variable.key === "argv_int64" ||
      variable.key === "argv_uint32"
    ) {
      if (!/^N_/.test(variable.variableName)) {
        // Add the macro for standard scalar variables
        addonConfigContent += `\t${macroMappings[variable.key]}( env, ${variable.variableName}, argv, ${variable.index} );\n`;
      }
    }
  }

  // Process array arguments (those not covered by the previous loop)
  for (const variable of argsInfo.result) {
    // If the variable is NOT a standard scalar argument (i.e., it's an array)
    if (
      !(
        variable.key === "argv_int32" ||
        variable.key === "argv_double" ||
        variable.key === "argv_float" ||
        variable.key === "argv_int64" ||
        variable.key === "argv_uint32"
      )
    ) {
      // Add the macro for array variables, including their size variable (N_variableName)
      addonConfigContent += `\t${macroMappings[variable.key]}( env, ${variable.variableName}, N_${variable.variableName}, argv, ${variable.index} );\n`;
    }
  }

  // Determine the C function call and N-API return value handling
  let functionCallContent;
  const functionArgs = argsInfo.result
    .map((arg) => arg.variableName)
    .join(", ");

  if (argsInfo.returnType === "void") {
    functionCallContent = `\n\t${argsInfo.functionName}(${functionArgs});\n\treturn NULL;\n`;
  } else if (
    argsInfo.returnType === "float" ||
    argsInfo.returnType === "double"
  ) {
    functionCallContent = `\n\tSTDLIB_NAPI_CREATE_DOUBLE( env, ${argsInfo.functionName}(${functionArgs}), FINALRETURNVALUEADDON );\n\treturn FINALRETURNVALUEADDON;\n`;
  } else if (
    argsInfo.returnType === "int" ||
    argsInfo.returnType === "int32_t"
  ) {
    functionCallContent = `\n\tSTDLIB_NAPI_CREATE_INT32( env, ${argsInfo.functionName}(${functionArgs}), FINALRETURNVALUEADDON );\n\treturn FINALRETURNVALUEADDON;\n`;
  }

  // Assemble the final `addon.c` content
  const addonCContent =
    `#include "${path.basename(headerFilePath)}"\n` +
    `#include "stdlib/napi/export.h"\n` +
    `#include "stdlib/napi/argv.h"\n` +
    `${additionalIncludes}\n` +
    `#include <node_api.h>\n\n` +
    `static napi_value addon( napi_env env, napi_callback_info info ) {` +
    `${addonConfigContent}` +
    `${functionCallContent}` +
    `}\n\n` +
    `STDLIB_NAPI_MODULE_EXPORT_FCN( addon )`;

  // Write all generated files to the current working directory
  fs.writeFileSync(path.join(callingDir, "addon.c"), addonCContent);
  fs.writeFileSync(path.join(callingDir, "manifest.json"), manifestJSONContent);
  fs.writeFileSync(path.join(callingDir, "binding.gyp"), bindingGypContent);
  fs.writeFileSync(path.join(callingDir, "include.gypi"), includeGypiContent);

  // Define the path to the node-gyp executable
  const nodeGypBinaryPath = path.resolve(
    __dirname,
    "../node_modules/.bin/node-gyp",
  );

  // Execute node-gyp commands to clean, configure, and build the addon
  try {
    console.log("Cleaning previous build...");
    execSync(`${nodeGypBinaryPath} clean`, { stdio: "inherit" });

    console.log("Configuring and building addon...");
    execSync(`${nodeGypBinaryPath} configure build`, { stdio: "inherit" });
    console.log("Addon built successfully.");
  } catch (error) {
    console.error("Error during addon build process:", error.message);
    process.exit(1);
  }
}

module.exports = generate_addon;
