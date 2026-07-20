import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readText = (path) => readFile(new URL(path, root), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const [packageJson, packageLock, serverJson, geminiExtension, sourceVersion, readme, changelog] =
  await Promise.all([
    readJson('package.json'),
    readJson('package-lock.json'),
    readJson('server.json'),
    readJson('gemini-extension.json'),
    readText('src/version.ts'),
    readText('README.md'),
    readText('CHANGELOG.md'),
  ]);

const expected = packageJson.version;
const versions = new Map([
  ['package.json', packageJson.version],
  ['package-lock.json', packageLock.version],
  ['package-lock.json root package', packageLock.packages?.['']?.version],
  ['server.json', serverJson.version],
  ['gemini-extension.json', geminiExtension.version],
  ['src/version.ts', sourceVersion.match(/SERVER_VERSION\s*=\s*'([^']+)'/)?.[1]],
]);

const errors = [];
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expected)) {
  errors.push(`package.json contains an invalid release version: ${expected}`);
}

for (const [source, version] of versions) {
  if (version !== expected) {
    errors.push(`${source} reports ${version ?? 'no version'}; expected ${expected}`);
  }
}

if (!readme.includes(`Version \`${expected}\``)) {
  errors.push(`README.md does not identify Version \`${expected}\``);
}
if (!changelog.includes(`## ${expected} - `)) {
  errors.push(`CHANGELOG.md has no release heading for ${expected}`);
}
if (serverJson.name !== packageJson.mcpName) {
  errors.push(`server.json name ${serverJson.name} does not match package mcpName ${packageJson.mcpName}`);
}
if (geminiExtension.mcpServers?.wiplash?.httpUrl !== serverJson.remotes?.[0]?.url) {
  errors.push('Gemini and MCP Registry manifests do not use the same canonical remote endpoint.');
}

if (errors.length > 0) {
  console.error(`Release metadata validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Release metadata is synchronized at ${expected}.`);
