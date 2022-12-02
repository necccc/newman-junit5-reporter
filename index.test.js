var newman = require("newman")
var fs = require('fs')

describe("reporter", () => {
  test("generate xml", (end) => {
    newman.run({
      collection: './test.postman_collection.json',
      reporters: 'junit5',
      reporter : { junit5: { export : './reports/results.xml' } }
    }, () => {
      var file = fs.readFileSync('./reports/results.xml', {
        encoding: 'utf8'
      })
      expect(file).toMatchSnapshot()
      end()
    })
  })
})
