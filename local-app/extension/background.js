chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "SAVE_CLASSUP_DATA") return;
  fetch("http://127.0.0.1:8765/api/classup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message.payload)
  })
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "로컬 저장 실패");
      sendResponse({ ok: true, result });
      if (sender.tab?.id !== undefined) {
        chrome.tabs.sendMessage(sender.tab.id, { type: "LOCAL_SAVE_RESULT", result }).catch(() => {});
      }
    })
    .catch((error) => {
      console.warn("[더몰입] 로컬 서버에 연결하지 못했습니다. 로컬 프로그램을 먼저 실행하세요.", error);
      sendResponse({ ok: false, error: error.message });
    });
  return true;
});
