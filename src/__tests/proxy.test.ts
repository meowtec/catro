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

  it('replace request headers', (done) => {

    proxy.once('open', (requestHandler: RequestHandler) => {
      requestHandler.replaceRequest = (request) => {
        return Object.assign({}, request, {
          headers: {
            'x-request': 'request-replace-x'
          }
        })
      }
    })

    request(httpServer + '/0x02', (error, response, data) => {
      const json = JSON.parse(data)
      assert.equal(json.headers['x-request'], 'request-replace-x')
      done()
    })

  })

  it('replace request body and method', (done) => {

    proxy.once('open', (requestHandler: RequestHandler) => {
      requestHandler.replaceRequest = (request) => {
        return Object.assign({}, request, {
          body: 'replaced.',
          method: 'POST'
        })
      }
    })

    request(httpServer + '/0x02', (error, response, data) => {
      const json = JSON.parse(data)
      assert.equal(json.body, 'replaced.')
      done()
    })

  })


  it('replace response status and headers', (done) => {

    proxy.once('open', (requestHandler: RequestHandler) => {
      requestHandler.replaceResponse = (response) => {
        return Object.assign({}, response, {
          status: 404,
          headers: {
            'x-replace': 'y'
          }
        })
      }
    })

    request(httpServer + '/0x00', (error, response, data) => {
      assert.equal(response.statusCode, 404)
      assert.equal(response.headers['x-replace'], 'y')
      done()
    })

  })

  it('replace response body', (done) => {

    proxy.once('open', (requestHandler: RequestHandler) => {
      requestHandler.replaceResponse = (response) => {
        return Object.assign({}, response, {
          body: '123456'
        })
      }
    })

    request(httpServer + '/0x00', (error, response, data) => {
      assert.equal(data, '123456')
      done()
    })

  })

  it('handler events', (done) => {
    const arr = [0, 0, 0]
    proxy.once('open', (requestHandler: RequestHandler) => {
      requestHandler.on('requestFinish', () => arr[0] = 1)
      requestHandler.on('response', () => arr[1] = 1)
      requestHandler.on('finish', () => {
        arr[2] = 1

        assert.deepEqual(arr, [1, 1, 1])
        done()
      })
    })

    request(httpServer + '/0x00', (error, response, data) => {})

  })

})
