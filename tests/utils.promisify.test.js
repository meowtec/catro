'use strict'

const assert = require("assert")
const sysfs = require('fs')
const path = require('path')
const promisify = require('../built/utils/promisify')
const fs = promisify.fs
const emitterPromisify = promisify.emitterPromisify
const EventEmitter = require('events').EventEmitter

describe('#promosify', () => {
  it('should promisify work', (done) => {
    function x(arg, callback) {
      setTimeout(() => {
        if (arg) {
          callback(null, arg)
        }
        else {
          callback('error')
        }

      }, 0)
    }
    const newX = promisify.default(x, null)

    newX(false)
    .catch((err) => {
      assert.equal(err, 'error')
      return newX(true)
    })
    .then((result) => assert.equal(result, true))
    .then(done, done)
  })
})

describe('#promosify.fs', () => {

  it('should fs.readFile success', (done) => {
    const file = path.resolve(__dirname, './plain/a.txt')
    const shouldBuffer = sysfs.readFileSync(file)

    fs.readFile(file)
    .then((buffer) => {
      assert.ok(buffer instanceof Buffer)
      assert.equal(shouldBuffer.toString(), buffer.toString())
    })
    .then(() => fs.readFile(file, 'utf-8'))
    .then((text) => assert.equal(text, 'this is text.'))
    .then(done, done)
  })

  it('should fs.readFile fail', (done) => {
    const file = path.resolve(__dirname, './plain/not_exist.txt')

    fs.readFile(file)
    .then((buffer) => assert.fail(), () => {})
    .then(done, done)
  })

  it('should fs.exists existed', (done) => {
    fs.exists(path.resolve(__dirname, './plain/a.txt'))
    .then((exist) => assert.equal(exist, true))
    .then(done, done)
  })

  it('should fs.exists not existed', (done) => {
    fs.exists(path.resolve(__dirname, './plain/not_exist.txt'))
    .then((exist) => assert.equal(exist, false))
    .then(done, done)
  })

  it('should fs.unlink success', (done) => {
    const file = path.resolve(__dirname, './plain/temp.txt')
    sysfs.writeFileSync(file, '123')

    fs.unlink(file)
    .then(() => {
      assert.equal(sysfs.existsSync(file), false)
    })
    .then(done, done)
  })

  it('should fs.unlink fail', (done) => {
    const file = path.resolve(__dirname, './plain/temp.txt')

    fs.unlink(file)
    .then(() => {
      assert.fail()
    }, () => {})
    .then(done, done)
  })

})

describe('#emitterPromisify', function() {
  it('should transform EventEmitter to promise', (done) => {
    const event = new EventEmitter()
    const promise = emitterPromisify(event, 'success')
    setTimeout(() => event.emit('success', 123))

    promise.then((result) => assert.equal(result, 123))
    .then(done, done)
  })
})


describe('#emitterPromisify with catch', function() {
  it('should transform EventEmitter to promise', (done) => {
    const event = new EventEmitter()
    const promise = emitterPromisify(event, 'success')
    setTimeout(() => event.emit('error', 'ERROR'))
    setTimeout(() => event.emit('success', 123))

    promise.then(() => assert.fail(), (err) => assert.equal(err, 'ERROR'))
    .then(done, done)
  })
})