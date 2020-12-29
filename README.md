[![Unix Build Status][ci-img]][ci-url]
[![Windows Build Status][ci-win-img]][ci-win-url]
[![Code Climate][clim-img]][clim-url]

# haraka-plugin-batv-etcd-config

This Bounce Address Tag Validation plugin uses "etcd" to access to its config variables, different from the original batv plugin: https://github.com/PartyPancakess/haraka-plugin-batv

Also, it uses a changed version of srs.js script: https://www.npmjs.com/package/srs.js

& IMPORTANT: this plugin must appear in  `config/plugins`  before other plugins that run on hook_rcpt

## How it works
Assume that the user uses the address example@domain.com and will send an e-mail.

Before the e-mail is sent, example@domain.com will automatically change to:
prvs=tagvalue=example@domain.com

If the e-mail bounces, after checking if the key is correct or not or whether there is a key at all, it will be forwarded to example@domain.com.


## Configuration
The running etcd server must have 2 variables exclusively for this plugin: config_batv_secret and config_batv_maxAge. 
The value of "config_batv_secret" must be a string, which is the secret key of the srs.
The value of "config_batv_maxAge" must contain a string ("day" or "second"), which determines the type of the maximum age, and an integer, separated by a hyphen.
Below can be found example cases:
```
config_batv_secret: "asecretkey"
config_batv_maxAge: "day-21"

or

config_batv_secret: "asecretkey"
config_batv_maxAge: "second-1814400"
```


## Example etcd Configuration
```
etcdctl put config_batv_maxAge day-7
etcdctl put config_batv_secret secretkey
```





<!-- leave these buried at the bottom of the document -->
[ci-img]: https://github.com/haraka/haraka-plugin-batv-etcd-config/workflows/Plugin%20Tests/badge.svg
[ci-url]: https://github.com/haraka/haraka-plugin-batv-etcd-config/actions?query=workflow%3A%22Plugin+Tests%22
[ci-win-img]: https://github.com/haraka/haraka-plugin-batv-etcd-config/workflows/Plugin%20Tests%20-%20Windows/badge.svg
[ci-win-url]: https://github.com/haraka/haraka-plugin-batv-etcd-config/actions?query=workflow%3A%22Plugin+Tests+-+Windows%22
[clim-img]: https://codeclimate.com/github/haraka/haraka-plugin-batv-etcd-config/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-plugin-batv-etcd-config
[npm-img]: https://nodei.co/npm/haraka-plugin-batv-etcd-config.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-batv-etcd-config
