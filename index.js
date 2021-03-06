// Put this plugin's name before all the rcpt_to plugins in the config/plugins file.
// This plugin requires haraka-necessary-helper-plugins to be in the same folder with it: https://github.com/PartyPancakess/haraka-necessary-helper-plugins
'use strict'

const Address = require('../haraka-necessary-helper-plugins/address-rfc2821').Address;

var SRS = require("./srs.js");
var rewriter;

const fs = require('fs');
const path = require('path');

const { Etcd3 } = require('../haraka-necessary-helper-plugins/etcd3');

const etcdSourceAddress = process.env.ETCD_ADDR || '127.0.0.1:2379';
const client = new Etcd3({hosts:etcdSourceAddress});

var secret_count = 1;
var secret_history = [];

exports.register = function () {
  this.inherits('queue/discard');

  this.load_batv_ini();
  
  this.register_hook('data_post', 'relay');
  this.register_hook('rcpt', 'rcpt');
}

exports.load_batv_ini = function () {
  const plugin = this;

  const tempConfig = {
    srs: {
        secret: 'asecretkey',
        maxAgeSeconds: '-1',
        maxAgeDays: '-1'
    }
  }
  plugin.cfg = tempConfig;

  client.get('config/mta/batv/secret').string()
  .then(secret => {
    if (secret) {
      plugin.cfg.srs.secret = secret;
    }
    else console.log("Something went wrong while reading config/mta/batv/secret from Etcd");
  });


  fs.readFile(path.resolve(__dirname, "history"), 'utf8' , (err, data) => {
    if (err) {
      console.error(err + " Check haraka-plugin-batv-etcd-config.");
      return;
    }
    var list = data.split('\n');
    if (list.length > 1 && !list[list.length-1]) list.splice(list.length-1, 1);
    if (list.length > 0) {
      secret_history = list;
      secret_count = secret_history.length + 1;
      this.createSrs(plugin);
    }
  });


  client.get('config/mta/batv/maxAge').string()
  .then(value => {
      if (value) {
        const age = value.split("-");

        if(age[0]==="day") {
          plugin.cfg.srs.maxAgeDays = age[1];
          plugin.cfg.srs.maxAgeSeconds = '-1';
        }
        else if(age[0]==="second") {
          plugin.cfg.srs.maxAgeSeconds = age[1];
          plugin.cfg.srs.maxAgeDays = '-1';
        }
        this.createSrs(plugin);
      }
      else console.log("Something went wrong while reading config/mta/batv/maxAge from Etcd");
    }
  );
  

  client.watch()
  .key('config/mta/batv/secret')
  .create()
  .then(watcher => {
    watcher
      .on('disconnected', () => console.log('disconnected...'))
      .on('connected', () => console.log('successfully reconnected!'))
      .on('put', res => {
        secret_history.push(plugin.cfg.srs.secret); // append the old secret to history list
        if (secret_history[0] === '') secret_history.splice(0, 1);
        plugin.cfg.srs.secret = res.value.toString();
        console.log('config/mta/batv/secret got set to:', res.value.toString());
        this.createSrs(plugin);

        fs.writeFile(path.resolve(__dirname, "history"), secret_history.join('\n'), err => {
          if (err) {
            console.error(err + " Check haraka-plugin-batv-etcd-config.");
            return;
          }
        })

      })
    });
  

  client.watch()
  .key('config/mta/batv/maxAge')
  .create()
  .then(watcher => {
    watcher
      .on('disconnected', () => console.log('disconnected...'))
      .on('connected', () => console.log('successfully reconnected!'))
      .on('put', res => {
        const age = res.value.toString().split("-");
        if(age[0]==="day") {
          plugin.cfg.srs.maxAgeDays = age[1];
          plugin.cfg.srs.maxAgeSeconds = '-1';
        }
        else if(age[0]==="second") {
          plugin.cfg.srs.maxAgeSeconds = age[1];
          plugin.cfg.srs.maxAgeDays = '-1';
        }
        console.log('config/mta/batv/maxAge got set to:', res.value.toString());
        this.createSrs(plugin);
      });
  });

  this.createSrs(plugin);
}

exports.rcpt = function (next, connection, params) { // Check the rcpt and decide if it is spam or not.
  var txn = connection.transaction;
  var toDeny = false;
  const plugin = this;
  if (!connection.relaying) { // incoming
    if (!txn.mail_from.isNull()) {
      if (rewriter.isPrvs(txn.rcpt_to[0].user)) {
        var oldAddress = txn.rcpt_to[0];
        var reversed = rewriter.reverse(oldAddress.user, oldAddress.host);

        if(!reversed) {
          toDeny = true;
        }
        else {
          txn.rcpt_to.pop();
          var sendTo = reversed[0] + "@" + reversed[1];
          txn.rcpt_to.push(new Address(`<${sendTo}>`));
        }
      }
    }
    else {
      var oldAddress = txn.rcpt_to[0];
      var reversed = rewriter.reverse(oldAddress.user, oldAddress.host);
      
      if(reversed === null || reversed === undefined || !reversed) {
        connection.logdebug(plugin, "marking " + txn.rcpt_to + " for drop");
        connection.transaction.notes.discard = true;
      }
      else {
        txn.rcpt_to.pop();
        var sendTo = reversed[0] + "@" + reversed[1];
        txn.rcpt_to.push(new Address(`<${sendTo}>`));
      }
    }
  }

  if (toDeny) next(DENYSOFT, "Address is not accepted!");
  else next();
}

exports.relay = function (next, connection) { // Change the sender address of outgoing e-mails.
  var txn = connection.transaction;
  if (connection.relaying) {    
    var oldMailFrom = txn.mail_from;
    var rewritten = rewriter.rewrite(oldMailFrom.user, oldMailFrom.host);
    var newMail = new Address(`<${rewritten}@${oldMailFrom.host}>`);

    txn.mail_from = newMail;
  }

  next();
}

exports.createSrs = function (plugin) {
  var maxAgeSeconds = 21 * 24 * 60 * 60; // default: 21 days 
  if(plugin.cfg.srs.maxAgeDays !== '-1') maxAgeSeconds = plugin.cfg.srs.maxAgeDays * 24 * 60 * 60;
  else if(plugin.cfg.srs.maxAgeSeconds !== '-1') maxAgeSeconds = plugin.cfg.srs.maxAgeSeconds;

  rewriter = new SRS({
    secret: plugin.cfg.srs.secret,
    maxAge: maxAgeSeconds,
    secretCount: secret_count,
    secretList: secret_history
  });
}
