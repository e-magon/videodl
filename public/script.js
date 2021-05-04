"use strict";

// for the pwa
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err));
  });
}

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
    showPage(0);
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
        showPage(1);
        document.querySelector("#video_url_text").focus();
      } else if (xhttp.status == 401) {
        if (cookie) {
          console.log("wrong cookie");
          showPage(0);
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
        showPage(5);
      }
    }
  };

  xhttp.open("get", "api/checkpsw?psw=" + psw, true);
  xhttp.send();
}

function startDownload() {
  console.log("Checking URL...");
  let url = document.querySelector("#video_url_text").value;
  console.log(url);
  if (!url)
    return;

  showPage(2);


  // check if url is valid
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = async () => {
    if (xhttp.readyState == 4) {
      await new Promise(resolve => setTimeout(resolve, 500)); // prevents page flicker
      if (xhttp.status == 200) {
        console.log("Valid URL. Starting download...");
        document.querySelector("#restart_button").style.display = "none";
        showPage(3);

        let audioSelected = document.querySelector("#audiobut").checked;
        let link = document.createElement("a");
        if (audioSelected)
          link.setAttribute("href", "api/getaudio?url=" + encodeURIComponent(url));
        else
          link.setAttribute("href", "api/getvideo?url=" + encodeURIComponent(url));
        link.setAttribute("download", "");
        link.click();

        console.log("Download started");
        setTimeout(() => { document.querySelector("#restart_button").style.display = "inline"; }, 1500);
      } else if (xhttp.status == 404) {
        console.log("URL Not found");
        showPage(4);
      } else {
        console.log("Server error");
        showPage(5);
      }
    }
  };
  xhttp.open("GET", "api/isvalid?url=" + encodeURIComponent(url), true);
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

function showPage(num) {
  let k = 0;
  let elem;
  while (elem = document.querySelector("#page" + k)) {
    elem.style.display = elem.id == "page" + num ? "block" : "none";
    k++;
  }
}