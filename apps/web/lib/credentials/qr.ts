const VERSION = 4;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;

function multiply(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function generator(degree: number) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = multiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = multiply(root, 2);
  }
  return result;
}

function remainder(data: Uint8Array, divisor: Uint8Array) {
  const result = new Uint8Array(divisor.length);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i += 1) result[i] ^= multiply(divisor[i], factor);
  }
  return result;
}

function bitsForText(text: string) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 78) throw new Error("QR_PAYLOAD_TOO_LONG");
  const bits: number[] = [0, 1, 0, 0];
  for (let i = 7; i >= 0; i -= 1) bits.push((bytes.length >>> i) & 1);
  for (const byte of bytes) for (let i = 7; i >= 0; i -= 1) bits.push((byte >>> i) & 1);
  for (let i = 0; i < Math.min(4, DATA_CODEWORDS * 8 - bits.length); i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
  for (let pad = 0; data.length < DATA_CODEWORDS; pad += 1) data.push(pad % 2 === 0 ? 0xec : 0x11);
  const dataBytes = Uint8Array.from(data);
  return Uint8Array.from([...dataBytes, ...remainder(dataBytes, generator(ECC_CODEWORDS))]);
}

export function qrMatrix(text: string) {
  const modules = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const functions = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
      modules[y][x] = dark;
      functions[y][x] = true;
    }
  };
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setFunction(cx + dx, cy + dy, distance !== 2 && distance !== 4);
    }
  };
  const alignment = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  };
  finder(3, 3); finder(SIZE - 4, 3); finder(3, SIZE - 4);
  for (let i = 8; i < SIZE - 8; i += 1) { setFunction(6, i, i % 2 === 0); setFunction(i, 6, i % 2 === 0); }
  alignment(26, 26);
  setFunction(8, SIZE - 8, true);

  const format = (mask: number) => {
    const data = (1 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i += 1) setFunction(8, i, bit(i));
    setFunction(8, 7, bit(6)); setFunction(8, 8, bit(7)); setFunction(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) setFunction(SIZE - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) setFunction(8, SIZE - 15 + i, bit(i));
    setFunction(8, SIZE - 8, true);
  };
  format(0);

  const codewords = bitsForText(text);
  let bitIndex = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const y = upward ? SIZE - 1 - vertical : vertical;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (functions[y][x]) continue;
        const value = bitIndex < codewords.length * 8 ? ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0 : false;
        modules[y][x] = value !== ((x + y) % 2 === 0);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
  return modules;
}
