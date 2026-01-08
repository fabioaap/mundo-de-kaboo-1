// Shim for warning module to fix ESM import issue with react-pdf
// This provides a default export that react-pdf expects

export default function warning(condition: any, message: string) {
  if (!condition) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(message);
    }
  }
}

export { warning };
