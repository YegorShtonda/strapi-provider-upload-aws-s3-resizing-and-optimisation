'use strict';

const AWS = require('aws-sdk');
const Sharp = require('sharp');

module.exports = {
  init({ imageSizes, optimizeOptions, settings, ...config }) {

    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...config,
    });

    const S3BaseUrl = config.cdn ? config.cdn : `https://${config.params.Bucket}.s3.${config.region}.amazonaws.com`;

    function getFileType(file) {
      let fileType = 'origin';
      if (file.hash.split('_')[0] === 'thumbnail') {
        fileType = 'thumbnail';
      }
      return fileType;
    }

    function getFileFormat(file) {
      let fileFormat = 'file';
      const ext = file.ext.toLowerCase();
      if (
        ext === '.jpg' ||
        ext === '.jpeg' ||
        ext === '.png' ||
        ext === '.webp' ||
        ext === '.tiff'
      ) {
        fileFormat = 'image';
      } else if(ext === '.svg') {
        fileFormat = 'icon';
      }
      return fileFormat;
    }

    return {
      upload(file, customParams = {}) {
        const fileType = getFileType(file);
        const fileFormat = getFileFormat(file);

        return new Promise(async (resolve, reject) => {
          if(fileFormat === 'image') {
            const buffers = [];
            buffers.push({
              buffer: file.buffer,
              path: `${fileType}/${file.hash}${file.ext}`,
              mime: file.mime,
              isOrigin: true
            });

            if (fileType !== 'thumbnail') {
              for (let size of imageSizes) {
                let buffer = file.buffer;
                let path = `${size.name}/${file.hash}${file.ext}`;
                let mime = file.mime;

                if (file.ext === '.jpeg' || file.ext === '.jpg') {
                  buffer = await Sharp(file.buffer)
                    .jpeg(optimizeOptions.jpeg)
                    .resize(size.resizeOptions || {})
                    .rotate()
                    .toBuffer();
                } else if(file.ext === '.png') {
                  buffer = await Sharp(file.buffer)
                    .png(optimizeOptions.png)
                    .resize(size.resizeOptions || {})
                    .rotate()
                    .toBuffer();
                } else if(file.ext === '.webp') {
                  buffer = await Sharp(file.buffer)
                    .webp(optimizeOptions.webp)
                    .resize(size.resizeOptions || {})
                    .rotate()
                    .toBuffer();
                    path = `webp/${path}`;
                } else if(file.ext === '.tiff') {
                  buffer = await Sharp(file.buffer)
                    .tiff(optimizeOptions.tiff)
                    .resize(size.resizeOptions || {})
                    .rotate()
                    .toBuffer();
                }
                strapi.log.info(`🔄 Generated ${fileFormat}s/${size.name}/${file.name}${file.ext}`);

                buffers.push({
                  buffer,
                  path,
                  mime,
                });

                if (size.isGenerateWebp && file.ext !== '.webp') {
                  buffer = await Sharp(file.buffer)
                    .toFormat('webp')
                    .webp(optimizeOptions.webp)
                    .resize(size.resizeOptions || {})
                    .rotate()
                    .toBuffer();
                    strapi.log.info(`🔄 Generated ${fileFormat}s/webp/${size.name}/${file.name}.webp`);

                  buffers.push({
                    buffer,
                    path: `${size.name}/${file.hash}.webp`,
                    mime: 'image/webp',
                  });
                }
              }
            }

            for (let item of buffers) {
              await S3.upload(
                {
                  Key: `images/${item.path}`,
                  Body: Buffer.from(item.buffer),
                  ACL: 'public-read',
                  ContentType: item.mime,
                  ...customParams,
                },
                (err, data) => {
                  if (err) return reject(err);
                  strapi.log.info(`✅ Uploaded ${fileFormat}s/${item.path}`);
                }
              );
            }

            file.url = `${S3BaseUrl}/${fileFormat}s/${fileType}/${file.hash}${file.ext}`;
            resolve();
          } else {
            await S3.upload(
              {
                Key: `${fileFormat}s/${file.hash}${file.ext}`,
                Body: Buffer.from(file.buffer),
                ACL: 'public-read',
                ContentType: file.mime,
                ...customParams,
              },
              (err, data) => {
                if (err) return reject(err);
                strapi.log.info(`✅ Uploaded ${fileFormat}s/${file.hash}${file.ext}`);
              }
            );

            file.url = `${S3BaseUrl}/${fileFormat}s/${file.hash}${file.ext}`;
            resolve();
          }
        });
      },
      delete(file, customParams = {}) {
        const fileType = getFileType(file);
        const fileFormat = getFileFormat(file);

        return new Promise(async (resolve, reject) => {
          if(fileFormat === 'image') {
            await S3.deleteObject(
              { Key: `images/${fileType}/${file.hash}${file.ext}`, ...customParams, },
              (err, data) => {
                if (err) { console.error(err); return; }
                strapi.log.info(`❌ Deleted ${fileFormat}s/${fileType}/${file.hash}${file.ext}`);
              }
            )
            if (file.hash.split('_')[0] !== 'thumbnail') {
              for (let size of imageSizes) {
                if (file.ext !== '.webp') {
                  await S3.deleteObject(
                    { Key: `images/${size.name}/${file.hash}${file.ext}`, ...customParams, },
                    (err, data) => {
                      if (err) { console.error(err); return; }
                      strapi.log.info(`❌ Deleted ${fileFormat}s/${size.name}/${file.hash}${file.ext}`);
                    }
                  )
                }
                if (size.isGenerateWebp) {
                  await S3.deleteObject(
                    { Key: `images/${size.name}/${file.hash}.webp`, ...customParams, },
                    (err, data) => {
                      if (err) { console.error(err); return; }
                      strapi.log.info(`❌ Deleted ${fileFormat}s/webp/${size.name}/${file.hash}.webp`);
                    }
                  )
                }
              }
            }
          } else {
            await S3.deleteObject(
              { Key: `${fileFormat}s/${file.hash}${file.ext}`, ...customParams, },
              (err, data) => {
                if (err) { console.error(err); return; }
                strapi.log.info(`❌ Deleted ${fileFormat}s/${file.hash}${file.ext}`);
              }
            )
          }

          resolve();
        });
      },
    };
  },
};
