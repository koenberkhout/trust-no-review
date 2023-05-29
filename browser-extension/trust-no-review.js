function showLoadingIndicator() {
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "custom-loading-indicator";
    loadingIndicator.id = "loading-indicator";
    loadingIndicator.innerHTML = '<div class="lds-ring"><div></div><div></div><div></div><div></div></div> Checking reviews for authenticity...';

    document.body.appendChild(loadingIndicator);
}

function updateLoadingIndicator(message, hideAfterFadeOut = false) {
    const loadingIndicator = document.getElementById("loading-indicator");
    if (loadingIndicator) {
        loadingIndicator.querySelector(".lds-ring").style.display = "none";
        loadingIndicator.innerHTML = message;

        if (hideAfterFadeOut) {
            setTimeout(() => {
                loadingIndicator.style.opacity = "0";
                setTimeout(() => {
                    document.body.removeChild(loadingIndicator);
                }, 1500); // The same duration as the CSS transition
            }, 2000); // Wait 2 seconds before starting the fade-out
        }
    }
}


const style = document.createElement("style");
style.innerHTML = `
.custom-loading-indicator {
    height: 70px !important;
    opacity: 1;
    transition: opacity 1.5s !important;
    position: fixed !important;
    bottom: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    z-index: 1000 !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 350px !important;
    max-width: 100% !important;
    border-radius: 10px !important;
    background-color: #131921 !important;
    font-size: 16px !important;
    border: 1px solid rgba(0,0,0,.1) !important;
    box-shadow: 0 0.5rem 1rem rgba(0,0,0,.15) !important;
    padding: 0.75rem !important;
    word-wrap: break-word !important;
    line-height: 1.5 !important;
    color: #f6f6f6 !important;
}
.lds-ring {
  display: inline-block;
  position: relative;
  width: 40px;
  height: 40px;
  margin-right: 10px;
}
.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 32px;
  height: 32px;
  margin: 4px;
  border: 4px solid #ff9900;
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: #ff9900 transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}
@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
`;
document.head.appendChild(style);

const reviewWrapperMainPage = document.getElementById("cm-cr-dp-review-list");
const reviewWrapperReviewsPage = document.getElementById("cm_cr-review_list");
const reviewWrapper = reviewWrapperMainPage ?? reviewWrapperReviewsPage;
const reviewTextSelector = reviewWrapperMainPage ? "div.review .reviewText > span" : "div.review .review-text-content > span";

if (reviewWrapper !== null) {
    const reviewElements = reviewWrapper.querySelectorAll("div.review");
    const reviewsHtml = reviewWrapper.querySelectorAll(reviewTextSelector);
    const reviews = [];

    reviewsHtml.forEach((reviewElement) => {
        const reviewHtml = reviewElement.innerHTML.replaceAll("<br>", " ");
        const textArea = document.createElement("textarea");
        textArea.innerHTML = reviewHtml;
        reviews.push(textArea.value.replace(/\s\s+/g, " "));
    });

    console.log(reviews);
    showLoadingIndicator();

    fetch('http://127.0.0.1:8000/classify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviews)
    })
    .then(response => response.json())
    .then(data => {
        updateLoadingIndicator("&#x2714; Check completed.", true);
        const icons = document.querySelectorAll(".verdict_icon");
        if (icons.length === 0) {
            if (reviewWrapperReviewsPage !== null) {
                reviewWrapperReviewsPage.style.marginLeft = "25px";
            }
            console.log(data);
            const values = Object.keys(data).map(function(k){ return data[k] });
            reviewElements.forEach((reviewElement, i) => {
                const classification = values[i];
                reviewElement.setAttribute("data-verdict", classification);
                const isRealReview = classification === "real";
                const icon = isRealReview ? "&#10004;" : "&#10008;";
                const background = isRealReview ? "green" : "red";
                const verdict = document.createElement("div");
                verdict.innerHTML = "<span class='verdict_icon' role='img' aria-label='" + classification + " review' style='background:" + background + ";border-radius:50%;height:26px;width:26px;line-height:26px;display:inline-block;text-align:center;position:absolute;top:34px;left:-32px;color:white;'>" + icon + "</span>";
                reviewElement.prepend(verdict);
            });
        }
    })
    .catch(error => {
        console.error(error);
        updateLoadingIndicator("Check failed, please check the console.");
    })
}
