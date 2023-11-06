# Message and SimpleMessageCodec

This TypeScript code contains two implementation attaining the same goal - encoding the message having ascii headers and a binary payload. Each of the implementation will be explained in detail in the documentation. 

## Table of Contents

- [Installation](#installation)
- [API Documentation](#api-documentation)
- Analysis (# Analysis)
- [License](#license)

## Installation

Before running this app, install the required dependencies. Make sure to install jest if you want to run the unit tests as well.

```bash
# Installation steps
npm install typescript tslib ts-node @types/node 
npm install jest ts-jest @types/jest --save-dev
```

## API Documentation

### Message Class

#### `constructor(headers: Map<string, string>, payload: Uint8Array)`

- `headers`: A `Map` containing key-value pairs of message headers.
- `payload`: A `Uint8Array` containing the message payload.

### SimpleMessageCodec Class

While the APIs and theirs input/output types remain same for both `messageCodec.ts` and `messageCodecSimplify.ts`. The encoding(and decoding) logic differs in both.
1.  In messageCodecSimplify.ts - after the validations are done for headers and payload. We mainly use delimitors while parsing the message headers.
 #### Control Characters: 
 The code uses two specific ASCII control characters, the unit separator (ASCII 31) and the record separator (ASCII 30), to delimit and separate different parts of the encoded message. This is a reasonable choice for delimiters, as these characters are unlikely to appear in typical message data.

#### `encode(message: Message): Uint8Array`
* The method starts by encoding the headers of the Message object. It iterates through the headers and creates a string representation of the headers, with keys and values separated by the unit separator. The header strings are then joined using the unit separator and terminated with the record separator, creating a header string.
* The header string is converted into a Uint8Array using the `asciiToUint8Array` a helper method to convert ASCII string to Uint8Array. The headers are then added to the message buffer.
* Finally, the payload of the Message is added to the message buffer, and the complete message is returned as a Uint8Array.

####  `decode(data: Uint8Array): Message`
* This method starts by searching for the record separator (ASCII 30) in the provided Uint8Array to split the data into headers and payload.
* The headers are extracted from the data, and the `uint8ArrayToAscii` helper method is used to convert the header data back into a string.
* The header string is then split using the unit separator to extract key-value pairs and create a Map object representing the headers.
* The payload is also separated and stored.
* If the header data doesn't follow the expected format (e.g., an odd number of elements after splitting by the unit separator), an error is thrown to indicate an invalid format.
* The method returns a Message object with the parsed headers and payload.

2.  In messageCodec.ts - This implementation uses the lengths of header key - values, so when converting to byte array - we know until what length a specific key takes up, what position its value starts and when the next header starts (this information is used when decoding the binary data back to ascii values) while parsing the message headers. Then attaches byte Array payload. This method can be preferred if using delimitors is not a choice and might add additional overhead(negligible) of computation and storing of the message headers and payload lengths.
 
##### encode(message: Message): Uint8Array
* It uses the header count, lengths of each key and value - create a buffer and feed these values along with ascii to binary encoded key and value.
* For each header key value pair, it creates a new buffer, sets the key length in the first 2 bytes, followed by key buffer.After that, sets the value length, followed by value buffer.
* Repeating this for all headers, then adds the binary message payload length followed by the payload itself
     

##### decode(data: Uint8Array): Message
* It first checks whether the data length is sufficient to contain a valid message (at least 5 bytes, including header count and payload length).
* It then reads the header count and iterates over the number of headers to decode each key-value pair.
* It decodes key and value by reading the lengths and the corresponding binary data uptil that length, storing them back to strings.
* It reads the payload size and extracts the payload data.
* Finally, it creates a new Message instance with the extracted headers and payload data.

##### Encoding ASCII Strings:
The class uses helper methods (encodeAsciiString and decodeAsciiString) to convert between ASCII strings and binary representations.

## Analysis

#### Using Delimitors
* Pros: It is a simple, space efficient solution. It is more flexible - It uses a delimiting character to separate headers and a record separator to indicate the end of a message, making it suitable for messages with varying content.
* Self-delimiting: It is self-delimiting, meaning you can easily separate and process multiple messages in a stream. This is particularly useful for streaming protocols.
* Cons: ASCII character restrictions-  It imposes restrictions on specific ASCII characters in headers, which might not be suitable for all use cases..
* Potential performance impact: The use of delimiters and string manipulation may have a slight performance impact, especially when encoding and decoding large volumes of data.
#### Using message length
* Pros: It uses fixed-size headers and payload fields and can perform better for messages with a large number of headers, as it encodes headers and values using a fixed-length format.
* No special character restrictions: It doesn't impose restrictions on specific ASCII characters in headers, making it suitable for a broader range of applications.
* Cons: Since it uses fixed-size headers, it may not be suitable for messages with variable-length headers or dynamic key-value pairs.
* Not self-delimiting: It doesn't include built-in message delimiters, making it challenging to handle multiple messages in a stream.

Overall, I think using the delimitors is a practical solution for streaming protocols(where there isn't any restriction over using delimitors).

## License

This module is open-source and available under the [MIT License](LICENSE).

