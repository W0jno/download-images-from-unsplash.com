const puppeteer = require("puppeteer");
const fs = require("fs");
const https = require("https");
/**
 * Runs script
 *
 * @param {string} dataToSearch
 */
const run = async (dataToSearch) => {
  fs.mkdirSync("zdjecia");
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

    await scrollDown(page, 300);
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

    fs.mkdirSync(`zdjecia/${dataToSearch[i]}`);

    const downloadPromises = [];

    for (let j = 0; j < modifiedSrcs.length; j++) {
      const promise = new Promise((resolve) => {
        https.get(modifiedSrcs[j], (res) => {
          const stream = fs.createWriteStream(
            `zdjecia/${dataToSearch[i]}/picture${j + 1}.png`
          );
          res.pipe(stream);
          stream.on("finish", () => {
            stream.close();
            resolve();
          });
        });
      });

      downloadPromises.push(promise);
    }

    await Promise.all(downloadPromises);
    await convertResolutionTo1920(modifiedSrcs);
    await page.close();
    await browser.close();
  }
};

/**
 * Gets data from "frazy.txt" file, then run a "run" function
 *
 */
const getDataFromFile = async () => {
  const dataToSearch = await fs
    .readFileSync("./frazy.txt", { encoding: "utf8" })
    .split(",");

  run(dataToSearch);
};

/**
 * Scrolls down to the bottom of the page or to the maximum number of scrolls
 *
 * @param {puppeteer.Page} page
 * @param {number} maxScrolls
 */
const scrollDown = async (page, maxScrolls) => {
  await page.evaluate(async (maxScrolls) => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 100;
      let scrolls = 0; // scrolls counter
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;

        window.scrollBy(0, distance);
        totalHeight += distance;
        scrolls++; // increment counter

        if (
          totalHeight >= scrollHeight - window.innerHeight ||
          scrolls >= maxScrolls
        ) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  }, maxScrolls);
};
/**
 *Converts resolution of picture to 1920 pixels
 *
 * @param {string[]} modifiedSrcs
 */
const convertResolutionTo1920 = async (modifiedSrcs) => {
  const resolution = "q=100&w=1920";
  const changedResSrcs = [];
  fs.mkdirSync(`zdjecia/duze`);

  const downloadPromises = [];

  for (let i = 0; i < modifiedSrcs.length; i++) {
    changedResSrcs.push(modifiedSrcs[i].replace("q=80&w=1000", resolution));
  }

  for (let j = 0; j < changedResSrcs.length; j++) {
    const promise = new Promise((resolve) => {
      https.get(changedResSrcs[j], (res) => {
        const stream = fs.createWriteStream(`zdjecia/duze/picture${j + 1}.png`);
        res.pipe(stream);
        stream.on("finish", () => {
          stream.close();
          resolve();
        });
      });
    });

    downloadPromises.push(promise);
  }

  await Promise.all(downloadPromises);
};

getDataFromFile();
