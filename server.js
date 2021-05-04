"use strict";
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");

const express = require("express");
const expressCookieParser = require("cookie-parser");
const app = express();
app.use(expressCookieParser());
const PORT = 8093;

// /checkpsw?psw=... (the param is uri encoded, is the SHA256-hashed password)
// return 200 if correct psw, 401 if it isn't, 500 otherwise
app.get("/api/checkpsw", async (req, res) => {
  let userPsw = decodeURIComponent(req.query.psw);

  try {
    (await checkPsw(userPsw)) ? res.sendStatus(200) : res.sendStatus(401); //the replace remove all whitespaces and new lines
  } catch (ex) {
    logString("\tERR: ", ex, " for ", clientIp, "(", req, ")");
    res.sendStatus(500);
  }
});

// /isvalid?url=... (the param is uri encoded)
// return 200 if is a valid youtube-dl url, 404 if youtube-dl can't find the video, 500 otherwise
app.get("/api/isvalid", async (req, res) => {
  let videoUrl = decodeURIComponent(req.query.url).replace(/\s/g, "");
  let clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  let result;

  try {
    if (!await checkPsw(req.cookies.psw)) {
      res.sendStatus(401);
      return;
    }
    result = await checkValidUrl(videoUrl);
    res.sendStatus(result);
  } catch (ex) {
    logString("\tERR: ", ex, " for ", clientIp, "(", req, ")");
    res.sendStatus(500);
    return;
  }
});

// /getvideo?url=... (the param is uri encoded)
// return the requested video (mp4)
app.get("/api/getvideo", async (req, res) => {
  let videoUrl = decodeURIComponent(req.query.url).replace(/\s/g, "");
  let clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  logString(`requested VIDEO from ${clientIp} :\t${videoUrl}`);

  let filePath;
  try {
    if (!await checkPsw(req.cookies.psw)) {
      //res.sendStatus(401);
      //return;
    }
    filePath = await downloadVideo(videoUrl);
  } catch (ex) {
    logString("\tERR: ", ex, " for ", clientIp, "(", req, ")");
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

  res.on("close", () => {
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
app.get("/api/getaudio", async (req, res) => {
  let videoUrl = decodeURIComponent(req.query.url).replace(/\s/g, "");
  let clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  logString(`requested AUDIO from ${clientIp} :\t${videoUrl}`);

  let filePath;
  try {
    if (!await checkPsw(req.cookies.psw)) {
      res.sendStatus(401);
      return;
    }
    filePath = await downloadAudio(videoUrl);
  } catch (ex) {
    logString("\tERR: ", ex, " for ", clientIp, "(", req, ")");
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

  res.on("close", () => {
    try {
      if (filePath)
        fs.unlinkSync(filePath); // deletes the file after sending it to the client
    } catch (ex) {
      logString("ERR: deleting file", filePath, ":", ex);
    }
  });
});

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

  console.log();
  app.listen(PORT, () => {
    logString("Listening on", PORT);
  }).on("error", () => {
    app.listen(PORT + 1);
    logString("Port", PORT, "already in use, listening on", PORT + 1);
  });

  // test:
  // console.log(encodeURIComponent("https://www.youtube.com/watch?v=ThAACSvrvdQ"))
});

// ========== methods ==========
async function checkPsw(userPsw) {
  return new Promise((resolve, reject) => {
    fs.readFile("hashedpassword.txt", "utf-8", (err, data) => {
      if (err) reject(err);
      resolve(userPsw == data.replace(/\v|\s/gm, "")); //the replace removes all whitespaces and new lines
    });
  });
}

async function checkValidUrl(videoUrl) {
  // returns 404 for invalid url, 200 otherwise
  return new Promise((resolve) => {
    child_process.exec(`youtube-dl -e "${videoUrl}"`, (err, stdout, stderr) => {
      if (stderr) {
        resolve(404);
        return;
      }

      if (err) {
        resolve(404);
        return;
      }

      resolve(200);
    });
  });
}

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

function logString(...msgs) {
  let d = new Date();
  let finalString = `${("" + d.getDate()).padStart(2, "0")}/${(d.getMonth() + 1 + "").padStart(2, "0")}/${d.getFullYear()} ${("" + d.getHours()).padStart(2, "0")}:${("" + d.getMinutes()).padStart(2, "0")}:${("" + d.getSeconds()).padStart(2, "0")} - ${msgs.join(" ")}`;

  console.log(finalString);
}