var _ = require('lodash'),
  reporter = require('./lib/reporter.js'),
  Junit5Reporter;

Junit5Reporter = function (newman, reporterOptions) {
  newman.on('beforeDone', function () {

    var root;

    root = reporter(newman)

    newman.exports.push({
      name: 'junit5-reporter',
      default: 'newman-run-report.xml',
      path: reporterOptions.export,
      content: root.end({
        pretty: true,
        indent: '  ',
        newline: '\n',
        allowEmpty: false
      })
    });
  });
};

module.exports = Junit5Reporter;
