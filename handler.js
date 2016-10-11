var Pusher = require('pusher')

var pusher = new Pusher(require('./config.pusher.json'))


module.exports.create = (event, context, cb) => {

  pusher.trigger('logging', 'create-preauth', {
    "headers": event.headers
  })

  const socket = event.query.socket
  if(!socket)
    return cb(new Error('[500] socket not provided'))

  // this could be freindlier, but this'll do for now
  const id = context.awsRequestId

  const auth = pusher.authenticate(socket, 'private-' + id).auth

  cb(null, {
    message: "auth for: " + 'private-' + id,
    id:id,
    auth
  })
}


/* proxy events & channels:
private-foo/client-bar -> public-foo/bar
*/

module.exports.proxy = (event, context, cb) => {

  // headers need to be lowercase
  var headers = {}
  Object.keys(event.headers).forEach(k => {
    headers[k.toLowerCase()] = event.headers[k]
  })

  var webhook = pusher.webhook({
    headers: headers,
    rawBody: JSON.stringify(event.body)
  })


  if(webhook.isValid()) {
    webhook.getData()
      .events.forEach(event => {
        if(
          event.name == 'client_event' &&
          event.channel.indexOf('private-') === 0 &&
          event.event.indexOf('client-') === 0
        )
          pusher.trigger(
            event.channel.replace('private-','public-'),
            event.event.replace('client-',''),
            event.data
          )
      })
  } else {
    return cb(new Error('[500] invalid webhook'))
  }

  cb(null, 'Not implemented')
}
