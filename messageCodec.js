"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleMessageCodec = exports.Message = void 0;
var Message = /** @class */ (function () {
    function Message(headers, payload) {
        // Ensure the payload does not exceed 256 KiB
        if (payload.length > 256 * 1024) {
            throw new Error('Payload size exceeds the maximum limit of 256 KiB');
        }
        // Ensure headers count does not exceed 63
        if (headers.size > 63) {
            throw new Error('The number of headers cannot exceed 63');
        }
        // Validate each header name and value
        headers.forEach(function (value, name) {
            if (typeof name !== 'string' || typeof value !== 'string') {
                throw new Error('Header names and values must be strings');
            }
            if (name.length === 0 || value.length === 0) {
                throw new Error('Header names and values cannot be empty');
            }
            if (name.length > 1023 || value.length > 1023) {
                throw new Error('Header names and values must be less than 1024 bytes each');
            }
        });
        this.headers = headers;
        this.payload = payload;
    }
    return Message;
}());
exports.Message = Message;
var SimpleMessageCodec = /** @class */ (function () {
    function SimpleMessageCodec() {
    }
    SimpleMessageCodec.prototype.encode = function (message) {
        // Initialize an array to hold the encoded headers
        var headerParts = [];
        var headersLength = 1; // 1 byte for the header count
        // Encode headers
        message.headers.forEach(function (value, name) {
            var nameBytes = new TextEncoder().encode(name);
            var valueBytes = new TextEncoder().encode(value);
            // Headers length includes the size of the length fields (4 bytes per header)
            headersLength += 4 + nameBytes.length + valueBytes.length;
            // Encode header name length and content
            headerParts.push(new Uint8Array(new Uint16Array([nameBytes.length]).buffer));
            headerParts.push(nameBytes);
            // Encode header value length and content
            headerParts.push(new Uint8Array(new Uint16Array([valueBytes.length]).buffer));
            headerParts.push(valueBytes);
        });
        // Allocate buffer for the entire message
        var totalLength = headersLength + 4 + message.payload.length; // 4 bytes for the payload length field
        var messageBuffer = new Uint8Array(totalLength);
        var offset = 0;
        // Encode header count
        messageBuffer[offset++] = message.headers.size;
        // Copy encoded headers to the message buffer
        headerParts.forEach(function (part) {
            messageBuffer.set(part, offset);
            offset += part.length;
        });
        // Encode payload length
        new DataView(messageBuffer.buffer).setUint32(offset, message.payload.length, true);
        offset += 4;
        // Copy payload to the message buffer
        messageBuffer.set(message.payload, offset);
        return messageBuffer;
    };
    SimpleMessageCodec.prototype.decode = function (data) {
        if (data.length < 5) { // Minimum length to have at least one header and the payload length field
            throw new Error('Data is too short to contain a valid message');
        }
        var offset = 0;
        var headers = new Map();
        // Decode header count
        var headerCount = data[offset++];
        if (headerCount > 63) {
            throw new Error('Header count exceeds the maximum of 63');
        }
        // Decode headers
        for (var i = 0; i < headerCount; i++) {
            if (offset + 2 > data.length) {
                throw new Error('Data is too short to contain header lengths');
            }
            var nameLength = new DataView(data.buffer, data.byteOffset + offset, 2).getUint16(0, true);
            offset += 2;
            if (offset + nameLength > data.length) {
                throw new Error('Data is too short to contain header names');
            }
            var name_1 = new TextDecoder().decode(data.subarray(offset, offset + nameLength));
            offset += nameLength;
            if (offset + 2 > data.length) {
                throw new Error('Data is too short to contain value lengths');
            }
            var valueLength = new DataView(data.buffer, data.byteOffset + offset, 2).getUint16(0, true);
            offset += 2;
            if (offset + valueLength > data.length) {
                throw new Error('Data is too short to contain header values');
            }
            var value = new TextDecoder().decode(data.subarray(offset, offset + valueLength));
            offset += valueLength;
            headers.set(name_1, value);
        }
        if (offset + 4 > data.length) {
            throw new Error('Data is too short to contain the payload length');
        }
        // Decode payload length
        var payloadLength = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
        offset += 4;
        if (offset + payloadLength > data.length) {
            throw new Error('Data is too short to contain the payload');
        }
        // Extract payload
        var payload = data.subarray(offset, offset + payloadLength);
        return new Message(headers, payload);
    };
    return SimpleMessageCodec;
}());
exports.SimpleMessageCodec = SimpleMessageCodec;
