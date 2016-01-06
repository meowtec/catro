'use strict'

import * as assert from 'assert'
import * as fs from 'fs'
import * as http from 'http'
import * as Request from 'request'
import Proxy from '../index'
import RequestHandler from '../request'
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

const request = Request.defaults({
  proxy: 'http://' + localhost + ':' + PROXY_PORT
})

describe('#proxy', () => {
  const httpServer = 'http://' + localhost + ':' + HTTP_PORT

  it('normal response', (done) => {
    request(httpServer + '/0x00', (error, response, data) => {
      assert.equal(data, 'hello world, protero!')
      assert.equal(response.headers['content-type'], 'text/html; charset=utf-8')
      assert.equal(response.headers['my-header'], '00')
      done()
    })
  })

  it('normal request', (done) => {
    request({
      url: httpServer + '/0x01',
      method: 'POST',
      headers: {
        'x-request': 'foo'
      }
    }, (error, response, data) => {
      assert.equal(data, 'name-foo=value-foo&name-bar=value-bar')

      assert.equal(response.headers['my-header'], 'foo')
      done()
    }).form({
      'name-foo': 'value-foo',
      'name-bar': 'value-bar'
    })
  })

  // return
  // // TODO
  // it('replace response', (done) => {

  //   proxy.once('request', (requestHandler: RequestHandler) => {

  //   })

  // })

})
