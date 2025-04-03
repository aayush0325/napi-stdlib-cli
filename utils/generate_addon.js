const fs = require("fs");
const include = require("../mappings/include.json");
const getargsinfo = require("./getargsinfo");
const macros = require("../mappings/macros.json");
const creatHeaders = require("../mappings/create.json");
const { execSync } = require("child_process");
const path = require("path");

const installationDir = path.join(__dirname, ".."); // points to napi-cli root directory

// get calling directory (where user executed the command)
const callingDir = process.cwd();

function generate_addon(data, headerfilename, headerdata) {
  const buildDir = path.join(installationDir, "build");
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  // create necessary directories in installation dir
  const srcDir = path.join(installationDir, "src");
  const includeDir = path.join(installationDir, "include");
  [srcDir, includeDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

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
            "./src/main.c"
          ],
          "include": [
            "./include"
          ],
          "libraries": [],
          "libpath": [],
          "dependencies": ${JSON.stringify(manifestDeps)}
        }
      ]
    }`;
  console.log(JSON.stringify(manifestDeps));

  // CONTENT
  let addonConfig = `\n\tSTDLIB_NAPI_ARGV( env, info, argv, argc, ${argsinfo.result.length} );\n`;
  for (const variable of argsinfo.result) {
    if (
      variable.key === "argv_int32" ||
      variable.key === "argv_double" ||
      variable.key === "argv_float" ||
      variable.key === "argv_int64" || variable.key === "argv_uint32"
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
          variable.key === "argv_int64"|| variable.key === "argv_uint32"
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

  fs.writeFileSync(path.join(srcDir, "addon.c"), addon);
  fs.writeFileSync(path.join(srcDir, "main.c"), data);
  fs.writeFileSync(path.join(includeDir, headerfilename), headerdata);
  fs.writeFileSync(path.join(installationDir, "manifest.json"), manifestJSON);

  try {
    execSync("node-gyp clean", {
      stdio: "inherit",
      cwd: installationDir,
    });

    execSync("node-gyp configure build", {
      stdio: "inherit",
      cwd: installationDir,
    });

    const builtAddon = path.join(installationDir, "./src/addon.node");
    const destination = path.join(callingDir, "addon.node");

    fs.copyFileSync(builtAddon, destination);
    console.log(`\nAddon copied to: ${destination}`);

    fs.rmSync(includeDir, { recursive: true, force: true });
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(path.join(installationDir, "manifest.json"), { force: true });
    execSync("node-gyp clean", {
      stdio: "inherit",
      cwd: installationDir,
    });
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

module.exports = generate_addon;
