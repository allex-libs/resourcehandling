function createResourceHandlerMixin (lib, outerlib, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;


  function ResourceHandlingJobCore (reshandler, methodname, args) {
    this.handler = reshandler;
    this.methodname = methodname;
    this.args = args;
  }
  ResourceHandlingJobCore.prototype.destroy = function () {
    this.args = null;
    this.methodname = null;
    this.handler = null;
  };
  ResourceHandlingJobCore.prototype.shouldContinue = function () {
    if (!this.handler) {
      return new lib.Error('NO_RESOURCE_HANDLER');
    }
  };
  ResourceHandlingJobCore.prototype.init = function () {
    if (!lib.isFunction(this.handler[this.methodname])) {
      throw new lib.Error('NOT_IMPLEMENTED', this.methodname+' must be implemented on ', this.handler.constructor.name);
    }
    if (!lib.isArray(this.args)) {
      throw new lib.Error('NOT_AN_ARRAY', 'Arguments for ResourceHandlingJobCore must be an array');
    }
  };
  ResourceHandlingJobCore.prototype.getResource = function () {
    return this.handler.resource || this.handler.acquireResource(this.handler.resourceHandlingOptions);
  };
  ResourceHandlingJobCore.prototype.onResource = function (res) {
    if (!this.handler.isResourceUsable(res)) {
      this.handler.resource = null;
      return q.delay(this.getResource(), 10*lib.intervals.Second);
    }
    this.handler.resource = res;
    return this.handler[this.methodname].apply(
      this.handler,
      Array.prototype.concat.apply([res], this.args)
    );
  };

  ResourceHandlingJobCore.prototype.steps = [
    'init',
    'getResource',
    'onResource'
  ];


  var _resourceHandlingChannel = 'reshandling';

  function ResourceHandlerMixin (options) {
    this.resourceHandlingOptions = options;
    this.resource = null;
  }
  ResourceHandlerMixin.prototype.destroy = function () {
    if (this.resource) {
      this.destroyResource(this.resource);
    }
    this.resource = null;
    this.resourceHandlingOptions = null;
  };
  ResourceHandlerMixin.prototype.resourceHandlingJob = function (methodname, args) {
    return (qlib.newSteppedJobOnSteppedInstance(new ResourceHandlingJobCore(this, methodname, args)));
  };

  ResourceHandlerMixin.prototype.acquireResource = function (resourcehandlingoptions) {
    throw new lib.Error('NOT_IMPLEMENTED', this.constructor.name+' must implement acquireResource');
  };
  ResourceHandlerMixin.prototype.isResourceUsable = function (resource) {
    throw new lib.Error('NOT_IMPLEMENTED', this.constructor.name+' must implement isResourceUsable');
  };
  ResourceHandlerMixin.prototype.destroyResource = function (resource) {
    throw new lib.Error('NOT_IMPLEMENTED', this.constructor.name+' must implement destroyResource');
  };

  ResourceHandlerMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, ResourceHandlerMixin
      , 'acquireResource'
      , 'isResourceUsable'
      , 'destroyResource'
      , 'resourceHandlingJob'
    );
  };

  mylib.ResourceHandler = ResourceHandlerMixin;
}
module.exports = createResourceHandlerMixin;