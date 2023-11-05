export class Message {
    public headers: Map<string, string>;
    public payload: Uint8Array;

    constructor(headers: Map<string, string>, payload: Uint8Array) {
        if (headers.size > 63) throw new Error("The number of headers cannot exceed 63");
        headers.forEach((value, key) => {
            this.validateHeader(key, value);
        });
        if (payload.length > 256 * 1024) throw new Error("Payload cannot exceed 256 KiB.");
        this.headers = headers;
        this.payload = payload;
    }

    private validateHeader(key: string, value: string): void {
        if (key.length > 1023 || value.length > 1023) {
            throw new Error("Header names and values are limited to 1023 bytes.");
        }
        if (key.includes(String.fromCharCode(31)) || value.includes(String.fromCharCode(31))) {
            throw new Error("Header names and values cannot contain unit separator character.");
        }
    }
}

interface MessageCodec {
    encode(message: Message): Uint8Array;
    decode(data: Uint8Array): Message;
}

export class SimpleMessageCodec implements MessageCodec {
    private readonly unitSeparator = String.fromCharCode(31); // ASCII 31 is unit separator
    private readonly recordSeparator = String.fromCharCode(30); // ASCII 30 is record separator

    // Method to encode the whole Message object into a Uint8Array for transmission
    encode(message: Message): Uint8Array {
        const headersArray: string[] = [];
        message.headers.forEach((value, key) => {
            headersArray.push(`${key}${this.unitSeparator}${value}`);
        });
        const headersString = headersArray.join(this.unitSeparator) + this.recordSeparator;
        const headerBuffer = this.asciiToUint8Array(headersString);
        const messageBuffer = new Uint8Array(headerBuffer.length + message.payload.length);
        messageBuffer.set(headerBuffer, 0);
        messageBuffer.set(message.payload, headerBuffer.length);
        return messageBuffer;
    }

    decode(data: Uint8Array): Message {
        const recordSeparatorIndex = data.indexOf(30); // ASCII 30 is record separator
        if (recordSeparatorIndex === -1) throw new Error("Invalid message format: no record separator found.");

        const headersBuffer = data.slice(0, recordSeparatorIndex);
        const payloadBuffer = data.slice(recordSeparatorIndex + 1);

        const headersString = this.uint8ArrayToAscii(headersBuffer);
        const headersArray = headersString.split(this.unitSeparator);
        const headers = new Map<string, string>();
        if (headersArray.length % 2 !== 0) throw new Error("Invalid headers format.");

        for (let i = 0; i < headersArray.length; i += 2) {
            const key = headersArray[i];
            const value = headersArray[i + 1];
            headers.set(key, value);
        }

        return new Message(headers, payloadBuffer);
    }

    // Helper method to convert ASCII string to Uint8Array
    private asciiToUint8Array(str: string): Uint8Array {

        const buffer = new Uint8Array(str.length);
        // Loop over each character in the string and convert to byte
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            if (charCode > 127) throw new Error("Non-ASCII character encountered.");
            buffer[i] = charCode;
        }
        return buffer;
    }

    // Helper method to convert Uint8Array to ASCII string
    private uint8ArrayToAscii(buffer: Uint8Array): string {
        // Initialize an empty string to accumulate characters
        let result = "";
        // Loop over each byte in the buffer
        for (let i = 0; i < buffer.length; i++) {
            // Convert the byte to its corresponding ASCII character and append to the string
            result += String.fromCharCode(buffer[i]);
        }
        // Return the resulting string
        return result;
    }
}
