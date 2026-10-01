#!/usr/bin/env node
/**
 * Private archive of theme photograph masters (Theme 1 plan §P.7).
 *
 * The public site only ever serves the prepared AVIF/WebP derivatives; the
 * original master is the only thing that can regenerate them (new widths,
 * new formats, a re-crop), so it must not live only in the Magnific
 * account. This stores each released master, with its provenance, in a
 * PRIVATE S3-compatible bucket (Cloudflare R2 in production):
 *
 *   <theme>/<version>/<key>/master.<ext>
 *   <theme>/<version>/<key>/provenance.json
 *
 * Run from this folder after `npm ci`:
 *
 *   npm run archive-master -- --theme modern-education --key home-hero \
 *     --master /path/to/home-hero.png --reviewer "<name>"
 *   npm run verify-archive -- --theme modern-education
 *
 * `archive` reads the entry's provenance from the manifest (the single
 * source), refuses a master whose sha256 is not the recorded one, never
 * overwrites (an object already there must match byte for byte), and
 * re-downloads what it wrote to prove the round trip. `verify` checks that
 * every released entry has its master and provenance archived with the
 * recorded checksum — run it before a release commit.
 *
 * Configuration (never committed):
 *   ATLAS_THEME_ARCHIVE_ENDPOINT        https://<account>.r2.cloudflarestorage.com
 *   ATLAS_THEME_ARCHIVE_BUCKET          a bucket with NO public access / custom domain
 *   ATLAS_THEME_ARCHIVE_ACCESS_KEY_ID   a token scoped to that bucket only
 *   ATLAS_THEME_ARCHIVE_SECRET_ACCESS_KEY
 *   ATLAS_THEME_ARCHIVE_REGION          optional, default "auto"
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const ASSETS_SRC = join(REPO, 'src/features/website/theme-assets');
const MASTER_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const [mode, ...rest] = process.argv.slice(2);
const { values: args } = parseArgs({
  args: rest,
  options: {
    theme: { type: 'string' },
    key: { type: 'string' },
    master: { type: 'string' },
    reviewer: { type: 'string' },
  },
});

function fail(message) {
  console.error(`archive-master: ${message}`);
  process.exit(1);
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

function archiveClient() {
  const env = (name) => process.env[`ATLAS_THEME_ARCHIVE_${name}`];
  const missing = [
    'ENDPOINT',
    'BUCKET',
    'ACCESS_KEY_ID',
    'SECRET_ACCESS_KEY',
  ].filter((name) => !env(name));
  if (missing.length) {
    fail(`set ${missing.map((n) => `ATLAS_THEME_ARCHIVE_${n}`).join(', ')}`);
  }
  // The app's media bucket is served publicly; masters must never land there.
  if (process.env.R2_BUCKET && process.env.R2_BUCKET === env('BUCKET')) {
    fail('the archive bucket must not be the public media bucket (R2_BUCKET)');
  }
  return {
    bucket: env('BUCKET'),
    s3: new S3Client({
      endpoint: env('ENDPOINT'),
      region: env('REGION') ?? 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: env('ACCESS_KEY_ID'),
        secretAccessKey: env('SECRET_ACCESS_KEY'),
      },
    }),
  };
}

async function loadManifest(theme) {
  const module = await import(
    join(ASSETS_SRC, 'manifests', `${theme}.manifest.ts`)
  ).catch(() => fail(`no manifest for theme "${theme}"`));
  const manifest = Object.values(module).find(
    (value) => value && Array.isArray(value.assets)
  );
  if (!manifest) fail(`no manifest for theme "${theme}"`);
  return manifest;
}

const prefix = (theme, entry) => `${theme}/${entry.version}/${entry.key}`;

async function readObject(s3, bucket, key) {
  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    return Buffer.from(await result.Body.transformToByteArray());
  } catch (error) {
    if (
      error?.$metadata?.httpStatusCode === 404 ||
      error?.name === 'NoSuchKey'
    ) {
      return null;
    }
    throw error;
  }
}

async function exists(s3, bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (
      error?.$metadata?.httpStatusCode === 404 ||
      error?.name === 'NotFound'
    ) {
      return false;
    }
    throw error;
  }
}

/** Writes once; an existing object must be identical, never replaced. */
async function putImmutable(s3, bucket, key, body, contentType) {
  const digest = sha256(body);
  if (await exists(s3, bucket, key)) {
    const current = await readObject(s3, bucket, key);
    if (current && sha256(current) === digest) return 'already archived';
    fail(
      `${key} is already archived with different content; archive a new version`
    );
  }
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // R2 and S3 reject the write if something appeared meanwhile.
      IfNoneMatch: '*',
      Metadata: { sha256: digest },
    })
  );
  const roundTrip = await readObject(s3, bucket, key);
  if (!roundTrip || sha256(roundTrip) !== digest) {
    fail(`${key} did not read back with the same sha256`);
  }
  return 'archived';
}

