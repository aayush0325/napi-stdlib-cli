#include "add.h"
#include "stdlib/napi/export.h"
#include "stdlib/napi/argv.h"
#include "stdlib/napi/argv_int32.h"
#include "stdlib/napi/create_int32.h"

#include <node_api.h>

static napi_value addon( napi_env env, napi_callback_info info ) {
	STDLIB_NAPI_ARGV( env, info, argv, argc, 2 );
	STDLIB_NAPI_ARGV_INT32( env, x, argv, 0 );
	STDLIB_NAPI_ARGV_INT32( env, y, argv, 1 );

	STDLIB_NAPI_CREATE_INT32( env, add(x, y), FINALRETURNVALUEADDON );
	return FINALRETURNVALUEADDON;
}

STDLIB_NAPI_MODULE_EXPORT_FCN( addon )