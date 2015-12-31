'use strict'

const assert = require("assert")
const _ = require('../built/utils/utils')

describe('#utils', () => {

  it('debounce with const function', (done) => {
    let test = 0

    let fun = _.debounce(15, () => test++)

    setTimeout(fun, 0)
    setTimeout(fun, 10)
    setTimeout(fun, 20)
    setTimeout(fun, 30)

    setTimeout(() => assert.equal(test, 0), 30)
    setTimeout(() => assert.equal(test, 1), 48)
    setTimeout(done, 50)
  })

  it('debounce with variable function', (done) => {
    let test = [0, 0, 0, 0]

    let fun = _.debounce(15)

    setTimeout(() => fun(() => test[0]++), 0)
    setTimeout(() => fun(() => test[1]++), 10)
    setTimeout(() => fun(() => test[2]++), 20)
    setTimeout(() => fun(() => test[3]++), 30)

    setTimeout(() => assert.deepEqual(test, [0, 0, 0, 0]), 30)
    setTimeout(() => assert.deepEqual(test, [0, 0, 0, 1]), 48)
    setTimeout(done, 50)
  })

  it('should parseHost parse host', () => {
    assert.deepEqual(_.parseHost('meowtec.com:1008'), {
      host: 'meowtec.com',
      port: 1008
    })

    assert.deepEqual(_.parseHost('meowtec.com'), {
      host: 'meowtec.com',
      port: 80
    })
  })

})
