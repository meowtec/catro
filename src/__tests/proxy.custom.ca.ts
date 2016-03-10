'use strict'

import * as path from 'path'
import Proxy from '../index'
import * as fs from 'fs'
import * as assert from 'assert'

const PROXY_PORT = 10169

const KEY = fs.readFileSync(path.resolve(__dirname, 'resources/cert-server/rootca.key'))
const CERT = fs.readFileSync(path.resolve(__dirname, 'resources/cert-server/rootca.crt'))

const proxy = new Proxy({
  port: PROXY_PORT,
  https: true,
  rejectUnauthorized: false,
  certPath: path.resolve(__dirname, './cert'),
  ca: {
    key: KEY,
    cert: CERT
  }
})

describe('#proxy:start', () => {
  it('should use custom CA', (done) => {
    proxy.start().then(() => {
      assert.equal(fs.readFileSync(proxy.CACertPath).toString(), CERT.toString())
      done()
    }, done)
  })
})

