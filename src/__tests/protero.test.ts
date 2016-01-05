'use strict'

import * as assert from 'assert'
import * as fs from 'fs'
import * as http from 'http'
import * as request from 'request'
import Proxy from '../index'
import { createHTTPServer, createHTTPSServer } from './server/server'

const PROXY_PORT = 10069
const HTTP_PORT = 10080
const SSL_PORT = 10443

const localhost = '127.0.0.1'

Proxy.certRoot = './cert'

const HTTPServer = createHTTPServer(HTTP_PORT)
const HTTPSServer = createHTTPSServer(SSL_PORT)

const proxy = new Proxy({
  port: PROXY_PORT
})

const req = request.defaults({
  proxy: 'http://' + localhost + ':' + PROXY_PORT
})

describe('#proxy', () => {
  const httpServer = 'http://' + localhost + ':' + HTTP_PORT

  it('should get correct response', (done) => {
    req(httpServer + '/0x00', (error, response, data) => {
      assert.equal(data, 'hello world, protero!')
      done()
    })
  })

})
