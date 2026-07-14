import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const rootDirectory = path.resolve(scriptDirectory, '..')
const sourceDirectory = path.join(rootDirectory, 'Assets')
const generatedSourceDirectory = path.join(sourceDirectory, 'Generated', 'Sources')
const generated4kDirectory = path.join(sourceDirectory, 'Generated', '4K')
const outputDirectory = path.join(rootDirectory, 'public', 'assets')

await Promise.all([
  mkdir(outputDirectory, { recursive: true }),
  mkdir(generated4kDirectory, { recursive: true }),
])

const jobs = [
  {
    source: 'background1.png',
    output: 'hero-1280.webp',
    width: 1280,
    quality: 82,
  },
  {
    source: 'background1.png',
    output: 'hero-2560.webp',
    width: 2560,
    quality: 82,
  },
  {
    source: 'background1.png',
    output: 'hero-3840.webp',
    width: 3840,
    quality: 88,
  },
  {
    source: 'Background2.png',
    output: 'deep-space-1600.webp',
    width: 1600,
    quality: 80,
  },
  {
    source: 'CoverImage.png',
    output: 'build-week-cover-1200.webp',
    width: 1200,
    quality: 86,
  },
  {
    source: 'Luma Build Week Manta.png',
    output: 'manta-poster-1200.webp',
    width: 1200,
    quality: 86,
  },
]

await Promise.all(
  jobs.map(async ({ source, output, width, quality }) => {
    await sharp(path.join(sourceDirectory, source))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(path.join(outputDirectory, output))
  }),
)

const communityLogoJobs = [
  {
    source: 'logo-kriuu.png',
    output: 'community-kriuu.webp',
    width: 79,
    trim: false,
    lossless: true,
  },
  {
    source: 'logo-clubia-uleam2.jpeg',
    output: 'community-club-ia-uleam.webp',
    width: 480,
    trim: true,
    lossless: false,
  },
  {
    source: 'TheBuildersLogo.png',
    output: 'community-the-builders.webp',
    width: 480,
    trim: true,
    lossless: false,
  },
]

await Promise.all(
  communityLogoJobs.map(async ({ source, output, width, trim, lossless }) => {
    const sourceImage = sharp(path.join(sourceDirectory, source))
    const preparedImage = trim ? sourceImage.trim({ threshold: 12 }) : sourceImage

    await preparedImage
      .resize({ width, withoutEnlargement: true })
      .webp(lossless ? { lossless: true, effort: 5 } : { quality: 90, effort: 5 })
      .toFile(path.join(outputDirectory, output))
  }),
)

await copyFile(
  path.join(sourceDirectory, 'video-orbital.mp4'),
  path.join(outputDirectory, 'video-orbital.mp4'),
)

const generatedJobs = [
  {
    source: 'global-orbit-source.png',
    fourK: 'global-orbit-4k.png',
    web: 'global-orbit',
  },
  {
    source: 'solar-limb-source.png',
    fourK: 'solar-limb-4k.png',
    web: 'solar-limb',
  },
  {
    source: 'lunar-horizon-source.png',
    fourK: 'lunar-horizon-4k.png',
    web: 'lunar-horizon',
  },
]

for (const { source, fourK, web } of generatedJobs) {
  const sourcePath = path.join(generatedSourceDirectory, source)
  const fourKPath = path.join(generated4kDirectory, fourK)

  await sharp(sourcePath)
    .resize({
      width: 3840,
      height: 2160,
      fit: 'cover',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(fourKPath)

  await Promise.all(
    [
      { width: 1280, quality: 82 },
      { width: 2560, quality: 86 },
      { width: 3840, quality: 88 },
    ].map(async ({ width, quality }) => {
      await sharp(fourKPath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(path.join(outputDirectory, `${web}-${width}.webp`))
    }),
  )
}

await sharp(path.join(sourceDirectory, 'CoverImage.png'))
  .resize({ width: 1200, height: 630, fit: 'cover' })
  .webp({ quality: 88, effort: 5 })
  .toFile(path.join(rootDirectory, 'public', 'og-build-week-manta.webp'))

console.log(`Assets 4K generados en ${generated4kDirectory}`)
console.log(`Assets web optimizados en ${outputDirectory}`)
