"use strict";
const fs = require("fs");

const folder = 'media'

const getMedia = () => {
  const media = [];
  try {
    fs.readdirSync(`${folder}`).forEach((file) => {
      media.push(file);
    });
  } catch (err) {
    console.log(err);
  }
  return media
}

const createPath = (path) => {
  fs.existsSync(path) || fs.mkdirSync(path);
};

const removeFile = (file) => {
  console.log("File to remove", file)
  try {
    fs.unlinkSync(`${folder}/${file.file}`);
    return true;
  } catch (error) {
    console.log(error)
    return false;
  }
};

exports.getMedia = getMedia
exports.createPath = createPath
exports.removeFile = removeFile
exports.folder = folder;
