"use strict";

function startDownload() {
  console.log("Checking URL...");
  let url = document.querySelector("#video_url").value;
  console.log(url);
  if (!url)
    return;

  document.querySelector("#page1").style.display = "none";
  document.querySelector("#page2").style.display = "block";
  document.querySelector("#page3").style.display = "none";
  document.querySelector("#page4").style.display = "none";
  document.querySelector("#page5").style.display = "none";


  // check if url is valid
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = async () => {
    if (xhttp.readyState == 4) {
      await new Promise(resolve => setTimeout(resolve, 500)); // prevents page flicker
      if (xhttp.status == 200) {
        console.log("Valid URL. Starting download...");
        document.querySelector("#page1").style.display = "none";
        document.querySelector("#page2").style.display = "none";
        document.querySelector("#page3").style.display = "block";
        document.querySelector("#page4").style.display = "none";
        document.querySelector("#page5").style.display = "none";

        let audioSelected = document.querySelector("#audiobut").checked;
        let link = document.createElement("a");
        if (audioSelected)
          link.setAttribute("href", "getaudio?url=" + encodeURIComponent(url));
        else
          link.setAttribute("href", "getvideo?url=" + encodeURIComponent(url));
        link.setAttribute("download", "");
        link.click();

        console.log("Download started");
      } else if (xhttp.status == 404) {
        console.log("URL Not found");
        document.querySelector("#page1").style.display = "none";
        document.querySelector("#page2").style.display = "none";
        document.querySelector("#page3").style.display = "none";
        document.querySelector("#page4").style.display = "block";
        document.querySelector("#page5").style.display = "none";
      } else {
        console.log("Server error");
        document.querySelector("#page1").style.display = "none";
        document.querySelector("#page2").style.display = "none";
        document.querySelector("#page3").style.display = "none";
        document.querySelector("#page4").style.display = "none";
        document.querySelector("#page5").style.display = "block";
      }
    }
  };
  xhttp.open("GET", "isvalid?url=" + encodeURIComponent(url), true);
  xhttp.send();
}