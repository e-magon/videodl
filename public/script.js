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

  // asks the server for the filename
  let fileName = audioSelected ? "audio" : "video";
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200)
        fileName = encodeURIComponent(this.responseText);

      fileName += audioSelected ? ".mp3" : ".mp4";

      let link = document.createElement("a");
      if (audioSelected)
        link.setAttribute("href", "getaudio?url=" + encodeURIComponent(url));
      else
        link.setAttribute("href", "getvideo?url=" + encodeURIComponent(url));
      link.setAttribute("download", fileName);
      link.click();

      console.log("Done");

    }
  };

  xhttp.open("GET", "getname?url=" + encodeURIComponent(url), true);
  xhttp.send();
}