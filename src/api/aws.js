import AWS from 'aws-sdk'
import Application from '../models/application';
import { v4 as uuidv4 } from "uuid";
var Buffer = require("buffer/").Buffer;

/**
 * @param {string} uri
 * @returns {string}
 */
export function parseFileName(uri) {
  return uri.replace(/^.*\//, "").replace(/\?.*$/, "");
}

/**
 * returns name with 6-characters uuid
 * @param {string} name
 * @returns {string}
 */
export function getUniqueFilename(name) {
  return uuidv4() + '-' + name.substring(name.lastIndexOf("."));
}

export async function uploadFile(file, name = "file", location='docs', signal = null) {
  if (signal && signal.aborted) {
    return Promise.reject(new Error('Upload was canceled.'));
  }
  if (!file) {
    throw new Error("uploadFile called with empty file");
  }
  const application = Application.getInstance();
  const credentials = application.s3Credentials
  let contentType, isBase64;
  // Check if the file is base64 encoded
  if (file.startsWith) {
    isBase64 = file.startsWith("data:");
    contentType = file.substring(
      file.indexOf(":") + 1,
      file.indexOf(";")
    );
    if (isBase64) {
      file = Buffer.from(file.replace(/^data:\w+\/\w+;base64,/, ""), "base64");
    }
  } else {
    contentType = file.type;
  }

  const s3 = new AWS.S3({
    region: credentials.region,
    accessKeyId: credentials.accessKey,
    secretAccessKey: credentials.secretKey,
  });

  const extension = contentType.substring(contentType.indexOf('/') + 1, contentType.length);
  const filename = `${getUniqueFilename(parseFileName(name))}.${extension}`;
  const params = {
    Bucket: credentials.bucket,
    Key: `${location}/${filename}`,
    Body: file,
    ContentType: contentType,
  };

  if (isBase64) {
    params.ContentEncoding = "base64";
  }

  return await s3.upload(params, { signal }).promise();
}
