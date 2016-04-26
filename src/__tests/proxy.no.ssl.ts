'use strict'

import Proxy, { RequestHandler, HttpsConnect } from '../index'
import * as assert from 'assert'
import * as Request from 'request'

import { createHTTPServer, createHTTPSServer } from './server/server'

const PROXY_PORT = 10269
const HTTP_PORT = 10280
const SSL_PORT = 10543

const localhost = '127.0.0.1'

createHTTPServer(HTTP_PORT)
createHTTPSServer(SSL_PORT)

const proxy = new Proxy({
  port: PROXY_PORT,
  https: false
})

const request = Request.defaults({
  strictSSL: false,
  // ca: fs.readFileSync(Proxy.rootCAPath),
  proxy: 'http://' + localhost + ':' + PROXY_PORT
})

describe('#proxy:no ssl', () => {

  it('Proxy start', (done) => {
    proxy.start().then((proxy) => {
      done()
    }, done)
  })

  it('Bypass https', (done) => {
    proxy.once('open', (requestHandler: RequestHandler) => {
      requestHandler.replaceRequest = (request) => {
        done(new Error('should not replaced'))

        return Object.assign({}, request, {
          body: 'replaced.',
          method: 'POST'
        })
      }
    })

    let connect: HttpsConnect
    proxy.once('connect', (connectMsg: HttpsConnect) => {
      connect = connectMsg
    })

    request('https://' + localhost + ':' + SSL_PORT + '/0x00', (error, response, data) => {
      assert.equal(data, 'hello world, protero!')
      assert.deepEqual(connect, {
        hostname: localhost,
        port: SSL_PORT,
        interrupt: false
      })
      done()
    })
  })
})

