# strapi-provider-upload-aws-s3-resizing-and-optimisation

## Opportunities

+ Resizing and optimisation images by using [sharp.js](https://sharp.pixelplumbing.com/)
+ Generation of images in webp format
+ Convenient file structure in AWS S3 Bucket

## Configurations

Your configuration is passed down to the provider. (e.g: `new AWS.S3(config)`)

**Example**

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  upload: {
    provider: 'aws-s3-resizing-and-optimisation',
    providerOptions: {
      accessKeyId: env('AWS_ACCESS_KEY_ID'),
      secretAccessKey: env('AWS_ACCESS_SECRET'),
      region: env('AWS_REGION'),
      optimizeOptions: {
        jpeg: {
          quality: 90,
          progressive: true,
        },
        png: {
          quality: 90,
          progressive: true,
        },
        webp: {
          alphaQuality: 90,
        },
        tiff: {}
      },
      imageSizes: [
        {
          name: 'large',
          resizeOptions: {
            width: 1400
          },
          isGenerateWebp: true,
        },
        {
          name: 'medium',
          resizeOptions: {
            width: 700
          },
          isGenerateWebp: true,
        },
        {
          name: 'small',
          resizeOptions: {
            width: 550
          },
          isGenerateWebp: true,
        },
      ],
      params: {
        Bucket: env('AWS_BUCKET_NAME'),
      },
    },
  }
});
```

You can see another Sharp Optimize Options [here](https://sharp.pixelplumbing.com/api-output#jpeg) and AWS S3 Params [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property)


## AWS S3 Bucket structure

```
+ images
  - origin
  - thumbnail
  - your-custom-size-format
  + webp
    - origin
    - thumbnail
    - your-custom-size-format
- icons
- files
```


"# strapi-provider-upload-aws-s3-resizing-and-optimisation" 
