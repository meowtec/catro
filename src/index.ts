'use strict'

import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as path from 'path'
import { EventEmitter } from 'events'
import RequestHandler from './request'
import CertManager from './cert'
import * as _ from './utils/utils'
import HttpsServerPool from './https-server-pool'
import { Headers, Request, Response } from './typed'
import * as logger from 'minilog'

const LOG = logger('index')

export interface Options {
  /** proxy port */
  port: number

  certPath: string

  /** whether proxy ssl */
  https?: { (host: string): boolean } | boolean,
  rejectUnauthorized?: boolean
}


export default class Proxy extends EventEmitter {

  httpServer = http.createServer();

  private options: Options;

  private httpsServerPool: HttpsServerPool;

  private certManager: CertManager;

  constructor(options: Options) {
    super()

    this.options = options
    this.certManager = new CertManager({
      rootPath: options.certPath
    })
  }

  /**
   * Any error on start can be catched here.
   */
  public async start() {
    await this.certManager.init()
    await this.initMainServer()
    await this.initHttpsServers()
  }

  private initMainServer() {
    return new Promise((resolve, reject) => {
      const proxy = http.createServer()

      this.httpServer = proxy

      proxy.on('request', this.handleRequest.bind(this, 'http'))
      proxy.on('connect', this.handleConnect.bind(this))
      proxy.on('clientError', (error: Error, socket: net.Socket) => {
        LOG.error('Proxy on:clientError: ', error, error.stack)
      })

      proxy.listen(this.options.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err)
        }
        else {
          LOG.info('Proxy Start: 127.0.0.1:' + this.options.port)
          resolve(proxy)
        }
      })
    })
  }

  private initHttpsServers() {
    this.httpsServerPool = new HttpsServerPool({
      certManager: this.certManager
    })

    this.httpsServerPool.on('new', (server: https.Server, domain) => {
      const port = server.address().port
      LOG.info('HTTPS server pool new: ' + domain + ', local PORT: ' + port)

      server.on('request', this.handleRequest.bind(this, 'https'))

      server.on('clientError', (error: Error, socket: net.Socket) => {
        LOG.error('HTTPS server on:clientError: ', error, error.stack)
      })
    })
  }

  private handleRequest(protocol: string, req: http.IncomingMessage, res: http.ServerResponse) {
    LOG.info('Proxy on:request: ' + req.url)

    const requestHandler: RequestHandler = new RequestHandler({
      protocol, req, res,
      rejectUnauthorized: this.options.rejectUnauthorized,
      certManager: this.certManager
    })

    this.emit('open', requestHandler)
  }

  private handleConnect(req: http.ServerRequest, socket: net.Socket) {
    LOG.info('Proxy on:connect: ' + req.url)

    ; (async () => {
      const hostInfo = _.parseHost(req.url)
      let tcpAddr: {
        host: string
        port: number
      }

      const https = this.options.https
      if (https === true || (https instanceof Function && https(req.url))) {
        const server = await this.httpsServerPool.getServer(hostInfo.hostname)

        tcpAddr = {
          host: '127.0.0.1',
          port: server.address().port
        }
      }
      else {
        tcpAddr = {
          host: hostInfo.hostname,
          port: hostInfo.port
        }
      }

      const hostString = tcpAddr.host + ':' + tcpAddr.port
      LOG.info('Client want connect: ' + req.url + ', will connect to: ' + hostString)

      const upSocket = net.connect(tcpAddr)

      upSocket.on('connect', function() {
        socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8')
        upSocket.pipe(socket)
        socket.pipe(upSocket)
      })

      upSocket.on('error', (error: Error) => {
        LOG.error('Socket on:error: ' + hostString, error, error.stack)
      })

      upSocket.on('timeout', () => {
        upSocket.destroy()
        LOG.warn('Socket on:timeout: ' + hostString)
      })
    })()
    .catch((error) => {
      LOG.error('HandleConnect error: ', error.toString())
    })

  }

  get CACertPath() {
    return this.certManager.CACertPath
  }
}

/**
 * export interfaces that could be used by external.
 */
export {
  Headers, Request, Response
}

// export interface RequestHandler extends RequestHandler {}
export type RequestHandler = RequestHandler
