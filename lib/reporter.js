var _ = require('lodash'),
  xml = require('xmlbuilder'),
  reporter,
  SEP = ' / ',
  getFullName = function (item, separator) {
    if (_.isEmpty(item) || !_.isFunction(item.parent) || !_.isFunction(item.forEachParent)) { return; }

    var chain = [];

    item.forEachParent(function (parent) { chain.unshift(parent.name || parent.id); });

    item.parent() && chain.push(item.name || item.id); // Add the current item only if it is not the collection

    return chain.join(_.isString(separator) ? separator : SEP);
  };

reporter = function (newman) {

  var executions = _.get(newman, 'summary.run.executions'),
    collection = _.get(newman, 'summary.collection'),
    cache,
    root,
    testSuitesExecutionTime = 0,
    executionTime = 0,
    timestamp,
    classname;

  if (!executions) {
    return;
  }

  classname = _.upperFirst(_.camelCase(collection.name).replace(/\W/g, ''));

  root = xml.create('testsuites', { version: '1.0', encoding: 'UTF-8' });
  root.att('name', collection.name);
  root.att('tests', _.get(newman, 'summary.run.stats.tests.total', 'unknown'));


  cache = _.transform(executions, function (accumulator, execution) {
    accumulator[execution.item.id] = accumulator[execution.id] || [];
    accumulator[execution.item.id].push(execution);
  }, {});

  timestamp = new Date(_.get(newman, 'summary.run.timings.started')).toISOString();

  _.forEach(cache, function (executions, itemId) {
    var suite = root.ele('testsuite'),
      currentItem,
      tests = {},
      errors = 0,
      failures = 0,
      skips = 0,
      errorMessages;

    collection.forEachItem(function (item) {
      (item.id === itemId) && (currentItem = item);
    });

    if (!currentItem) { return; }

    suite.att('name', getFullName(currentItem));
    suite.att('id', currentItem.id);
    suite.att('timestamp', timestamp);

    _.forEach(executions, function (execution) {
      var iteration = execution.cursor.iteration,
        errored,
        msg = `Iteration: ${iteration}\n`;

      // Process errors
      if (execution.requestError) {
        ++errors;
        errored = true;
        msg += ('RequestError: ' + (execution.requestError.stack) + '\n');
      }
      msg += '\n---\n';
      _.forEach(['testScript', 'prerequestScript'], function (prop) {
        _.forEach(execution[prop], function (err) {
          if (err.error) {
            ++errors;
            errored = true;
            msg = (msg + prop + 'Error: ' + (err.error.stack || err.error.message));
            msg += '\n---\n';
          }
        });
      });

      if (errored) {
        errorMessages = _.isString(errorMessages) ? (errorMessages + msg) : msg;
      }

      // Process assertions
      _.forEach(execution.assertions, function (assertion) {
        var name = assertion.assertion,
          err = assertion.error,
          skipped = assertion.skipped;

        tests[name] = {
          failures: [],
          skipped: false
        };

        if (err) {
          ++failures;
          (_.isArray(tests[name].failures) ? tests[name].failures.push(err) : (tests[name].failures = [err]));
        } else if (skipped) {
          ++skips;
          tests[name].skipped = true
        }
      });

      if (execution.assertions) {
        suite.att('tests', execution.assertions.length);
      } else {
        suite.att('tests', 0);
      }

      suite.att('failures', failures);
      suite.att('skipped', skips);
      suite.att('errors', errors);
    });

    suite.att('time', _.mean(_.map(executions, function (execution) {
      executionTime = _.get(execution, 'response.responseTime') / 1000 || 0;
      testSuitesExecutionTime += executionTime;
      return executionTime;
    })).toFixed(3));

    errorMessages && suite.ele('system-err').dat(errorMessages);

    _.forOwn(tests, function (test, name) {

      var testcase = suite.ele('testcase'),
        failures = test.failures,
        skipped = test.skipped,
        failure, skip;

      testcase.att('name', name);
      testcase.att('time', executionTime.toFixed(3));

      // Set the same classname for all the tests
      testcase.att('classname', getFullName(currentItem));

      if (skipped) {
        skip = testcase.ele('skipped');
      }

      if (failures && failures.length) {
        failure = testcase.ele('failure');
        failure.att('type', 'AssertionFailure');
        failure.dat('Failed ' + failures.length + ' times.');
        failure.dat('Collection JSON ID: ' + collection.id + '.');
        failure.dat('Collection name: ' + collection.name + '.');
        failure.dat('Request name: ' + getFullName(currentItem) + '.');
        failure.dat('Test description: ' + name + '.');
        if (failures.length !== 0) {
          failure.att('message', failures[0].message);
          failure.dat('Error message: ' + failures[0].message + '.');
          failure.dat('Stacktrace: ' + failures[0].stack + '.');
        }
      }
    });
  });

  root.att('time', testSuitesExecutionTime.toFixed(3));

  return root;
}

module.exports = reporter