async function archive() {
  if (!args.theme || !args.key || !args.master || !args.reviewer) {
    fail('archive needs --theme, --key, --master and --reviewer');
  }
  const manifest = await loadManifest(args.theme);
  const entry = manifest.assets.find((asset) => asset.key === args.key);
  if (!entry) fail(`"${args.key}" is not in the ${args.theme} manifest`);
  if (entry.status !== 'released' || !entry.provenance || !entry.version) {
    fail(`${args.key} has no released provenance in the manifest yet`);
  }
  const type = MASTER_TYPES[extname(args.master).toLowerCase()];
  if (!type) fail('the master must be a .png, .jpg or .webp file');

  const master = readFileSync(args.master);
  const digest = sha256(master);
  if (digest !== entry.provenance.masterSha256) {
    fail(
      `master sha256 ${digest} is not the recorded ${entry.provenance.masterSha256}`
    );
  }

  const { s3, bucket } = archiveClient();
  const base = prefix(args.theme, entry);
  const masterKey = `${base}/master${extname(args.master).toLowerCase()}`;
  const record = {
    theme: args.theme,
    key: entry.key,
    version: entry.version,
    masterObject: masterKey,
    masterSha256: digest,
    masterBytes: master.length,
    ratio: entry.ratio,
    prompt: entry.provenance.prompt,
    model: entry.provenance.model,
    seed: entry.provenance.seed ?? null,
    generationId: entry.provenance.jobId,
    generatedAt: entry.provenance.generatedAt,
    licenseBasis: entry.provenance.licenseBasis,
    alt: entry.alt,
    focal: entry.focal,
    reviewer: args.reviewer,
  };
  const recordBody = Buffer.from(`${JSON.stringify(record, null, 2)}\n`);

  console.log(
    `${masterKey}: ${await putImmutable(s3, bucket, masterKey, master, type)}`
  );
  console.log(
    `${base}/provenance.json: ${await putImmutable(
      s3,
      bucket,
      `${base}/provenance.json`,
      recordBody,
      'application/json'
    )}`
  );
}

async function verify() {
  if (!args.theme) fail('verify needs --theme');
  const manifest = await loadManifest(args.theme);
  const { s3, bucket } = archiveClient();
  const problems = [];
  for (const entry of manifest.assets.filter((a) => a.status === 'released')) {
    const base = prefix(args.theme, entry);
    const recordBytes = await readObject(s3, bucket, `${base}/provenance.json`);
    if (!recordBytes) {
      problems.push(`${entry.key}: no provenance.json at ${base}/`);
      continue;
    }
    const record = JSON.parse(recordBytes.toString('utf8'));
    const master = await readObject(s3, bucket, record.masterObject);
    if (!master) {
      problems.push(`${entry.key}: master ${record.masterObject} is missing`);
    } else if (sha256(master) !== entry.provenance.masterSha256) {
      problems.push(
        `${entry.key}: archived master does not match the manifest sha256`
      );
    } else if (record.masterSha256 !== entry.provenance.masterSha256) {
      problems.push(
        `${entry.key}: provenance.json sha256 does not match the manifest`
      );
    } else {
      console.log(`${entry.key} ${entry.version}: ok (${master.length} B)`);
    }
  }
  if (problems.length) fail(`\n  ${problems.join('\n  ')}`);
}

if (mode === 'archive') await archive();
else if (mode === 'verify') await verify();
else fail('usage: archive-master.mjs archive|verify --theme <theme> [...]');
