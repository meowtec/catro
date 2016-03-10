'use strict'

import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import { EventEmitter } from 'events'
import RequestHandler from './request'
import CertManager from './utils/cert'
import * as _ from './utils/utils'
import HttpsServerPool from './https-server-pool'
import { Headers, Request, Response } from './typed'
import Logger from './utils/logger'

export interface Options {
  port: number
  certPath: string
  https?: { (host: string): boolean } | boolean
  rejectUnauthorized?: boolean
}

export default class Proxy extends EventEmitter {

  httpServer = http.createServer()

  private options: Options

  private httpsServerPool: HttpsServerPool

  private certManager: CertManager

  private creatLogger = Logger(this)

  private logger = this.creatLogger('index')

  constructor(options: Options) {
    super()

    this.options = options
    this.certManager = new CertManager({
      rootPath: options.certPath,
      logger: this.creatLogger('cert')
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
        this.logger.error('Proxy on:clientError: ', error, error.stack)
      })

      proxy.listen(this.options.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err)
        }
        else {
          this.logger.info('Proxy Start: 127.0.0.1:' + this.options.port)
          resolve(proxy)
        }
      })
    })
  }

  private initHttpsServers() {
    this.httpsServerPool = new HttpsServerPool({
      certManager: this.certManager,
      logger: this.creatLogger('server-pool')
    })

    this.httpsServerPool.on('new', (server: https.Server, domain) => {
      const port = server.address().port
      this.logger.info('HTTPS server pool new: ' + domain + ', local PORT: ' + port)

      server.on('request', this.handleRequest.bind(this, 'https'))

      server.on('clientError', (error: Error, socket: net.Socket) => {
        this.logger.error('HTTPS server on:clientError: ', error, error.stack)
      })
    })
  }

  private handleRequest(protocol: string, req: http.IncomingMessage, res: http.ServerResponse) {
    this.logger.info('Proxy on:request: ' + req.url)

    const requestHandler: RequestHandler = new RequestHandler({
      protocol, req, res,
      rejectUnauthorized: this.options.rejectUnauthorized,
      certManager: this.certManager,
      logger: this.creatLogger('handler')
    })

    this.emit('open', requestHandler)
  }

  private handleConnect(req: http.ServerRequest, socket: net.Socket) {
    const logger = this.logger
    logger.info('Proxy on:connect: ' + req.url)

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
      logger.info('Client want connect: ' + req.url + ', will connect to: ' + hostString)

      const upSocket = net.connect(tcpAddr)

      upSocket.on('connect', function() {
        socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8')
        upSocket.pipe(socket)
        socket.pipe(upSocket)
      })

      upSocket.on('error', (error: Error) => {
        logger.error('Socket on:error: ' + hostString, error, error.stack)
      })

      upSocket.on('timeout', () => {
        upSocket.destroy()
        logger.warn('Socket on:timeout: ' + hostString)
      })
    })()
    .catch((error) => {
      logger.error('HandleConnect error: ', error.toString())
    })

  }

  get CACertPath() {
    return this.certManager.CACertPath
  }
}

export {
  Headers, Request, Response
}

export type RequestHandler = RequestHandler
