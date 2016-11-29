'use strict';

var highOrder = require('high-order');
var stream = require('stream');

var bufferSize = 1024;

var NL = '\n'.charCodeAt(0);
var CR = '\r'.charCodeAt(0);

function BufferPool(size) {
	this.cursor = 0;
	this.bufferSize = size;
	this.pool = [new Buffer(this.bufferSize)];
}

BufferPool.prototype = {
	render: function (rtrim) {
		rtrim = rtrim || 0;
		var totalLength = this.cursor - rtrim;
		var bufCount = Math.ceil(totalLength / this.bufferSize);
		var minimizedPool = this.pool.slice(0, bufCount);
		var result = Buffer.concat(minimizedPool, totalLength);
		this.clear();
		return result;
	},

	clear: function () {
		this.cursor = 0;
	},

	writeBuffer: function (buf) {
		for (var i = 0, len = buf.length; i < len; i++) {
			this.write(buf[i]);
		}
	},

	write: function (c) {
		var bufi = Math.floor(this.cursor / this.bufferSize);
		var buf = this.pool[bufi];
		if (!buf) {
			buf = this.pool[bufi] = new Buffer(this.bufferSize);
		}

		buf[this.cursor++ % this.bufferSize] = c;
	}
};

function consumerStream() {
	/*
		A note on utf-8 compatibility:

		This class is utf-8 compatible, and seems to be
		pretty performant in being so. It doesn't do
		any decoding or whatnot, but simply skips over
		utf-8 continuation characters.
	*/

	var self = new stream.Writable();
	var pool = new BufferPool(bufferSize);
	var line = 1;
	var col = 1;

	self._write = function (buf, encoding, cb) {
		for (var i = 0, len = buf.length; i < len; i++) {
			var c = buf[i];

			if (c !== NL && c !== CR) {
				pool.write(c);
			}

			// skip continuation bytes and optimize over utf high-order characters.
			// we can do this because the only two characters we ever look for is \n,
			// which is a simple ASCII character.
			var utf8type = highOrder(c);
			if (utf8type === 0) {
				continue;
			} else if (utf8type > 1) {
				++col;
				i += utf8type - 1;
				continue;
			}

			var printable = c >= 32;

			if (printable) {
				++col;
			} else if (c === NL) {
				col = 1;
				self.emit('line', pool.render(), line);
				++line;
			}
		}

		cb();
	};

	self.on('finish', function () {
		if (pool.cursor !== 0) {
			self.emit('line', pool.render(), line);
		}
	});

	return self;
}

module.exports = consumerStream;
