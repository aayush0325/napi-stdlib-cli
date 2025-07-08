var mean = require("./addon.node");
var uniform = require("@stdlib/random/array/uniform");

var arr = uniform(10, -100, 100, { dtype: "float64" });

console.log(arr);

console.log(mean(arr.length, arr));
