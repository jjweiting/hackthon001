/**
 * The VIVERSE Create Loading Screen Template
 */

pc.script.createLoadingScreen(function (app) {
  const viverseLogoSvg = `<svg width="88" height="64" viewBox="0 0 88 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#clip0_2257_31172)">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M34.6625 54.664L30.0006 63.771C29.9239 63.9128 29.7703 64.011 29.6058 64.011H28.0701C27.9055 64.011 27.752 63.9237 27.6752 63.771L23.0133 54.664C22.9365 54.5113 22.9365 54.3259 23.0243 54.1841L23.5289 53.3225C23.6276 53.1589 23.8031 53.0498 24.0005 53.0498H24.4503C24.5709 53.0498 24.6806 53.1152 24.7355 53.2243L28.6514 60.968C28.7063 61.0771 28.8379 61.1207 28.9586 61.0662C29.0025 61.0444 29.0354 61.0116 29.0573 60.968L32.9733 53.2352C33.0281 53.1262 33.1378 53.0607 33.2585 53.0607H33.7082C33.9056 53.0607 34.0812 53.1589 34.1799 53.3334L34.6735 54.195C34.7393 54.3259 34.7503 54.5113 34.6625 54.664Z" fill="white"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M11.7145 54.6531L7.05263 63.7601C6.97584 63.9019 6.82228 64 6.65774 64H5.12206C4.95753 64 4.80396 63.9128 4.72717 63.7601L0.0543322 54.6531C-0.0224516 54.5004 -0.0224516 54.315 0.0653013 54.1732L0.558911 53.3115C0.657633 53.1479 0.833139 53.0389 1.01961 53.0389H1.46935C1.59001 53.0389 1.6997 53.1043 1.75454 53.2134L5.67052 60.9571C5.72536 61.0661 5.86796 61.1098 5.97765 61.0552C6.02153 61.0334 6.05444 61.0007 6.07638 60.9571L10.0033 53.2243C10.0582 53.1152 10.1679 53.0498 10.2885 53.0498H10.7382C10.9247 53.0498 11.1002 53.1479 11.199 53.3115L11.6926 54.1732C11.7803 54.3259 11.7803 54.5113 11.7145 54.6531Z" fill="white"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M18.3502 53.1807C18.2625 53.0934 18.1418 53.0498 18.0211 53.0498H17.3081C17.1107 53.0498 16.9242 53.148 16.8255 53.3225L16.31 54.1841C16.2661 54.2604 16.2441 54.3586 16.2441 54.4459V63.5638C16.2441 63.8037 16.4526 64.011 16.7048 64.011H18.0321C18.2844 64.011 18.4818 63.8146 18.4818 63.5747V53.5188C18.4818 53.3879 18.438 53.2679 18.3502 53.1807Z" fill="white"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M39.861 53.3225C39.9597 53.1589 40.1352 53.0498 40.3217 53.0498H46.947C47.1335 53.0498 47.309 53.148 47.4077 53.3225L47.8794 54.1296C47.9452 54.2386 47.9781 54.3695 47.9781 54.5113V54.7076C47.9781 54.8712 47.8355 55.0021 47.671 55.0021H41.627C41.5063 55.0021 41.4076 55.1002 41.4076 55.2202V57.3143C41.4076 57.4343 41.5063 57.5324 41.627 57.5324H45.7294C45.9269 57.5324 46.0914 57.696 46.0914 57.8923V59.0921C46.0914 59.2884 45.9269 59.452 45.7294 59.4629H41.627C41.5063 59.4629 41.4076 59.5611 41.4076 59.681V61.8405C41.4076 61.9605 41.5063 62.0587 41.627 62.0587H47.671C47.8355 62.0587 47.9671 62.1895 47.9781 62.3531V62.5604C47.9781 62.6912 47.9452 62.8221 47.8794 62.9421L47.4187 63.7383C47.32 63.9019 47.1554 64 46.9689 64H40.3326C40.1462 64 39.9597 63.9019 39.8719 63.7274L39.4112 62.9312C39.3454 62.8112 39.3125 62.6803 39.3125 62.5495V54.4895C39.3125 54.3586 39.3454 54.2277 39.4112 54.1077L39.861 53.3225Z" fill="white"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M79.6236 53.3225C79.7223 53.1589 79.8978 53.0498 80.0843 53.0498H86.7206C86.9071 53.0498 87.0826 53.148 87.1704 53.3116L87.642 54.1187C87.7078 54.2277 87.7408 54.3586 87.7408 54.5004V54.6967C87.7408 54.8603 87.6091 55.0021 87.4446 55.0021H81.4006C81.2799 55.0021 81.1812 55.1002 81.1812 55.2202V57.3143C81.1812 57.4343 81.2799 57.5324 81.4006 57.5324H85.503C85.7005 57.5324 85.865 57.696 85.865 57.8923V59.0921C85.865 59.2884 85.7005 59.452 85.503 59.452H81.3896C81.269 59.452 81.1703 59.5501 81.1703 59.6701V61.8405C81.1703 61.9605 81.269 62.0587 81.3896 62.0587H87.4336C87.5981 62.0587 87.7298 62.1895 87.7298 62.3531V62.5495C87.7298 62.6803 87.6969 62.8112 87.6311 62.9312L87.1594 63.7383C87.0607 63.9019 86.8961 64 86.7097 64H80.0843C79.8978 64 79.7223 63.9019 79.6236 63.7274L79.1629 62.9312C79.0971 62.8112 79.0532 62.6803 79.0642 62.5495V54.4786C79.0642 54.3477 79.0971 54.2168 79.1629 54.0968L79.6236 53.3225Z" fill="white"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M54.5383 54.9911H58.6079C59.3099 54.9911 59.639 55.4601 59.639 56.2127C59.639 57.0961 59.3099 57.5542 58.6079 57.5542H54.5383V54.9911ZM61.5476 62.3967L59.9242 59.2229C60.8675 58.7757 61.6024 57.805 61.6024 56.2236C61.6024 55.0239 61.1308 54.304 60.7249 53.9114C60.1545 53.3661 59.3867 53.0607 58.5969 53.0607H53.3866C53.1891 53.0607 53.0136 53.1588 52.9149 53.3224L52.4213 54.184C52.3774 54.2604 52.3555 54.3476 52.3555 54.4349V63.5746C52.3555 63.8146 52.5529 64.0218 52.8052 64.0218H54.0886C54.3299 64.0218 54.5274 63.8255 54.5274 63.5856V59.5174H57.6206L59.8145 63.8582C59.8693 63.9673 59.979 64.0327 60.0997 64.0327H60.5494C60.7468 64.0327 60.9223 63.9346 61.0101 63.771L61.5147 62.9093C61.6244 62.7239 61.6244 62.5494 61.5476 62.3967Z" fill="white"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M69.0057 55.0784H73.854C74.0186 55.0784 74.1502 54.9475 74.1612 54.7839V54.5767C74.1612 54.4458 74.1283 54.3149 74.0624 54.195L73.5908 53.3988C73.492 53.2352 73.3165 53.137 73.1301 53.137H69.0057C67.13 53.137 66.0879 54.653 66.0879 56.3327V56.3545C66.0879 58.1432 67.2396 59.5501 69.0057 59.5501H71.6602C72.4829 59.5501 72.6365 60.259 72.6365 60.7935V60.8153C72.6365 61.3497 72.5158 62.0586 71.6602 62.0586H66.8118C66.6473 62.0477 66.5157 62.1786 66.5047 62.3422C66.5047 62.3422 66.5047 62.3422 66.5047 62.3531V62.5494C66.5047 62.6803 66.5376 62.8112 66.6034 62.9312L67.0751 63.7383C67.1738 63.9019 67.3493 64 67.5358 64H71.6602C73.4262 64 74.578 62.5931 74.578 60.8044V60.7826C74.578 59.1029 73.5359 57.5869 71.6602 57.5869H69.0057C68.1611 57.5869 68.0294 56.878 68.0294 56.3436V56.3218C68.0294 55.7873 68.183 55.0784 69.0057 55.0784Z" fill="white"/>
  <path d="M70.1798 28.5535C68.5893 19.3265 64.081 10.6012 57.4776 3.98091L57.3898 3.88275C56.9182 3.41377 56.4355 2.92297 55.909 2.48671C54.2746 1.10157 52.5196 0.523517 51.3349 0.283572C50.7096 0.152693 48.801 0 46.3439 0H39.0824C36.2962 0.0327198 33.6966 1.11247 31.766 3.05385C28.7495 5.99864 26.1279 9.39059 23.9669 13.1097C21.806 16.8507 20.1497 20.8425 19.0418 25.0307L19.0089 25.1397C18.7566 26.0995 18.4714 27.1902 18.3398 28.1936C17.912 30.604 18.3179 33.167 19.4806 35.4247C20.6433 37.6823 22.4642 39.4492 24.6251 40.4199C27.9158 41.7505 32.5448 42.6667 37.6345 43.0048C37.788 43.0157 40.6948 43.2229 43.5468 43.2229H43.6236C46.3659 43.2229 49.0533 43.0375 49.0752 43.0375H49.1191C53.0461 42.8957 58.6732 42.2413 62.6989 40.8453C65.5179 39.8528 67.7886 37.8023 69.1049 35.1084C69.5875 34.105 69.9385 33.0252 70.125 31.9346C70.3005 30.8112 70.3224 29.6769 70.1798 28.5535ZM22.2558 36.5262C21.3563 35.6101 20.6543 34.454 20.2265 33.2652C19.6671 31.7273 19.5025 30.0041 19.7548 28.3681C19.9084 27.3538 20.1607 26.3286 20.413 25.3252C21.4221 21.3006 23.0126 17.407 25.1516 13.7532C26.8738 10.8085 28.936 8.04908 31.2614 5.56237C33.4662 3.19564 35.32 1.52693 38.2268 1.30879C38.2597 1.30879 38.6546 1.28698 38.6546 1.28698C38.6546 1.28698 37.7442 1.59237 37.5467 1.70143C36.4388 2.32311 35.5723 3.15201 34.6838 4.03545C34.6728 4.04635 34.6728 4.04635 34.6618 4.05726C32.0731 6.74029 29.8025 9.75051 27.8939 13.0007C25.6891 16.7635 24.0108 20.7662 22.9139 24.9107C21.9706 28.0954 21.5647 31.3238 22.881 34.4758C23.6927 36.439 25.7001 38.3149 27.3674 39.471C25.2613 39.002 23.934 38.2495 22.2558 36.5262ZM26.5995 36.4826L26.5557 36.4281C24.4496 34.214 23.5282 30.9312 24.1315 27.8555C24.1534 27.7573 24.1863 27.5937 24.2192 27.4192L24.2521 27.2556C24.3289 26.9066 24.4057 26.5031 24.4496 26.3067C25.4039 22.0641 26.9835 17.9741 29.1115 14.1677C30.7678 11.2229 32.7422 8.45263 35.0238 5.9441C36.0549 4.79891 37.1079 3.68644 38.4242 2.89025C39.1043 2.4758 39.8502 2.09407 40.64 1.91956C41.1885 1.79959 41.7589 1.85412 41.7589 1.85412C40.7387 2.56305 39.565 3.53374 38.7204 4.42808C37.8429 5.34424 36.9983 6.31493 36.2085 7.29652C34.596 9.30334 33.1591 11.441 31.8867 13.6769C31.8537 13.7423 31.8099 13.8078 31.777 13.8841C29.4734 18.0068 27.8061 22.4022 26.8189 26.9502C26.1937 29.2952 26.3143 31.7382 27.148 34.0286C27.5538 35.1193 28.1133 36.1554 28.8263 37.0716C29.3857 37.8023 30.3181 38.4567 31.0201 39.013C29.6599 38.5767 27.861 37.8678 26.5995 36.4826ZM46.4317 40.7144C45.2361 40.8125 43.1739 40.8562 42.1318 40.7253C38.8959 40.3217 38.2268 40.1581 35.0677 39.0457C32.9507 38.304 31.0969 36.8644 29.9232 34.803C28.7275 32.7307 28.3217 30.3204 28.7824 28.0191C28.8372 27.79 28.8811 27.5392 28.936 27.2883C29.0566 26.6667 29.1882 26.0014 29.3638 25.456C30.351 21.4206 31.9305 17.516 34.0147 13.8623C36.0878 10.2522 38.6217 6.95842 41.5504 4.08998C42.066 3.57737 42.4718 3.1411 43.0532 2.79209C43.7333 2.3122 44.1501 2.60668 44.4902 2.75937C45.0167 2.99932 45.5213 3.41377 46.0258 3.85003C48.2087 5.92229 50.216 8.26721 51.9711 10.8303C53.7042 13.3497 55.196 16.0763 56.4355 18.9557C57.6421 21.7587 58.5964 24.8671 59.2546 28.1282L59.2985 28.3899C59.6275 30.4949 59.3094 32.6326 58.3003 34.5303C57.4557 36.1227 56.1723 37.4533 54.6805 38.304C54.0443 38.6967 52.2124 39.5474 51.5652 39.7219C49.4811 40.3872 48.6145 40.529 46.4317 40.7144ZM56.6439 39.1875C57.8834 38.1841 58.9474 36.9843 59.6824 35.5665C60.9438 33.1561 61.3936 30.6258 60.6915 27.4519C59.9676 24.1581 59.0023 21.0061 57.7518 18.0941C56.7865 15.7928 55.5909 13.546 54.2198 11.3974C52.8706 9.31425 51.3349 7.29652 49.6566 5.42059C48.5158 4.14451 47.3641 2.86844 45.9491 1.87594C45.598 1.62509 45.2141 1.42877 44.7973 1.27607C47.035 1.27607 48.6365 2.21404 49.9637 3.50102C51.7737 5.25699 53.4519 7.16564 54.9766 9.16155C57.3789 12.3136 59.3423 15.7164 60.6257 18.9884L60.889 19.6537C62.666 24.1145 64.8598 29.6551 62.7318 34.1704C62.7208 34.1922 62.7208 34.214 62.7099 34.2249C60.9767 38.2713 56.8414 40.6817 53.4958 41.0416C53.5836 41.0416 55.4154 40.1691 56.6439 39.1875ZM66.9439 34.4322C64.4759 38.773 60.7574 39.7219 60.7574 39.7219C62.8195 38.2495 64.07 36.1772 64.8379 34.0941C65.485 32.3054 65.7044 30.4076 65.4741 28.619C64.4539 20.6789 60.3405 12.2263 54.1869 5.45331C53.2874 4.4608 52.2892 3.40286 51.2142 2.4758C50.6329 1.985 50.1283 1.55965 49.4372 1.24335C49.4372 1.24335 52.4976 1.59237 54.7463 3.77369C55.9309 4.91888 57.1046 6.22768 58.1686 7.51466C61.0096 10.9721 63.3351 14.8221 65.1011 18.9884C66.1651 21.486 67.0207 24.18 67.6679 26.9939C68.2822 29.5242 68.1725 32.2618 66.9439 34.4322Z" fill="url(#paint0_linear_2257_31172)"/>
  </g>
  <defs>
  <linearGradient id="paint0_linear_2257_31172" x1="18.6876" y1="20.2136" x2="70.6731" y2="23.0618" gradientUnits="userSpaceOnUse">
  <stop offset="0.05" stop-color="#73EAFF"/>
  <stop offset="0.25" stop-color="#01B0E0"/>
  <stop offset="0.6" stop-color="#415FF8"/>
  <stop offset="1" stop-color="#C761D6"/>
  </linearGradient>
  <clipPath id="clip0_2257_31172">
  <rect width="87.7419" height="64" fill="white"/>
  </clipPath>
  </defs>
  </svg>`

  const showSplash = function () {
      // splash wrapper
      const wrapper = document.createElement('div');
      wrapper.id = 'application-splash__wrapper';
      document.body.appendChild(wrapper);

      // splash background
      const parallaxStarsBackground = document.createElement('div');
      parallaxStarsBackground.id = 'parallax-stars-background';
      const starsDivNames = [
        'stars__small--blur',
        'stars__medium--blur',
        'stars__large--blur',
        'stars__large--clear'
      ];
      starsDivNames.forEach(name => {
        const starsDiv = document.createElement('div');
        starsDiv.id = name;
        parallaxStarsBackground.appendChild(starsDiv);
      });
      wrapper.appendChild(parallaxStarsBackground);

      // splash
      const splash = document.createElement('div');
      splash.id = 'application-splash';
      wrapper.appendChild(splash);

      const logo = document.createElement('div');
      logo.id = 'logo';
      logo.innerHTML = viverseLogoSvg;
      splash.appendChild(logo);

      const progress = document.createElement('div');
      progress.id = 'progress-wrapper';
      splash.appendChild(progress);

      const progressBarBackground = document.createElement('div');
      progressBarBackground.id = 'progress-bar__background';
      progress.appendChild(progressBarBackground);

      const progressBar = document.createElement('div');
      progressBar.id = 'progress-bar__bar';
      progressBarBackground.appendChild(progressBar);

      const progressText =  document.createElement('p');
      progressText.id = 'progress-bar__text';
      progress.appendChild(progressText);
  };


  const hideSplash = function () {
    const timeout = 250; // delay to allow users to see 100% loaded state

    setTimeout(() => {
      const wrapper = document.getElementById('application-splash__wrapper');
      if(wrapper) wrapper.parentElement.removeChild(wrapper);

      const styleSheet = document.getElementById('viverse-loading-screen-style');
      if(styleSheet) styleSheet.remove();

    }, timeout);
  };

  const setProgressBar = function (value) {
    const bar = document.getElementById('progress-bar__bar');
    if (bar) {
      value = Math.min(1, Math.max(0, value));
      bar.style.width = value * 100 + '%';
    }
  };

  const setProgressText = function () {
    const loadingTexts = [
      'Connecting to the universe... 🚀',
      'Downloading stardust... 💫',
      'Waving at aliens... 👽',
      'Checking space snacks... 🍪',
      'Diving into the world... 🐬',
    ];
    const text =  document.getElementById('progress-bar__text');
    if(text) {
      let i = 0;
      const changeText = () => {
        text.textContent = loadingTexts[i];
        i = (i + 1) % loadingTexts.length;

        text.classList.remove('text-fade-in');
        void text.offsetWidth;           // trigger reflow
        text.classList.add('text-fade-in');
      };

      changeText(); // set initial message
      const timer = setInterval(changeText, 1500);
      app.once('start', () => clearInterval(timer));
    }
    
  };



  const createCss = () => {
    const multipleBoxShadowBlur = (total, radius) => {
      const shadows = [];
      for (let i = 0; i < total; i++) {
        const x = Math.floor(Math.random() * 2000);
        const y = Math.floor(Math.random() * 2000);
        const blur = radius * 0.1 + Math.random() * radius;
        const spread = radius * 0.1;
        shadows.push(`${x}px ${y}px ${blur.toFixed(1)}px ${spread}px #C5C5C5`);
      }
      return shadows.join(', ');
    }

    const multipleBoxShadowClear = (total) => {
      const shadows = [];
      for (let i = 0; i < total; i++) {
        const x = Math.floor(Math.random() * 2000);
        const y = Math.floor(Math.random() * 2000);
        shadows.push(`${x}px ${y}px #C5C5C5`);
      }
      return shadows.join(', ');
    }

    // Generate the shadow values
    const shadowsSmallBlur = multipleBoxShadowBlur(700, 1);
    const shadowsMediumBlur = multipleBoxShadowBlur(300, 2);
    const shadowsBigBlur = multipleBoxShadowBlur(20, 3);
    const shadowsBigClear = multipleBoxShadowClear(10);

    // Generate the complete CSS
    const css = `
    body {
        background-color: #090a0f;
    }
    
    #application-splash__wrapper {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: #090a0f;
      z-index: 100;
    }
    
    #application-splash {
      position: relative;
      top: 50%;
      left: 50%;
      padding: 40px;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    #logo {
      width: 93px;
      margin-bottom: 40px;
    }
    
    #logo svg {
      width: 100%;
      height: auto;
    }

    #progress-wrapper {
      width: 100%;
      gap: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 14px 0px;
    }
    
    #progress-bar__background {
      width: 100%;
      max-width: 400px;
      height: 6px;
      border-radius: 99px;
      background: rgba(255, 255, 255, 0.3);
    }
    
    #progress-bar__bar {
      width: 0;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(
        93deg,
      #01b0e0 3.01%,
      #415ff8 52.52%,
      #c761d6 80.83%
      );
      box-shadow: 0px 0px 3px 0px rgba(255, 255, 255, 0.8) inset;
    }

    #progress-bar__text {
      color: #d5e2f2;
      font-family: 'Roboto', system-ui, -apple-system, sans-serif;
      font-weight: 400;
      letter-spacing: 0.2px;
      font-size: 14px;
      line-height: 22px;
    }

    .text-fade-in {
      animation: loading-text-fade-in 0.3s ease-out;
    }

    @keyframes loading-text-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    #parallax-stars-background {
      position: absolute;
      height: 100%;
      width: 100%;
      background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
      overflow: hidden;
    }

    #stars__small--blur {
      width: 1px;
      height: 1px;
      background: transparent;
      left: 500px;
      top: 500px;
      box-shadow: ${shadowsSmallBlur};
      border-radius: 50%;
      animation: stars-float-up 300s linear infinite;
      filter: blur(0.5px);
    }

    #stars__small--blur:after {
      content: ' ';
      position: absolute;
      top: 2000px;
      width: 1px;
      height: 1px;
      background: transparent;
      box-shadow: ${shadowsSmallBlur};
    }

    #stars__medium--blur {
      width: 2px;
      height: 2px;
      background: transparent;
      box-shadow: ${shadowsMediumBlur};
      border-radius: 50%;
      animation: stars-float-up 200s linear infinite;
      filter: blur(0.5px);
    }

    #stars__medium--blur:after {
      content: ' ';
      position: absolute;
      top: 2000px;
      width: 2px;
      height: 2px;
      background: transparent;
      box-shadow: ${shadowsMediumBlur};
    }

    #stars__large--blur {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: transparent;
      box-shadow: ${shadowsBigBlur};
      animation: stars-float-up 100s linear infinite;
      position: relative;
    }

    #stars__large--blur:after {
      content: ' ';
      position: absolute;
      top: 2000px;
      width: 3px;
      height: 3px;
      background: transparent;
      box-shadow: ${shadowsBigBlur};
    }

    #stars__large--clear {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: transparent;
      box-shadow: ${shadowsBigClear};
      animation: stars-float-up 100s linear infinite;
      position: relative;
    }

    #stars__large--clear:after {
      content: ' ';
      position: absolute;
      top: 2000px;
      width: 3px;
      height: 3px;
      background: transparent;
      box-shadow: ${shadowsBigClear};
    }

    @keyframes stars-float-up {
      from {
        transform: translateY(0px);
      }
      to {
        transform: translateY(-6000px);
      }
    }

    @media (max-width: 844px) { 
      #logo {
        width: 88px;
        margin-bottom: 32px;
      }
    }
    `;

    const style = document.createElement('style');
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    style.id = 'viverse-loading-screen-style';
    document.head.appendChild(style);
  };

  createCss();
  showSplash();
  setProgressText();

  app.on('preload:end', function () {
      app.off('preload:progress');
  });
  app.on('preload:progress', setProgressBar);
  app.on('start', hideSplash);
});