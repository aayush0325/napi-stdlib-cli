/**
 * Defines a mapping from C data types to their corresponding N-API argument parsing keys.
 * This is used to determine which N-API macro to use for argument conversion.
 */
const supportedKeys = {
  double: "argv_double",
  "double*": "argv_float64array",

  float: "argv_float",
  "float*": "argv_float32array",

  int32_t: "argv_int32",
  "int32_t*": "argv_int32array",

  int: "argv_int32",
  "int*": "argv_int32array",

  int64_t: "argv_int64",

  "int8_t*": "argv_int8array",

  "int16_t*": "argv_int16array",

  "uint8_t*": "argv_uint8array",

  "uint16_t*": "argv_uint16array",

  uint32_t: "argv_uint32",
  "uint32_t*": "argv_uint32array",
};

/**
 * Lists the C return types that are supported for N-API addon generation.
 */
const supportedReturnTypes = ["int", "int32_t", "double", "float", "void"];

/**
 * Parses the content of a C source file to extract function signature information.
 *
 * @param {string} fileContent - The content of the C source file.
 * @returns {object} An object containing the function's return type, name, and an array of argument details.
 * @throws {Error} If an unsupported return type or argument type is encountered, or if a size argument for an array is missing.
 */
function getargsinfo(fileContent) {
  // Regular expression to match C function signatures.
  // It captures the return type, function name, and arguments string.
  const functionRegex = /(\w+)\s+(\w+)\s*\(([\s\S]*?)\)\s*\{/g;

  let allArgumentKeys = [];
  let argumentVariableNames = [];
  let functionReturnType = null;
  let functionName = null;
  let match;

  // Iterate through all function matches in the file content
  while ((match = functionRegex.exec(fileContent)) !== null) {
    const capturedReturnType = match[1];
    const capturedFunctionName = match[2];

    // Validate the captured return type against supported types
    if (!supportedReturnTypes.includes(capturedReturnType)) {
      throw new Error(`Unsupported return type: ${capturedReturnType}`);
    }

    functionReturnType = capturedReturnType;
    functionName = capturedFunctionName;

    // Extract and clean up the arguments string
    const argsStr = match[3];
    const args = argsStr
      .split(",")
      .map((arg) => arg.trim())
      .filter((arg) => arg); // Filter out empty strings from splitting

    // Process each argument to determine its type and name
    for (const arg of args) {
      // Regex to parse individual argument declarations (e.g., "const double* arr", "int value")
      const typeMatch = arg.match(
        /^(const\s+)?([a-zA-Z0-9_]+)\s*([\*\s]*)\s*([a-zA-Z0-9_]+)?/,
      );

      if (!typeMatch) {
        console.log("Failed to parse argument declaration:", arg);
        continue;
      }

      let baseType = typeMatch[2].trim();
      const pointerPart = typeMatch[3] || "";
      const variableName = typeMatch[4] || null;
      const pointerCount = (pointerPart.match(/\*/g) || []).length;

      let key;
      // Determine the appropriate key for the argument type (scalar or pointer/array)
      if (pointerCount === 0) {
        key = supportedKeys[baseType];
      } else if (pointerCount === 1) {
        key = supportedKeys[`${baseType}*`];
      }

      // Throw an error if the argument type is not supported
      if (!key) {
        throw new Error(
          `Unsupported argument type: ${baseType}${pointerCount > 0 ? "*".repeat(pointerCount) : ""}`,
        );
      }

      allArgumentKeys.push(key);
      if (variableName) {
        argumentVariableNames.push(variableName);
      }
    }
  }

  // Map the extracted argument keys and names into a structured result array
  const result = allArgumentKeys.map((key, index) => ({
    key,
    variableName: argumentVariableNames[index] || null,
    index,
  }));

  // Validate that array arguments have corresponding size arguments (e.g., N_arrayName)
  for (const item of result) {
    if (item.key.includes("array")) {
      const sizeArgumentName = `N_${item.variableName}`;
      if (!argumentVariableNames.includes(sizeArgumentName)) {
        throw new Error(
          `Missing size argument for array: ${item.variableName}. Expected a variable named '${sizeArgumentName}'.`,
        );
      }
    }
  }

  // Return the collected function information
  return { result, returnType: functionReturnType, functionName };
}

module.exports = getargsinfo;
