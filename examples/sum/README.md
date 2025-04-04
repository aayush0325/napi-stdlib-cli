# Example

This is an example on how to use `napi-stdlib-cli`.

1. Write the header file, note that it should have proper header guards in place!

```c
#ifndef HEADER_H
#define HEADER_H

int add(int x, int y);

#endif // HEADER_H
```

2. Write the source file, it should include the defined header file and only contain one function from it.

```c
#include "add.h"

// returns the sum of two integers
int add(int x, int y) {
    return x + y;
}
```

3. Use `napi-stdlib-cli` to generate the native addon:

```bash
napi-stdlib-cli add.c add.h
```

This auto generates an `addon.node`, `build` directory, `manifest.json` for resolving dependencies, `binding.gyp` and `include.gypi` these may contain the absolute path to your installation and current working directory.
