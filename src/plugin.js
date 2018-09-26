var extension = new window.RemixExtension()

class Remixd {
  constructor (port) {
    this.port = port
    this.callbacks = {}
    this.callid = 0
    this.socket = null
    this.connected = false
  }

  online () {
    return this.socket !== null
  }

  close () {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  start (cb) {
    if (this.socket) {
      try {
        this.socket.close()
      } catch (e) {}
    }
    this.socket = new WebSocket('ws://localhost:' + this.port, 'echo-protocol') // eslint-disable-line
  }
    
  call (service, fn, args, callback) {
    this.ensureSocket((error) => {
      if (error) return callback(error)
      if (this.socket && this.socket.readyState === this.socket.OPEN) {
        var data = this.format(service, fn, args)
        this.callbacks[data.id] = callback
        this.socket.send(JSON.stringify(data))
      } else {
        callback('Socket not ready. state:' + this.socket.readyState)
      }
    })
  }

  ensureSocket (cb) {
    if (this.socket) return cb(null, this.socket)
    this.start((error) => {
      if (error) {
        cb(error)
      } else {
        cb(null, this.socket)
      }
    })
  }

  format (service, fn, args) {
    var data = {
      id: this.callid,
      service: service,
      fn: fn,
      args: args
    }
    this.callid++
    return data
  }
}

window.onload = function () {

  var remixd = new Remixd(65520)
  remixd.start()

  var truffle_init = function (cb) {
    remixd.call('truffle', 'init', {}, (error, output) => {
      cb(error, output)
    })
  }
  
  document.querySelector('input#truffleinit').addEventListener('click', function () {
    truffle_init((error, output) => {
      console.log(error, output)
    })
  })

  document.querySelector('input#truffletest').addEventListener('click', function () {
      remixd.call('truffle', 'test', {}, (error, output) => {
        if (error) {
          console.log(error)
        } else if (output) {
          console.log(output)
        }
      })
  })

}

