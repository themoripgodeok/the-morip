window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== "https://academy.classup.io") return;
  const message = event.data;
  if (!message || message.source !== "THEMORIP_CLASSUP_BRIDGE" || message.type !== "DATA") return;
  chrome.runtime.sendMessage({ type: "SAVE_CLASSUP_DATA", payload: message.payload });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "LOCAL_SAVE_RESULT") {
    console.info("[더몰입] 로컬 저장 결과:", message.result);
  }
});
