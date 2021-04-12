"use strict";

var crypto = require("crypto");

// This timestamp code is based on the C libsrs2 implementation.
var timeBaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  timeSize = 2,
  timeBaseBits = 5,
  timePrecision = 1, // second based
  timeSlots = (1<<(timeBaseBits<<(timeSize-1))),
  validSeparators = "=";

function makeTimestamp() {
  var now = Math.round(Date.now() / 1000 / timePrecision);
  var str = timeBaseChars[now & ((1 << timeBaseBits) - 1)];
  now = now >> timeBaseBits;
  str = timeBaseChars[now & ((1 << timeBaseBits) - 1)] + str;
  return str;
}

function createHash(secret, timestamp, domain, local) {
  var hmac = crypto.createHmac("sha1", secret.toString());
  hmac.update(timestamp);
  hmac.update(domain);
  hmac.update(local);

  return hmac.digest("hex").substring(0, 4);
}

function checkTimestamp(str, maxAge) {
  var then = 0;
  for (var i = 0; i < str.length; i++) {
    then = (then << timeBaseBits) | timeBaseChars.indexOf(str[i].toUpperCase());
  }

  var now = Math.round(Date.now() / 1000 / timePrecision) % timeSlots;
  while(now < then) {
    now = now + timeSlots;
  }
  return now <= then + maxAge;
}

function SRS(options) {
  options = options || {};
  this.secret = options.secret;
  this.separator = (options.separator || "=")[0];
  this.maxAge = options.maxAge || (21 * 24 * 60 * 60); // 21 days
  this.secretCount = options.secretCount;
  this.secretList = options.secretList;

  if (!this.secret) {
    throw new TypeError("A secret must be provided");
  }

  if (validSeparators.indexOf(this.separator) < 0) {
    throw new TypeError("Invalid separator");
  }

  this.prvsRe = new RegExp("prvs=" + 
                            "([" + timeBaseChars + "]{2})" + "([0-9a-f]{4})=([0-9]+)=" + 
                            "(.*)");
}

SRS.prototype.isPrvs = function(local) {
  return local.indexOf("prvs") === 0;
};

SRS.prototype.rewrite = function(local, domain) {
  var timestamp = makeTimestamp();
  var hash = createHash(this.secret, timestamp, domain, local);    

  return "prvs=" + timestamp + hash + "=" + this.secretCount + "=" + local;
};

SRS.prototype.reverse = function(address, addressDomain) {
  var matches, hash, timestamp, domain, local, expectedHash, secretID;

  if (this.isPrvs(address)) {
    matches = this.prvsRe.exec(address);
    if (!matches) {
      // throw new TypeError("Unrecognized prvs format");
      return null;
    }
    
    timestamp = matches[1];
    hash = matches[2];
    secretID = matches[3];
    local = matches[4];
    domain = addressDomain;

    var usedSecret = this.secret;
    if(secretID <= this.secretList.length) {
      usedSecret = this.secretList[secretID-1];
    }

    expectedHash = createHash(usedSecret, timestamp, domain, local);
    if (expectedHash !== hash) {
      // throw new TypeError("Invalid signature");
      return null;
    }

    if (!checkTimestamp(timestamp, this.maxAge)) {
      // throw new TypeError("Address has expired");
      return null;
    }

    return [local, domain];
  }

  return null;
};

module.exports = SRS;
