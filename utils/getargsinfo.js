function getargsinfo(fileContent) {
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

  const supportedReturnTypes = ["int", "int32_t", "double", "float", "void"];

  const functionRegex = /(\w+)\s+(\w+)\s*\(([\s\S]*?)\)\s*\{/g;

  let allKeys = [];
  let variableNames = [];
  let returnType = null;
  let functionName = null;
  let match;

  while ((match = functionRegex.exec(fileContent)) !== null) {
    const capturedReturnType = match[1];
    const capturedFunctionName = match[2];

    if (!supportedReturnTypes.includes(capturedReturnType)) {
      throw new Error(`Unsupported return type: ${capturedReturnType}`);
    }

    returnType = capturedReturnType;
    functionName = capturedFunctionName;
    const argsStr = match[3];
    const args = argsStr
      .split(",")
      .map((arg) => arg.trim())
      .filter((arg) => arg);

    for (const arg of args) {
      const typeMatch = arg.match(
        /^(const\s+)?([a-zA-Z0-9_]+)\s*([\*\s]*)\s*([a-zA-Z0-9_]+)?/,
      );

      if (!typeMatch) {
        console.log("Failed to match:", arg);
        continue;
      }

      let baseType = typeMatch[2].trim();
      const pointerPart = typeMatch[3] || "";
      const variableName = typeMatch[4] || null;
      const pointerCount = (pointerPart.match(/\*/g) || []).length;

      let key;
      if (pointerCount === 0) {
        key = supportedKeys[baseType];
      } else if (pointerCount === 1) {
        key = supportedKeys[`${baseType}*`];
      }

      if (!key) {
        throw new Error(
          `Unsupported argument type: ${baseType}${pointerCount > 0 ? "*".repeat(pointerCount) : ""}`,
        );
      }

      allKeys.push(key);
      if (variableName) {
        variableNames.push(variableName);
      }
    }
  }

  const result = allKeys.map((key, index) => ({
    key,
    variableName: variableNames[index] || null,
    index,
  }));
  for (const item of result) {
    if (item.key.includes("array")) {
      const sizeArgName = `N_${item.variableName}`;
      if (!variableNames.includes(sizeArgName)) {
        throw new Error(
          `Missing size argument for array: ${item.variableName}`,
        );
      }
    }
  }

  var ans = { result, returnType, functionName };
  return ans;
}

module.exports = getargsinfo;