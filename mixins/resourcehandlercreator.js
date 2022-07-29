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
    return this.handler.getHoldOfResource();
  };
  ResourceHandlingJobCore.prototype.onResource = function (res) {
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

  function ResourceAcquiringJobCore (reshandler) {
    this.handler = reshandler;
  }
  ResourceAcquiringJobCore.prototype.destroy = function () {
    this.handler = null;
  };
  ResourceAcquiringJobCore.prototype.shouldContinue = function () {
    if (!this.handler) {
      return new lib.Error('NO_RESOURCE_HANDLER');
    }
  };
  ResourceAcquiringJobCore.prototype.getResource = function () {
    return qlib.thenableRead(this.handler.resource || this.handler.acquireResource(this.handler.resourceHandlingOptions)).then(this.resourceChecker.bind(this));
  };
  ResourceAcquiringJobCore.prototype.onResource = function (res) {
    this.handler.resource = res;
    return res;
  };

  ResourceAcquiringJobCore.prototype.steps = [
    'getResource',
    'onResource'
  ];

  ResourceAcquiringJobCore.prototype.resourceChecker = function (res) {
    var destres;
    if (!this.handler.isResourceUsable(res)) {
      destres = qlib.thenableRead(res ? this.handler.destroyResource(res) : null);
      this.handler.resource = null;
      return q.delay(10*lib.intervals.Second, destres).then(this.getResource.bind(this));
    }
    return res;
  };

  function ResourceHandlerMixin (options) {
    this.resourceHandlingOptions = options;
    this.resource = null;
    this.resourceQ = new qlib.JobCollection();
  }
  ResourceHandlerMixin.prototype.destroy = function () {
    if (this.resourceQ) {
      this.resourceQ.destroy();
    }
    this.resourceQ = null;
    if (this.resource) {
      this.destroyResource(this.resource);
    }
    this.resource = null;
    this.resourceHandlingOptions = null;
  };
  ResourceHandlerMixin.prototype.getHoldOfResource = function () {
    return this.resourceQ.run('.', qlib.newSteppedJobOnSteppedInstance(new ResourceAcquiringJobCore(this)));
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
      , 'getHoldOfResource'
      , 'resourceHandlingJob'
    );
  };

  mylib.ResourceHandler = ResourceHandlerMixin;
}
module.exports = createResourceHandlerMixin;