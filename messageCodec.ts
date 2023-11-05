export class Message {
  // Map of header name-value pairs and the binary payload
  public headers: Map<string, string>;
  public payload: Uint8Array;

  // Constructor for creating a new Message instance with headers and payload
  constructor(headers: Map<string, string>, payload: Uint8Array) {
    // Check that the number of headers does not exceed 63
    if (headers.size > 63) {
      throw new Error("The number of headers cannot exceed 63");
    }

    // Iterate over each header to ensure names and values don't exceed 1023 bytes
    headers.forEach((value, key) => {
      Message.checkStringLength(key, 1023);
      Message.checkStringLength(value, 1023);
    });

    // Check that the payload does not exceed 256 KiB
    if (payload.length > 256 * 1024) {
      throw new Error("Payload cannot exceed 256 KiB.");
    }

    // Assign headers and payload to the Message instance
    this.headers = headers;
    this.payload = payload;
  }

  // Static method to check if a string exceeds the specified maximum length
  private static checkStringLength(str: string, maxLength: number): void {
    // If the string's length is greater than allowed, throw an error
    if (str.length > maxLength) {
      throw new Error(`Header names and values are limited to ${maxLength} bytes`);
    }
  }
}

// Interface definition for the message codec with encode and decode methods
interface MessageCodec {
  encode(message: Message): Uint8Array;
  decode(data: Uint8Array): Message;
}

// SimpleMessageCodec class implements the encoding and decoding logic for the Message
export class SimpleMessageCodec implements MessageCodec {
  // Method to encode a Message object into a Uint8Array for transmission
  encode(message: Message): Uint8Array {
    // Store the number of headers
    const headerCount = message.headers.size;
    // Initialize buffer size with 1 byte for the header count
    let bufferSize = 1;
    // Array to hold binary encoded headers
    const headersParts: Uint8Array[] = [];

    // Iterate over headers to encode each header name and value pair
    message.headers.forEach((value, key) => {
      // Encode the key and value as ASCII binary
      const keyBuffer = this.encodeAsciiString(key);
      const valueBuffer = this.encodeAsciiString(value);
      // Calculate the size for this header (2 bytes for key length, key, 2 bytes for value length, value)
      const headerSize = 2 + keyBuffer.length + 2 + valueBuffer.length;
      // Update total bufferSize with the size of the current header
      bufferSize += headerSize;

      // Create a new buffer for the header part and fill it with key and value data
      const headerPart = new Uint8Array(headerSize);
      // Set the key length in the first 2 bytes
      new DataView(headerPart.buffer).setUint16(0, keyBuffer.length, true);
      // Copy the key buffer after the key length
      headerPart.set(keyBuffer, 2);
      // Set the value length after the key buffer
      new DataView(headerPart.buffer).setUint16(2 + keyBuffer.length, valueBuffer.length, true);
      // Copy the value buffer after the value length
      headerPart.set(valueBuffer, 4 + keyBuffer.length);

      // Push the completed header part into the array
      headersParts.push(headerPart);
    });

    // Get the size of the payload
    const payloadSize = message.payload.length;
    // Update bufferSize with the size of the payload (4 bytes for length, plus the payload)
    bufferSize += 4 + payloadSize;

    // Create the full message buffer with the calculated size
    const messageBuffer = new Uint8Array(bufferSize);
    // Set the header count in the first byte
    messageBuffer[0] = headerCount;
    // Initialize offset for copying data into the messageBuffer
    let offset = 1;

    // Copy each encoded header into the messageBuffer at the correct offset
    headersParts.forEach((part) => {
      messageBuffer.set(part, offset);
      offset += part.length;
    });

    // Set the payload size after all headers have been copied
    new DataView(messageBuffer.buffer).setUint32(offset, payloadSize, true);
    // Copy the payload into the messageBuffer after the payload size
    messageBuffer.set(message.payload, offset + 4);

    // Return the fully constructed message buffer
    return messageBuffer;
  }

  // Method to decode a Uint8Array received from transmission into a Message object
  decode(data: Uint8Array): Message {
    if (data.length < 5) { // Minimum length to have at least one header and the payload length field
      throw new Error('Data is too short to contain a valid message');
  }
    // Initialize offset to start reading from the beginning of the data
    let offset = 0;
    // Read the header count from the first byte
    const headerCount = data[offset++];

    // Initialize a new map for headers
    const headers = new Map<string, string>();

    if (headerCount > 63) {
      throw new Error('Header count exceeds the maximum of 63');
    }
    // Iterate over the number of headers and extract each one
    for (let i = 0; i < headerCount; i++) {
      // Read the key length from the next 2 bytes
      const keyLength = new DataView(data.buffer, offset, 2).getUint16(0, true);
      offset += 2;
      // Read the key data from the next keyLength bytes and decode it from ASCII
      const key = this.decodeAsciiString(data.subarray(offset, offset + keyLength));
      offset += keyLength;

      // Read the value length from the next 2 bytes
      const valueLength = new DataView(data.buffer, offset, 2).getUint16(0, true);
      offset += 2;
      // Read the value data from the next valueLength bytes and decode it from ASCII
      const value = this.decodeAsciiString(data.subarray(offset, offset + valueLength));
      offset += valueLength;

      // Add the decoded key-value pair to the headers map
      headers.set(key, value);
    }

    // Read the payload size from the next 4 bytes
    const payloadSize = new DataView(data.buffer, offset, 4).getUint32(0, true);
    offset += 4;
    // Read the payload data from the remaining bytes
    const payload = data.subarray(offset, offset + payloadSize);

    // Create a new Message with the extracted headers and payload
    return new Message(headers, payload);
  }

  // Helper method to encode an ASCII string into a Uint8Array
  private encodeAsciiString(str: string): Uint8Array {
    // Convert string to a char array and map each character to its ASCII byte value
    const charCodes = Array.from(str).map(c => c.charCodeAt(0));
    // Return a new Uint8Array from the array of ASCII values
    return new Uint8Array(charCodes);
  }

  // Helper method to decode a Uint8Array into an ASCII string
  private decodeAsciiString(data: Uint8Array): string {
    // Convert each byte in the Uint8Array back to a character and join them into a string
    return String.fromCharCode(...data);
  }
}
