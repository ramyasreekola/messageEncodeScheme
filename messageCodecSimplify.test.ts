import { Message, SimpleMessageCodec, MessageCodec } from './messageCodecSimplify';

describe('Message', () => {
    it('should create a valid Message object', () => {
        const headers = new Map<string, string>();
        headers.set('Header1', 'Value1');
        headers.set('Header2', 'Value2');

        const payload = new Uint8Array(100); // Payload of 100 bytes

        const message = new Message(headers, payload);

        expect(message.headers).toEqual(headers);
        expect(message.payload).toEqual(payload);
    });

    it('should throw an error for too many headers', () => {
        const headers = new Map<string, string>();
        for (let i = 0; i < 64; i++) {
            headers.set(`Header${i}`, `Value${i}`);
        }
        const payload = new Uint8Array(100);

        expect(() => new Message(headers, payload)).toThrow('The number of headers cannot exceed 63');
    });

    it('should throw an error for oversized payload', () => {
        const headers = new Map<string, string>();
        const payload = new Uint8Array(256 * 1024 + 1); // Payload exceeds 256 KiB

        expect(() => new Message(headers, payload)).toThrow('Payload cannot exceed 256 KiB.');
    });

    it('should throw an error for oversized header names and values', () => {
        const headers = new Map<string, string>();
        headers.set('Header1', 'Value1');
        const oversizedKey = 'a'.repeat(1024);
        const oversizedValue = 'b'.repeat(1024);
        headers.set(oversizedKey, oversizedValue);
        const payload = new Uint8Array(100);

        expect(() => new Message(headers, payload)).toThrow('Header names and values are limited to 1023 bytes.');
    });

    it('should throw an error for header names and values containing unit separator', () => {
        const headers = new Map<string, string>();
        headers.set('Header1', 'Value1');
        headers.set('Header2', 'Value2' + String.fromCharCode(31)); // Adding unit separator
        const payload = new Uint8Array(100);

        expect(() => new Message(headers, payload)).toThrow('Header names and values cannot contain unit separator character.');
    });
});

describe('SimpleMessageCodec', () => {
    const codec: MessageCodec = new SimpleMessageCodec();

    it('should encode and decode a Message object', () => {
        const headers = new Map<string, string>();
        headers.set('Header1', 'Value1');
        headers.set('Header2', 'Value2');
        const payload = new Uint8Array(100);

        const message = new Message(headers, payload);

        const encodedData = codec.encode(message);
        const decodedMessage = codec.decode(encodedData);

        expect(decodedMessage.headers).toEqual(message.headers);
        expect(decodedMessage.payload).toEqual(message.payload);
    });

    it('should throw an error when decoding an invalid message format', () => {
        const invalidData = new Uint8Array([1, 2, 3, 4, 5]); // Invalid data with no record separator

        expect(() => codec.decode(invalidData)).toThrow('Invalid message format: no record separator found.');
    });

    it('should throw an error when decoding non-ASCII characters - case 1', () => {
        const headers = new Map<string, string>();
        headers.set('Header1', 'Value1');
        headers.set('Header2', 'Value2' + String.fromCharCode(128)); // Non-ASCII character
        const payload = new Uint8Array(100);
        const message = new Message(headers, payload);

        expect(() => codec.encode(message)).toThrow('Non-ASCII character encountered.');
    });

    it("should throw an error if non-ASCII character is encountered - case 2", () => {
        const headers = new Map<string, string>();
        headers.set('Content-Type😀', 'application/json');
        const payload = new Uint8Array(100);
        const message = new Message(headers, payload);

        expect(() => codec.encode(message)).toThrow('Non-ASCII character encountered.');
    });
});
