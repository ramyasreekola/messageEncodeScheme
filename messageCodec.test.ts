import { Message, SimpleMessageCodec } from './messageCodec';

describe('SimpleMessageCodec', () => {
  const codec = new SimpleMessageCodec();

  it('should encode and decode a message with multiple headers and payload', () => {
    const headers = new Map([
      ['Header1', 'Value1'],
      ['Header2', 'Value2'],
      ['Header3', 'Value3'],
    ]);
    const payload = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const message = new Message(headers, payload);
    const encoded = codec.encode(message);
    const decoded = codec.decode(encoded);
    expect(decoded.headers.size).toBe(message.headers.size);
    decoded.headers.forEach((value, key) => {
      expect(message.headers.get(key)).toBe(value);
    });
    expect(decoded.payload).toEqual(message.payload);
  });

  it('should throw an error when encoding a message with too many headers', () => {
    const headers = new Map();
    for (let i = 0; i < 64; i++) {
      headers.set(`Header${i}`, `Value${i}`);
    }
    const payload = new Uint8Array([0, 1, 2, 3]);

    expect(() => {
      new Message(headers, payload);
    }).toThrow('The number of headers cannot exceed 63');
  });

  it('should throw an error when encoding a message with a header name too long', () => {
    const headers = new Map([
      ['H'.repeat(1024), 'Value']
    ]);
    const payload = new Uint8Array([0, 1, 2, 3]);

    expect(() => {
      new Message(headers, payload);
    }).toThrow('Header names and values are limited to 1023 bytes');
  });

  it('should throw an error when decoding a message with invalid header count', () => {
    const invalidHeaderCount = new Uint8Array([64, 0, 0, 0, 0, 0]); // Header count set to 64

    expect(() => {
      codec.decode(invalidHeaderCount);
    }).toThrow('Header count exceeds the maximum of 63');
  });

  it('should throw an error when decoding a message with incomplete data', () => {
    const incompleteData = new Uint8Array([1, 0]); // Not enough data for one header

    expect(() => {
      codec.decode(incompleteData);
    }).toThrow('Data is too short to contain a valid message');
  });

});