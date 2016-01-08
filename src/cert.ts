'use strict'

import * as path from 'path'
import * as mkdirp from 'mkdirp'
import { spawn, ChildProcess } from 'child_process'
import { fs } from './utils/promisify'
import * as logger from 'minilog'

const LOG = logger('cert')

/** return Error */
const spawnError = (childProcess, err) => {
  var error = new Error('Spawn error:\n' + childProcess.spawnargs.join(' '))
  error.name = 'SpawnError'
  error.message = err.message
  return err
}

/** wrap childProcess to promise */
const promisifyChildProcess = (childProcess: ChildProcess) => {
  return new Promise((resolve, reject) => {
    // childProcess.stderr.pipe(process.stdout)

    childProcess.on('close', (err) => {
      err ? reject(spawnError(childProcess, err)) : resolve()
    })
  })
}

export interface KeyCertPair {
  key: Buffer
  cert: Buffer
}

export class CertManager {

  rootPath: string
  _setted: boolean

  constructor() {
    this._setted = false
  }

  setup(rootPath) {
    this.rootPath = rootPath
    mkdirp.sync(rootPath)
    this.initCA()

    this._setted = true
  }

  get setted() {
    return this._setted
  }

  get rootCAPath() {
    return this.rootPath + '/rootca.key'
  }

  // 生成 CA 根证书
  private genCAKey() {
    return spawn('openssl', [
      'genrsa',
      '-out', this.rootPath + '/rootca.key',
      '2048'
    ])
  }

  // 给 ROOT CA key 自签名得到证书
  private genCACert() {
    return spawn('openssl', [
      'req',
      '-new', '-x509', '-sha256',
      '-days', '9999',
      '-key', this.rootPath + '/rootca.key',
      '-out', this.rootPath + '/rootca.crt',
      '-subj', '/C=CN/ST=Zhejiang/L=Hangzhou/O=Meowtec/OU=Meowtec/CN=MeowtecCA/emailAddress=bertonzh@gmail.com'
    ])
  }

  private genKey(domain: string) {
    return spawn('openssl', [
      'genrsa',
      '-out', `${this.rootPath}/${domain}.key`,
      '2048'
    ])
  }

  private genReq(domain: string) {
    return spawn('openssl', [
      'req',
      '-new',
      '-key', `${this.rootPath}/${domain}.key`,
      '-out', `${this.rootPath}/${domain}.csr`,
      '-subj', `/C=CN/ST=Zhejiang/L=Hangzhou/O=Meowtec/OU=Meowtec/CN=${domain}/emailAddress=bertonzh@gmail.com`
    ])
  }

  private genCert(domain: string) {
    return spawn('openssl', [
      'x509',
      '-req',
      '-days', '9999',
      '-sha256',
      '-in', `${this.rootPath}/${domain}.csr`,
      '-CA', `${this.rootPath}/rootca.crt`,
      '-CAkey', `${this.rootPath}/rootca.key`,
      '-CAcreateserial',
      '-out', `${this.rootPath}/${domain}.crt`
    ])
  }

  async readCerts (domain: string) {
    let key = await fs.readFile(`${this.rootPath}/${domain}.key`)
    let cert = await fs.readFile(`${this.rootPath}/${domain}.crt`)
    return {
      key: key,
      cert: cert
    }
  }

  rootCAExist() {
    return fs.exists(this.rootPath + '/rootca.key')
  }

  async getCerts(domain: string) {
    let certs: KeyCertPair
    /**
     * TODO: use exists()
     */
    try {
      certs = await this.readCerts(domain)
    }
    catch (e) {
      await promisifyChildProcess(this.genKey(domain))
      await promisifyChildProcess(this.genReq(domain))
      await promisifyChildProcess(this.genCert(domain))
      await fs.unlink(this.rootPath + `/${domain}.csr`)
      certs = await this.readCerts(domain)
      LOG.info('CertPair Create: ' + domain)
    }

    return certs
  }

  private async initCA() {
    let isRootCAExist = await this.rootCAExist()
    if (!isRootCAExist) {
      await promisifyChildProcess(this.genCAKey())
      await promisifyChildProcess(this.genCACert())
      LOG.info('Root CA has been created! at: ' + this.rootPath + '/rootca.key')
    }
  }

}

export default new CertManager()
