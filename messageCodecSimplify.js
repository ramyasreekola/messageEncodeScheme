var Message = /** @class */ (function () {
    function Message(headers, payload) {
        var _this = this;
        if (headers.size > 63)
            throw new Error("A message cannot have more than 63 headers.");
        headers.forEach(function (value, key) {
            _this.validateHeader(key, value);
        });
        if (payload.length > 256 * 1024)
            throw new Error("Payload cannot exceed 256 KiB.");
        this.headers = headers;
        this.payload = payload;
    }
    Message.prototype.validateHeader = function (key, value) {
        if (key.length > 1023 || value.length > 1023) {
            throw new Error("Header names and values must be within 1023 bytes.");
        }
        if (key.includes(String.fromCharCode(31)) || value.includes(String.fromCharCode(31))) {
            throw new Error("Header names and values cannot contain unit separator character.");
        }
    };
    return Message;
}());
var SimpleMessageCodec = /** @class */ (function () {
    function SimpleMessageCodec() {
        this.unitSeparator = String.fromCharCode(31); // ASCII 31
        this.recordSeparator = String.fromCharCode(30); // ASCII 30
    }
    SimpleMessageCodec.prototype.encode = function (message) {
        var _this = this;
        var headersArray = [];
        message.headers.forEach(function (value, key) {
            headersArray.push("".concat(key).concat(_this.unitSeparator).concat(value));
        });
        var headersString = headersArray.join(this.unitSeparator) + this.recordSeparator;
        var headerBuffer = this.asciiToUint8Array(headersString);
        var messageBuffer = new Uint8Array(headerBuffer.length + message.payload.length);
        messageBuffer.set(headerBuffer, 0);
        messageBuffer.set(message.payload, headerBuffer.length);
        return messageBuffer;
    };
    SimpleMessageCodec.prototype.decode = function (data) {
        var recordSeparatorIndex = data.indexOf(30); // ASCII 30
        if (recordSeparatorIndex === -1)
            throw new Error("Invalid message format: no record separator found.");
        var headersBuffer = data.slice(0, recordSeparatorIndex);
        var payloadBuffer = data.slice(recordSeparatorIndex + 1);
        var headersString = this.uint8ArrayToAscii(headersBuffer);
        var headersArray = headersString.split(this.unitSeparator);
        var headers = new Map();
        if (headersArray.length % 2 !== 0)
            throw new Error("Invalid headers format.");
        for (var i = 0; i < headersArray.length; i += 2) {
            var key = headersArray[i];
            var value = headersArray[i + 1];
            headers.set(key, value);
        }
        return new Message(headers, payloadBuffer);
    };
    SimpleMessageCodec.prototype.asciiToUint8Array = function (str) {
        var buffer = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
            var charCode = str.charCodeAt(i);
            if (charCode > 127)
                throw new Error("Non-ASCII character encountered.");
            buffer[i] = charCode;
        }
        return buffer;
    };
    // Helper method to convert Uint8Array to ASCII string
    SimpleMessageCodec.prototype.uint8ArrayToAscii = function (buffer) {
        // Initialize an empty string to accumulate characters
        var result = "";
        // Loop over each byte in the buffer
        for (var i = 0; i < buffer.length; i++) {
            // Convert the byte to its corresponding ASCII character and append to the string
            result += String.fromCharCode(buffer[i]);
        }
        // Return the resulting string
        return result;
    };
    return SimpleMessageCodec;
}());
