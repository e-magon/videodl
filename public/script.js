"use strict";

function startDownload() {
  console.log("Starting...");
  let url = document.querySelector("#video_url").value;
  console.log(url);
  if (!url)
    return;

  document.querySelector("#page1").style.display = "none";
  document.querySelector("#page2").style.display = "block";

  let audioSelected = document.querySelector("#audiobut").checked;
  console.log(audioSelected);

  let link = document.createElement("a");
  if (audioSelected)
    link.setAttribute("href", "getaudio?url=" + encodeURIComponent(url));
  else
    link.setAttribute("href", "getvideo?url=" + encodeURIComponent(url));
  link.setAttribute("download", "");
  link.click();

  console.log("Done");
}