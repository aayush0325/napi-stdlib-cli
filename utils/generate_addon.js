const fs = require("fs");
const include = require("../mappings/include.json");
const getargsinfo = require("./getargsinfo");
const macros = require("../mappings/macros.json");
const creatHeaders = require("../mappings/create.json");
const { execSync } = require("child_process");
const path = require("path");

// get calling directory (where user executed the command)
const callingDir = process.cwd();

function generate_addon(sourceFile, data, headerfilename, headerdata) {
  const argsinfo = getargsinfo(data);

  console.log(argsinfo);

  let addtionalIncludes = ``;
  const addedIncludes = new Set();

  // HEADERS
  var manifestDeps = ["@stdlib/napi/export"];

  for (let i = 0; i < argsinfo.result.length; i++) {
    const variable = argsinfo.result[i];
    const isSizeVar = /^N_/.test(variable.variableName);

    let modifiedKey = variable.key;
    if (isSizeVar && modifiedKey === "argv_int32") {
      modifiedKey = "argv_int64"; // switch key for size variables
    }

    if (include[modifiedKey] && !addedIncludes.has(include[modifiedKey])) {
      const header = include[modifiedKey];
      addtionalIncludes += header + "\n";

      const pkg = modifiedKey.replace("_", "-");
      manifestDeps.push(`@stdlib/napi/${pkg}`);

      addedIncludes.add(include[modifiedKey]);
    }
  }

  if (argsinfo.returnType === "double" || argsinfo.returnType === "float") {
    addtionalIncludes += `${creatHeaders["create_double"]}\n`;
    manifestDeps.push(`@stdlib/napi/create-double`);
  } else if (
    argsinfo.returnType === "int" ||
    argsinfo.returnType === "int32_t"
  ) {
    addtionalIncludes += `${creatHeaders["create_int32"]}\n`;
    manifestDeps.push(`@stdlib/napi/create-int32`);
  }

  var manifestJSON = `{
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
            "./${sourceFile}"
          ],
          "include": [
            "${path.dirname(headerfilename)}/"
          ],
          "libraries": [],
          "libpath": [],
          "dependencies": ${JSON.stringify(manifestDeps)}
        }
      ]
    }`;

  var bindingGyp = `
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

  var includeGypi = `{
  # Define variables to be used throughout the configuration for all targets:
  'variables': {
    # Source directory:
    'src_dir': '${path.dirname(sourceFile)}/',

    # Include directories:
    'include_dirs': [
      '<!@(node -e "var arr = require(\\'@stdlib/utils/library-manifest\\')(\\'./manifest.json\\',{},{\\'basedir\\':process.cwd(),\\'paths\\':\\'posix\\'}).include; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Add-on destination directory:
    'addon_output_dir': '${path.dirname(sourceFile)}/',

    # Source files:
    'src_files': [
      '<(src_dir)/addon.c',
      '<!@(node -e "var arr = require(\\'@stdlib/utils/library-manifest\\')(\\'./manifest.json\\',{},{\\'basedir\\':process.cwd(),\\'paths\\':\\'posix\\'}).src; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Library dependencies:
    'libraries': [
      '<!@(node -e "var arr = require(\\'@stdlib/utils/library-manifest\\')(\\'./manifest.json\\',{},{\\'basedir\\':process.cwd(),\\'paths\\':\\'posix\\'}).libraries; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Library directories:
    'library_dirs': [
      '<!@(node -e "var arr = require(\\'@stdlib/utils/library-manifest\\')(\\'./manifest.json\\',{},{\\'basedir\\':process.cwd(),\\'paths\\':\\'posix\\'}).libpath; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],
  }, # end variables
}
`;

  console.log(JSON.stringify(manifestDeps));

  // CONTENT
  let addonConfig = `\n\tSTDLIB_NAPI_ARGV( env, info, argv, argc, ${argsinfo.result.length} );\n`;
  for (const variable of argsinfo.result) {
    if (
      variable.key === "argv_int32" ||
      variable.key === "argv_double" ||
      variable.key === "argv_float" ||
      variable.key === "argv_int64" ||
      variable.key === "argv_uint32"
    ) {
      if (/^N_/.test(variable.variableName)) {
        // skip if it is a size variable name as it will be used in the array macro
      } else {
        // add the macro normally for other variables
        addonConfig += `\t${macros[variable.key]}( env, ${variable.variableName}, argv, ${variable.index} );\n`;
      }
    }
  }

  for (const variable of argsinfo.result) {
    if (
      !(
        // NOT
        (
          variable.key === "argv_int32" ||
          variable.key === "argv_double" ||
          variable.key === "argv_float" ||
          variable.key === "argv_int64" ||
          variable.key === "argv_uint32"
        )
      )
    ) {
      addonConfig += `\t${macros[variable.key]}( env, ${variable.variableName}, N_${variable.variableName}, argv, ${variable.index} );\n`;
    }
  }

  // FUNCTION CALL
  let functionCall;

  if (argsinfo.returnType === "void") {
    functionCall = `\n\t${argsinfo.functionName}(${argsinfo.result.map((arg) => arg.variableName).join(", ")});\n\treturn NULL;\n`;
  } else if (
    argsinfo.returnType === "float" ||
    argsinfo.returnType === "double"
  ) {
    functionCall = `\n\tSTDLIB_NAPI_CREATE_DOUBLE( env, ${argsinfo.functionName}(${argsinfo.result.map((arg) => arg.variableName).join(", ")}), FINALRETURNVALUEADDON );\n\treturn FINALRETURNVALUEADDON;\n`;
  } else if (
    argsinfo.returnType === "int" ||
    argsinfo.returnType === "int32_t"
  ) {
    functionCall = `\n\tSTDLIB_NAPI_CREATE_INT32( env, ${argsinfo.functionName}(${argsinfo.result.map((arg) => arg.variableName).join(", ")}), FINALRETURNVALUEADDON );\n\treturn FINALRETURNVALUEADDON;\n`;
  }

  const addon = `#include "${headerfilename}"\n#include "stdlib/napi/export.h"\n#include "stdlib/napi/argv.h"\n${addtionalIncludes}\n#include <node_api.h>\n\nstatic napi_value addon( napi_env env, napi_callback_info info ) {${addonConfig}${functionCall}}\n\nSTDLIB_NAPI_MODULE_EXPORT_FCN( addon )`;

  fs.writeFileSync(path.join(callingDir, "addon.c"), addon);
  fs.writeFileSync(path.join(callingDir, "manifest.json"), manifestJSON);
  fs.writeFileSync(path.join(callingDir, "binding.gyp"), bindingGyp);
  fs.writeFileSync(path.join(callingDir, "include.gypi"), includeGypi);

  try {
    execSync("node-gyp clean", {
      stdio: "inherit",
      cwd: callingDir,
    });

    execSync("node-gyp configure build", {
      stdio: "inherit",
      cwd: callingDir,
    });

  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

module.exports = generate_addon;
