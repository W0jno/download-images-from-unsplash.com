const puppeteer = require("puppeteer");
const fs = require("fs");
const sharp = require("sharp");
const https = require("https");

const run = async (dataToSearch) => {
  for (let i = 0; i < dataToSearch.length; i++) {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: false,
    });
    const modifiedSrcs = [];

    const page = await browser.newPage();
    await page.goto(`https://unsplash.com/s/photos/${dataToSearch[i]}`, {
      waitUntil: "domcontentloaded",
    });
    await page.setViewport({ width: 1920, height: 1080 });
    const [button] = await page.$x("//button[contains(., 'Load more')]");
    if (button) {
      await button.click();
    }

    await scrollDown(page, 1000);
    const images = await page.$$("img");
    const srcs = await Promise.all(
      images.map(async (image) => {
        return await page.evaluate((element) => element.src, image);
      })
    );

    srcs.map((src) => {
      if (
        typeof src !== "undefined" &&
        src !== null &&
        src.includes("https://images.unsplash.com/photo")
      ) {
        modifiedSrcs.push(src);
      }
    });

    fs.mkdirSync(`${dataToSearch[i]}`);

    for (let j = 0; j < modifiedSrcs.length; j++) {
      new Promise(() => {
        https.get(modifiedSrcs[j], (res) => {
          const stream = fs.createWriteStream(
            `${dataToSearch[i]}/picture${j + 1}.png`
          );
          res.pipe(stream);
          stream.on("finish", () => {
            stream.close();
          });
        });
      });
    }

    await page.close();
    await browser.close();
  }
};

const getDataFromFile = async () => {
  const dataToSearch = await fs
    .readFileSync("./frazy.txt", { encoding: "utf8" })
    .split(",");

  run(dataToSearch);
};

const scrollDown = async (page, maxScrolls) => {
  await page.evaluate(async (maxScrolls) => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 100;
      var scrolls = 0; // scrolls counter
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;

        window.scrollBy(0, distance);
        totalHeight += distance;
        scrolls++; // increment counter

        // stop scrolling if reached the end or the maximum number of scrolls
        if (
          totalHeight >= scrollHeight - window.innerHeight ||
          scrolls >= maxScrolls
        ) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  }, maxScrolls); // pass maxScrolls to the function
};

getDataFromFile();
