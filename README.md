# napi-stdlib-cli

`napi-stdlib-cli` is a command-line tool designed to simplify the process of generating native Node.js addons. By providing a source C file with a single function and a corresponding header file, `napi-stdlib-cli` generates the necessary bindings using the Node-API macros from [stdlib-js](https://github.com/stdlib-js).

## Installation

To install `napi-stdlib-cli`, use the following command:

```bash
npm install -g napi-stdlib-cli@latest
```

This will globally install the tool, making it accessible from anywhere on your system.

## Usage

`napi-stdlib-cli` takes a C source file and its header file as input and generates a Node.js addon. Here's an example of how to use it:

```bash
napi-stdlib-cli my_function.c my_header.h
```

### Options:
- `help`: Help command.

## Features

- **Node-API Integration**: Leverages the Node-API macros from `stdlib-js` for seamless addon creation.
- **Simple Workflow**: Requires only a single function in the C source file, making it easy to use.

## Supported parameter types

|      C Type     |      JavaScript Equivalent   |            Node-API Macro            |
|-----------------|------------------------------|--------------------------------------|
| `double`        | `number`                     | `@stdlib/napi/argv_double`           |
| `double*`       | `Float64Array`               | `@stdlib/napi/argv_float64array`     |
| `float`         | `number`                     | `@stdlib/napi/argv_float`            |
| `float*`        | `Float32Array`               | `@stdlib/napi/argv_float32array`     |
| `int32_t`       | `number`                     | `@stdlib/napi/argv_int32`            |
| `int32_t*`      | `Int32Array`                 | `@stdlib/napi/argv_int32array`       |
| `int`           | `number`                     | `@stdlib/napi/argv_int32`            |
| `int*`          | `Int32Array`                 | `@stdlib/napi/argv_int32array`       |
| `int64_t`       | `bigint`                     | `@stdlib/napi/argv_int64`            |
| `int8_t*`       | `Int8Array`                  | `@stdlib/napi/argv_int8array`        |
| `int16_t*`      | `Int16Array`                 | `@stdlib/napi/argv_int16array`       |
| `uint8_t*`      | `Uint8Array`                 | `@stdlib/napi/argv_uint8array`       |
| `uint16_t*`     | `Uint16Array`                | `@stdlib/napi/argv_uint16array`      |
| `uint32_t`      | `number`                     | `@stdlib/napi/argv_uint32`           |
| `uint32_t*`     | `Uint32Array`                | `@stdlib/napi/argv_uint32array`      |

## Supported return types 

|      C Type     |      JavaScript Equivalent   |            Node-API Macro            |
|-----------------|------------------------------|--------------------------------------|
| `void`          | `void`                       |                   -                  |
| `double`        | `number`                     | `@stdlib/napi/create_double`         |
| `float`         | `number`                     | `@stdlib/napi/create_double`         |


## Limitations (IMPORTANT)

- Your source C file should include the header that you are providing the path to in the argument
- Your source C file should only have that function
- The supported parameter and return types are strictly limited to those listed in the tables above.
- **For any parameter that is an array (e.g., `int*`, `float*`, etc.), the corresponding C function must include an additional `int` or `int32_t` parameter named `N_<variable_name>`. This parameter should specify the size of the array to ensure proper memory allocation.**

## Example

Given the following C source file (`my_function.c`):

```c
#include "my_header.h"

int add(int a, int b) {
    return a + b;
}
```

And the corresponding header file (`my_header.h`):

```c
#ifndef MY_FUNCTION_H
#define MY_FUNCTION_H

int add(int a, int b);

#endif
```

Running `napi-stdlib-cli` will generate a Node.js addon that allows you to call the `add` function directly from JavaScript:

```javascript
const addon = require('./addon.node');

console.log(addon(2, 3)); // Output: 5
```

---
Happy coding with `napi-stdlib-cli`!