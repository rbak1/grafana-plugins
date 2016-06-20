define([
  'angular',
  'lodash',
  'app/plugins/sdk'
],
function (angular, _, sdk) {
  'use strict';

  var MonascaQueryCtrl = (function(_super) {
    var self;
    var metricList = null;
    var dimensionList = { 'keys' : [], 'values' : {} };
    var currentDimension = null;

    function MonascaQueryCtrl($scope, $injector, templateSrv, $q, uiSegmentSrv) {
      _super.call(this, $scope, $injector);
      this.q = $q;
      this.uiSegmentSrv = uiSegmentSrv;
      this.templateSrv = templateSrv;

      if (!this.target.aggregator) {
        this.target.aggregator = 'avg';
      }
      if (!this.target.period) {
        this.target.period = '300';
      }
      if (!this.target.dimensions) {
        this.target.dimensions = [];
      }

      self = this;
      this.validateTarget();

      if (this.target.metric) {
        this.resetDimensionList();
      }
    }

    MonascaQueryCtrl.prototype = Object.create(_super.prototype);
    MonascaQueryCtrl.prototype.constructor = MonascaQueryCtrl;

    MonascaQueryCtrl.templateUrl = 'partials/query.editor.html';

    MonascaQueryCtrl.prototype.targetBlur = function() {
      self.validateTarget();
      if (!_.isEqual(self.oldTarget, self.target) && _.isEmpty(self.target.error)) {
        self.oldTarget = angular.copy(self.target);
        self.refresh();
      }
    };

    MonascaQueryCtrl.prototype.validateTarget = function() {
      self.target.error = "";
      if (!self.target.metric) {
        self.target.error = "No metric specified";
      }
      if (self.target.aggregator != 'none' && !self.target.period) {
        self.target.error = "You must supply a period when using an aggregator";
      }
      for (var i = 0; i < self.target.dimensions.length; i++) {
        if (!self.target.dimensions[i].key) {
          self.target.error = "One or more dimensions is missing a key";
          break;
        }
        if (!self.target.dimensions[i].value){
          self.target.error = "One or more dimensions is missing a value";
          break;
        }
      }
      if (self.target.error) {
        console.log(self.target.error);
      }
    };

    //////////////////////////////
    // METRIC
    //////////////////////////////

    MonascaQueryCtrl.prototype.suggestMetrics = function(query, callback) {
      if (!metricList) {
        self.datasource.namesQuery()
            .then(self.datasource.convertNamesList)
            .then(function(metrics) {
          metricList = metrics;
          callback(metrics);
        });
      }
      else {
        return metricList;
      }
    };

    MonascaQueryCtrl.prototype.onMetricChange = function() {
      self.resetDimensionList();
      self.targetBlur();
    };

    //////////////////////////////
    // ALIAS
    //////////////////////////////

    MonascaQueryCtrl.prototype.suggestAlias = function(query, callback) {
      var upToLastTag = query.substr(0, query.lastIndexOf('@'));
      var suggestions = self.datasource.listTemplates();
      var dimensions = self.suggestDimensionKeys(query, callback);
      for (var i = 0; i < dimensions.length; i++) {
        suggestions.push(upToLastTag+"@"+dimensions[i]);
      }
      return suggestions;
    };

    //////////////////////////////
    // DIMENSIONS
    //////////////////////////////

    MonascaQueryCtrl.prototype.resetDimensionList = function() {
      dimensionList = { 'keys' : [], 'values' : {} };
      if (self.target.metric) {
        self.datasource.metricsQuery({'name' : self.target.metric})
            .then(self.datasource.buildDimensionList)
            .then(function(dimensions) {
          dimensionList = dimensions;
        });
      }
    };

    MonascaQueryCtrl.prototype.suggestDimensionKeys = function(query, callback) {
      if (dimensionList.keys.length === 0 && self.target.metric) {
        self.datasource.metricsQuery({'name' : self.target.metric})
            .then(self.datasource.buildDimensionList)
            .then(function(dimensions) {
          dimensionList = dimensions;
          callback(dimensions.keys);
        });
      }
      else {
        return dimensionList.keys;
      }
    };

    MonascaQueryCtrl.prototype.suggestDimensionValues = function(query, callback) {
      var values = ['$all'];
      values = values.concat(self.datasource.listTemplates());
      if (currentDimension.key && currentDimension.key in dimensionList.values) {
        values = values.concat(dimensionList.values[currentDimension.key]);
      }
      return values;
    };

    MonascaQueryCtrl.prototype.editDimension = function(index) {
      currentDimension = self.target.dimensions[index];
    };

    MonascaQueryCtrl.prototype.addDimension = function() {
      self.target.dimensions.push({});
    };

    MonascaQueryCtrl.prototype.removeDimension = function(index) {
      self.target.dimensions.splice(index, 1);
      self.targetBlur();
    };

    //////////////////////////////

    return MonascaQueryCtrl;

  })(sdk.QueryCtrl);

  return MonascaQueryCtrl;
});
