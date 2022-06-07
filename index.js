function createLib (execlib) {
  'use strict';

  var mylib = {};

  require('./mixins') (execlib, mylib);

  return mylib;
}
module.exports = createLib;