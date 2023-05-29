chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url !== undefined && !tab.url.includes("chrome://") && changeInfo.status === "complete") {
        chrome.scripting.executeScript({
            target: {
                tabId: tab.id,
                allFrames: true,
            },
            files: ["trust-no-review.js"],
        });
    }
});