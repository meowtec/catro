'use strict'

import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as express from 'express'
import { resource, createLogger } from '../utils/'
import { readStreamAll } from '../../catro-utils'

const certPath = (filename) => resource('cert-server/' + filename)

const log = createLogger('Test:server')

const app = express()

app.get('/0x00', function(req, res) {
  res.setHeader('my-header', '00')
  res.send('hello world, protero!')
})

app.post('/0x01', function(req, res) {
  res.setHeader('my-header', req.headers['x-request'])
  req.pipe(res)
})

app.all('/0x02', function(req, res) {
  readStreamAll(req).then((data) => {
    const body = data.toString()

    res.send({
      headers: req.headers,
      body: body
    })
  })
})

export function createHTTPServer(port) {
  const server = http.createServer(app)
  server.listen(port, () => {
    log.info('HTTP  server run:', 'http://127.0.0.1:' + port)
  })
  return server
}

export function createHTTPSServer(port) {
  const options = {
    key: fs.readFileSync(certPath('localhost.key')),
    cert: fs.readFileSync(certPath('localhost.crt'))
  }

  const server = https.createServer(options, app)

  server.listen(port, () => {
    log.info('HTTPS server run:', 'https://127.0.0.1:' + port)
    log.info('Root CA at:', certPath('rootca.cert'), 'Please install root CA on your OS.')
  })

  return server
}
