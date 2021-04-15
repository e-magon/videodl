"use strict";
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");

const express = require("express");
const app = express();
const PORT = 8093;

// /getvideo?url=... (the param is uri encoded)
// return the requested video (mp4)
app.get("/getvideo", async (req, res) => {
  let videoUrl = decodeURIComponent(req.query.url).replace(/\s/g, '');
  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logString(`requested VIDEO from ${clientIp} :\t${videoUrl}`);

  let filePath;
  try {
    filePath = await downloadVideo(videoUrl);
  } catch (ex) {
    logString("\tERR: " + ex + " for " + clientIp);
    if (ex == "ERROR: Video unavailable")
      res.sendStatus(404);
    else
      res.sendStatus(500);
    return;
  }

  if (filePath)
    res.download(filePath);
  else
    res.sendStatus(500);

  res.on("finish", () => {
    try {
      if (filePath)
        fs.unlinkSync(filePath); // deletes the file after sending it to the client
    } catch (ex) {
      console.log("ERR: deleting file", filePath, ":", ex);
    }
  });
});

// /getaudio?url=... (the param is uri encoded)
// return the requested audio track of the video (mp3)
app.get("/getaudio", async (req, res) => {
  let videoUrl = decodeURIComponent(req.query.url).replace(/\s/g, '');
  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logString(`requested AUDIO from ${clientIp} :\t${videoUrl}`);

  let filePath;
  try {
    filePath = await downloadAudio(videoUrl);
  } catch (ex) {
    logString("\tERR: " + ex + " for " + clientIp);
    if (ex == "ERROR: Video unavailable") {
      res.sendStatus(404);
    }
    else {
      res.sendStatus(500);
    }
    return;
  }

  if (filePath)
    res.download(filePath);
  else
    res.sendStatus(500);

  res.on("finish", () => {
    try {
      if (filePath)
        fs.unlinkSync(filePath); // deletes the file after sending it to the client
    } catch (ex) {
      logString("ERR: deleting file", filePath, ":", ex);
    }
  });
});

// /getname?url=... (the param is uri encoded)
// return the filename of the requested file, without downloading it
app.get("/getname", async (req, res) => {
  let videoUrl = decodeURIComponent(req.query.url).replace(/\s/g, '');
  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logString(`requested NAME from ${clientIp} :\t${videoUrl}`);

  let fileName;
  try {
    fileName = await getVideoName(videoUrl);
  } catch (ex) {
    logString("\tERR: " + ex + " for " + clientIp);
    if (ex == "ERROR: Video unavailable")
      res.sendStatus(404);
    else
      res.sendStatus(500);
    return;
  }

  if (fileName)
    res.send(fileName);
  else
    res.sendStatus(204); // No content
})

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static("public"));

// cleans the downloads folder
child_process.exec("rm -r downloads; mkdir downloads", (err, stdout, stderr) => {
  if (stderr) {
    console.log("stdERR:", stderr);
    return;
  }
  if (err) {
    console.log(err);
    return;
  }

  app.listen(PORT);
  // test:
  // console.log(encodeURIComponent("https://www.youtube.com/watch?v=ThAACSvrvdQ"))
});

// ========== methods ==========
async function downloadVideo(videoUrl) {
  return new Promise((resolve, reject) => {
    child_process.exec(`cd downloads && youtube-dl --format mp4 "${videoUrl}"`, (err, stdout, stderr) => {
      if (stderr) {
        reject(stderr.replace("\n", ""));
        return;
      }

      if (err) {
        //console.log(err);
        reject(err);
        return;
      }

      let filename = stdout.match(/^\[ffmpeg\] Destination: (.+)$/m);
      if (!filename) // file wasn't converted?
        filename = stdout.match(/^\[download\] Destination: (.+)$/m);
      if (!filename) // file already present
        filename = stdout.match(/^\[download\] (.+) has already been downloaded$/m);
      filename = filename[1]; //[0] is the entire match, [1] the 1st group

      resolve(path.join(__dirname, "downloads", filename));
    });
  });
}

async function downloadAudio(videoUrl) {
  return new Promise((resolve, reject) => {
    child_process.exec(`cd downloads && youtube-dl -x --audio-format mp3 "${videoUrl}"`, (err, stdout, stderr) => {
      if (stderr) {
        reject(stderr.replace("\n", ""));
        return;
      }

      if (err) {
        //console.log(err);
        reject(err);
        return;
      }

      let filename = stdout.match(/^\[ffmpeg\] Destination: (.+)$/m);
      if (!filename) // file wasn't converted?
        filename = stdout.match(/^\[download\] Destination: (.+)$/m);
      if (!filename) // file already present
        filename = stdout.match(/^\[download\] (.+) has already been downloaded$/m);
      filename = filename[1]; //[0] is the entire match, [1] the 1st group

      resolve(path.join(__dirname, "downloads", filename));
    });
  });
}

async function getVideoName(videoUrl) {
  return new Promise((resolve, reject) => {
    child_process.exec(`youtube-dl -e "${videoUrl}"`, (err, stdout, stderr) => {
      if (stderr) {
        reject(stderr.replace("\n", ""));
        return;
      }

      if (err) {
        //console.log(err);
        reject(err);
        return;
      }

      resolve(stdout);
    });
  });
}

function logString(msg) {
  let d = new Date();
  let finalString = `${("" + d.getDate()).padStart(2, "0")}/${(d.getMonth() + 1 + "").padStart(2, "0")}/${d.getFullYear()} ${("" + d.getHours()).padStart(2, "0")}:${("" + d.getMinutes()).padStart(2, "0")}:${("" + d.getSeconds()).padStart(2, "0")} - ${msg}`;

  console.log(finalString);
}