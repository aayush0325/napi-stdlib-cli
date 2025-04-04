{
  # Define variables to be used throughout the configuration for all targets:
  'variables': {
    # Source directory:
    'src_dir': './',

    # Include directories:
    'include_dirs': [
      '<!@(node -e "var arr = require(\'/home/aayush/.nvm/versions/node/v23.10.0/lib/node_modules/napi-stdlib-cli/node_modules/@stdlib/utils/library-manifest/lib/index.js\')(\'/home/aayush/Documents/GitHub/napi-cli/examples/sum/manifest.json\',{},{\'basedir\':\'/home/aayush/.nvm/versions/node/v23.10.0/lib/node_modules/napi-stdlib-cli\',\'paths\':\'posix\'}).include; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Add-on destination directory:
    'addon_output_dir': './',

    # Source files:
    'src_files': [
      '<(src_dir)/addon.c',
      '<!@(node -e "var arr = require(\'/home/aayush/.nvm/versions/node/v23.10.0/lib/node_modules/napi-stdlib-cli/node_modules/@stdlib/utils/library-manifest/lib/index.js\')(\'/home/aayush/Documents/GitHub/napi-cli/examples/sum/manifest.json\',{},{\'basedir\':\'/home/aayush/.nvm/versions/node/v23.10.0/lib/node_modules/napi-stdlib-cli\',\'paths\':\'posix\'}).src; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Library dependencies:
    'libraries': [
      '<!@(node -e "var arr = require(\'/home/aayush/.nvm/versions/node/v23.10.0/lib/node_modules/napi-stdlib-cli/node_modules/@stdlib/utils/library-manifest/lib/index.js\')(\'/home/aayush/Documents/GitHub/napi-cli/examples/sum/manifest.json\',{},{\'basedir\':\'/home/aayush/.nvm/versions/node/v23.10.0/lib/node_modules/napi-stdlib-cli\',\'paths\':\'posix\'}).libraries; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],

    # Library directories:
    'library_dirs': [
      '<!@(node -e "var arr = require(\'/home/aayush/.nvm/versions/node/v23.10.0/lib/node_modules/napi-stdlib-cli/node_modules/@stdlib/utils/library-manifest/lib/index.js\')(\'/home/aayush/Documents/GitHub/napi-cli/examples/sum/manifest.json\',{},{\'basedir\':\'/home/aayush/.nvm/versions/node/v23.10.0/lib/node_modules/napi-stdlib-cli\',\'paths\':\'posix\'}).libpath; for ( var i = 0; i < arr.length; i++ ) { console.log( arr[ i ] ); }")',
    ],
  }, # end variables
}
