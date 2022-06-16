"use strict";
const express = require("express");
const http = require("http");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const helpers = require("./helpers");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(`${helpers.folder}`));
app.use(fileUpload());

const server = http.createServer(app);

app.get("/", (req, res) => {
  res.send({ message: "Upload server running" });
});

app.get("/media", (req, res) => {
  res.send(helpers.getMedia());
});

app.post("/media/delete", (req, res) => {
  helpers.removeFile(req.body);
  const msg = true;
  res.send({ msg });
});

app.post("/media/add", (req, res) => {
  const { file1, file2 } = req.files;
  const { text } = req.body;
  console.log("text:", text)
  file1.mv(`media/${file1.name}`, (err) => {
    if (err) console.log(err);
    console.log('file1 uploaded');
  });
  file2.mv(`media/${file2.name}`, (err) => {
    if (err) return res.status(500).send(err);
    console.log('file2 uploaded');
    res.send("File uploaded!");
  });
});

app.post("/media/read", (req, res) => {
  const { path } = req.body;
  res.send(helpers.getProcessMedia(path));
});



const port = 10000;
server.listen(port, () => console.log("... listening on", port));
