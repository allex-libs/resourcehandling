function createMixins (execlib, outerlib) {
  'use strict';

  var mylib = {};

  require('./resourcehandlercreator')(execlib.lib, outerlib, mylib);

  outerlib.mixins = mylib;
}
module.exports = createMixins;