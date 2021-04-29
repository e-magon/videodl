"use strict";

// I don't like this way of listening for the enter key
document.querySelector("#password_text").addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    checkPsw();
  }
});

document.querySelector("#video_url_text").addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    startDownload();
  }
});

function checkCookie() {
  let savedCookie = document.cookie;
  if (savedCookie && savedCookie.length > 4 && savedCookie.startsWith("psw=")) {
    savedCookie = savedCookie.substring(4);
    checkPsw(savedCookie);
  } else {
    document.querySelector("#page0").style.display = "block";
    document.querySelector("#password_text").focus();
  }
}

function saveCookie(value) {
  let cookieDate = new Date();
  cookieDate.setFullYear(cookieDate.getFullYear() + 1);
  let date = cookieDate.toUTCString();
  document.cookie = `psw=${value}; expires=${date}; samesite=strict; secure;`;
}

async function checkPsw(cookie) {
  let psw;
  if (!cookie) {
    document.querySelector("#psw_button").disabled = true;
    psw = document.querySelector("#password_text").value;
    psw = encodeURIComponent(await sha256(psw));
  } else
    psw = cookie;

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = async () => {
    if (xhttp.readyState == 4) {
      if (xhttp.status == 200) {
        console.log("correct psw");
        saveCookie(psw);

        document.querySelector("#page0").style.display = "none";
        document.querySelector("#page1").style.display = "block";
        document.querySelector("#video_url_text").focus();
      } else if (xhttp.status == 401) {
        if (cookie) {
          console.log("wrong cookie");
          document.querySelector("#page0").style.display = "block";
          document.querySelector("#password_text").focus();
        } else {
          console.log("wrong psw");
          document.querySelector("#password_text").classList.add("red");
          await new Promise(resolve => setTimeout(resolve, 2000));
          document.querySelector("#password_text").classList.remove("red");
          document.querySelector("#psw_button").disabled = false;
        }
      } else {
        console.log("Server error");
        document.querySelector("#page0").style.display = "none";
        document.querySelector("#page5").style.display = "block";
      }
    }
  };

  xhttp.open("get", "checkpsw?psw=" + psw, true);
  xhttp.send();
}

function startDownload() {
  console.log("Checking URL...");
  let url = document.querySelector("#video_url_text").value;
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

async function sha256(inputString) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(inputString);

  // hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string                  
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}