import { buildSync } from "esbuild";
import * as path from "node:path";
import archiver from "archiver";
import * as fs from "node:fs";

buildSync({
    entryPoints: [path.join(__dirname, "lambda.ts")],
    platform: "node",
    format: "cjs",
    bundle: true,
    write: true,
    outfile: path.join(__dirname, "../index.js"),
    external: ["@aws-sdk/*"],
    minify: false,
})

const output = fs.createWriteStream(path.join(__dirname, "../lambda.zip"));
const archive = archiver('zip', {
    zlib: { level: 9 }, // Compression level (0-9)
});
archive.pipe(output);
archive.file(path.join(__dirname, "../index.js"), { name: 'index.js' });
archive.finalize().then(() => {
    return fs.promises.rm(path.join(__dirname, "../index.js"));
})
