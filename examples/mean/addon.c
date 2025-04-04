#include "mean.h"
#include "stdlib/napi/export.h"
#include "stdlib/napi/argv.h"
#include "stdlib/napi/argv_int64.h"
#include "stdlib/napi/argv_float64array.h"
#include "stdlib/napi/create_double.h"

#include <node_api.h>

static napi_value addon( napi_env env, napi_callback_info info ) {
	STDLIB_NAPI_ARGV( env, info, argv, argc, 2 );
	STDLIB_NAPI_ARGV_FLOAT64ARRAY( env, x, N_x, argv, 1 );

	STDLIB_NAPI_CREATE_DOUBLE( env, mean(N_x, x), FINALRETURNVALUEADDON );
	return FINALRETURNVALUEADDON;
}

STDLIB_NAPI_MODULE_EXPORT_FCN( addon )