import undici from "undici";

const { fetch, Headers, Request, Response, FormData, File, Blob } = undici;

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

if (!globalThis.Headers) {
  globalThis.Headers = Headers;
}

if (!globalThis.Request) {
  globalThis.Request = Request;
}

if (!globalThis.Response) {
  globalThis.Response = Response;
}

if (!globalThis.FormData) {
  globalThis.FormData = FormData;
}

if (!globalThis.File) {
  globalThis.File = File;
}

if (!globalThis.Blob) {
  globalThis.Blob = Blob;
}

