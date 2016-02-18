'use strict'

export function debounce(wait: number, fun0?: Function) {
  let timer

  return (func1?: Function) => {
    clearTimeout(timer)
    const fun = func1 || fun0

    fun && (timer = setTimeout(fun, wait))
  }
}

export function parseHost(host: string) {
  const [hostname, port] = host.split(':')
  return {
    hostname: hostname,
    port: parseInt(port || '80', 10)
  }
}
