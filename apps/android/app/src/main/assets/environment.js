// Android's V8 isolate supplies ECMAScript and WebAssembly. Supply the small
// Web Platform surface required by the pinned single-thread library.
globalThis.console ??= {log(){},warn(){},error(){}};
globalThis.performance ??= {now:()=>Date.now()};
globalThis.TextDecoder ??= class {
  decode(bytes) {
    if (!bytes) return '';
    const encoded=Array.from(bytes,n=>'%'+n.toString(16).padStart(2,'0')).join('');
    return decodeURIComponent(encoded);
  }
};
