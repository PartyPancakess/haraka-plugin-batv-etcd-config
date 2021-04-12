[![NPM][npm-img]][npm-url]

# haraka-plugin-batv-etcd-config

This Bounce Address Tag Validation plugin uses "etcd" to access to its config variables, different from the original batv plugin: https://github.com/PartyPancakess/haraka-plugin-batv

Also, it uses a changed version of srs.js script: https://www.npmjs.com/package/srs.js

& IMPORTANT: this plugin must appear in  `config/plugins`  before other plugins that run on hook_rcpt

## How it works
Assume that the user uses the address example@domain.com and will send an e-mail.

Before the e-mail is sent, example@domain.com will automatically change to:
prvs=tagvalue=d=example@domain.com
d: is the id (1 or more digits) of the secret key that is used to send the mail.

If the e-mail bounces, after checking if the key is correct or not or whether there is a key at all, it will be forwarded to example@domain.com.


## Configuration
The running etcd server must have 2 variables exclusively for this plugin: config/mta/batv/secret and config/mta/batv/maxAge. 
The value of "config/mta/batv/secret" must be a string, which is the secret key of the srs.
The value of "config/mta/batv/maxAge" must contain a string ("day" or "second"), which determines the type of the maximum age, and an integer, separated by a hyphen.
Below can be found example cases:
```
config/mta/batv/secret: "asecretkey"
config/mta/batv/maxAge: "day-21"

or

config/mta/batv/secret: "asecretkey"
config/mta/batv/maxAge: "second-1814400"
```

There is also a file in the plugin, named "history". This file holds all the previous secret keys. If the secret key in the etcd is changed while the haraka is running, history file is automatically updated. Changing the key while the haraka server is not running is not recommended. However, if it is done so, previous key(s) should be manually added at the end of the history file.


## Example etcd Configuration
```
etcdctl put config_batv_maxAge day-7
etcdctl put config_batv_secret secretkey
```





<!-- leave these buried at the bottom of the document -->
[npm-img]: https://nodei.co/npm/haraka-plugin-batv-etcd-config.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-batv-etcd-config
