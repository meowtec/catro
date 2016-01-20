'use strict'

import * as url from 'url'
import * as http from 'http'
import * as https from 'https'
import { EventEmitter } from 'events'

import commonServ from './common-serv'
import * as resources from './res'
import { Request, Response } from './typed'
import { emitterPromisify } from './utils/promisify'
import * as logger from 'minilog'

const LOG = logger('request')

/**
 * 如果是 production 环境，proxy 请求远程服务器时会忽略证书认证失败的情况
 */

export interface RequestHandlerOptions {
    protocol: string
    req: http.IncomingMessage
    res: http.ServerResponse
    rejectUnauthorized: boolean
  }

export default class RequestHandler extends EventEmitter {

  protocol: string
  req: http.IncomingMessage
  res: http.ServerResponse

  replaceRequest: (request: Request, requestHandler?: this) => Promise<Request> | Request
  replaceResponse: (request: Response, requestHandler?: this) => Promise<Response> | Response

  request: Request
  response: Response

  private willBeSent: boolean
  private rejectUnauthorized: boolean

  constructor(options: RequestHandlerOptions) {
    super()

    this.protocol = options.protocol
    this.req = options.req
    this.res = options.res
    this.rejectUnauthorized = options.rejectUnauthorized
    this.willBeSent = true

    if (this.req.url.startsWith('/') && this.protocol === 'http') {
      return commonServ(this.req, this.res)
    }

    this.initialRequest()
    setTimeout(() => this.start().catch(this.handleError.bind(this)))
  }

  private initialRequest() {
    const req = this.req
    const requestUrl = req.url
    const headers = req.headers

    let hostname: string, port: string, path: string

    delete headers['accept-encoding']

    if (this.protocol === 'http') {
      // TODO use: ({hostname, port, path} = url.parse(requestUrl))
      const url_ = url.parse(requestUrl)

      hostname = url_.hostname
      port = url_.port
      path = url_.path
    }
    else {
      // TODO use: [hostname, port] = headers['host'].split(':')
      const host = headers['host'].split(':')
      hostname = host[0]
      port = host[1]
      path = req.url
    }

    this.request = {
      method: this.req.method,
      hostname,
      port,
      path,
      headers: req.headers,
      body: req
    }
  }

  private async start() {

    if (!this.willBeSent) {
      this.emit('abort')
      return
    }

    let requestOptions: Request

    if (this.replaceRequest) {
      requestOptions = await this.replaceRequest(this.request, this)
    }
    else {
      requestOptions = this.request
    }

    const httpResponse = await this.sendRequest(requestOptions)

    this.initialResponse(httpResponse)

    this.emit('response', this.response)

    let responseOptions: Response
    if (this.replaceResponse) {
      responseOptions = await this.replaceResponse(this.response, this)
    }
    else {
      responseOptions = this.response
    }

    await this.sendResponse(responseOptions)

    this.emit('finish')
  }

  private initialResponse(response: http.IncomingMessage) {
    this.response = {
      status: response.statusCode,
      headers: response.headers,
      body: response
    }
  }

  private sendRequest(request: Request) {
    const factory = this.protocol === 'https' ? https : http

    const upRequest = factory.request(Object.assign({
      rejectUnauthorized: this.rejectUnauthorized
    }, request))

    const requestBody = request.body
    if (typeof requestBody === 'string' || Buffer.isBuffer(requestBody)) {
      upRequest.end(requestBody)
    }
    else {
      requestBody.pipe(upRequest)
    }

    upRequest.on('finish', () => this.emit('requestFinish'))

    /**
     * req.on('response')
     */
    return <Promise<http.IncomingMessage>>emitterPromisify(upRequest, 'response')

  }

  private sendResponse(response: Response) {
    const res = this.res
    res.writeHead(response.status, response.headers)

    const responseBody = response.body
    if (typeof responseBody === 'string' || Buffer.isBuffer(responseBody)) {
      res.end(responseBody)
    }
    else {
      responseBody.pipe(res)
    }

    return <Promise<any>>emitterPromisify(res, 'finish')
  }

  private handleError(error) {
    this.returnError(502)
    this.emit('error', error)
    LOG.error(error)
  }

  private returnError(code: number) {
    this.res.writeHead(code, {'Content-Type': 'text/html'})
    this.res.end(resources.get(code + '.html'))
  }

  public preventRequest() {
    this.willBeSent = false
  }

  public get url() {
    const request = this.request
    const portPart = request.port ? (':' + request.port) : ''

    return this.protocol + '://' + request.hostname + portPart + request.path
  }

}
