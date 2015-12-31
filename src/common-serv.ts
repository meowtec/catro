'use strict'

import * as http from 'http'
import * as url from 'url'
import * as _ from './utils/utils'
import certManager from './cert'

export default function serv(req: http.IncomingMessage, res: http.ServerResponse): any {
  let requestUrl = req.url

  let urlObj = url.parse(requestUrl)

  if (urlObj.pathname === '/ca.crt') {
    return certManager.getCerts('rootca').then(function(cert) {
      res.writeHead(200, {
        'Content-Type': 'application/x-x509-ca-cert'
      })
      res.end(cert.cert)
    })
  }
  else {
    return res.end('hello myproxy.')
  }
}
