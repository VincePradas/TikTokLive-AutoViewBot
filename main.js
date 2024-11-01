const puppeteer = require('puppeteer');
const Rembrandt = require('rembrandt');

(async () => {
    const browser = await puppeteer.launch({ headless: false });

    const page = await browser.newPage();

    await page.goto('https://www.tiktok.com/login/phone-or-email/email');

    const user = 'input[name="username"]';
    const pass = 'input[type="password"]';

    await page.type(user, 'test');
    await page.type(pass, 'test');

    const login = 'button[type="submit"]';
    await page.click(login);

    // Wait for the captcha slider to appear
    await page.waitForSelector('.captcha_verify_img_slide', { timeout: 10000 });

    const sliderElement = await page.$('.captcha_verify_img_slide');
    if (!sliderElement) {
        console.error("Slider element not found");
        await browser.close();
        return;
    }

    const slider = await sliderElement.boundingBox();
    if (!slider) {
        console.error("Could not get bounding box of the slider");
        await browser.close();
        return;
    }

    const sliderHandle = await page.$('.secsdk-captcha-drag-icon');
    if (!sliderHandle) {
        console.error("Slider handle not found");
        await browser.close();
        return;
    }

    const handle = await sliderHandle.boundingBox();
    if (!handle) {
        console.error("Could not get bounding box of the handle");
        await browser.close();
        return;
    }

    let currentPosition = 0;
    let bestSlider = {
        position: 0,
        difference: 100
    };

    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();

    const originalImage = await page.screenshot(); // Capture the original image

    while (currentPosition < slider.width - handle.width / 2) {

        await page.mouse.move(
            handle.x + currentPosition,
            handle.y + handle.height / 2 + Math.random() * 10 - 5
        );

        let sliderContainer = await page.$('.captcha_verify_container');
        if (!sliderContainer) {
            console.error("Slider container not found");
            await browser.close();
            return;
        }

        let sliderImage = await sliderContainer.screenshot();

        const rembrandt = new Rembrandt({
            imageA: originalImage,
            imageB: sliderImage,
            thresholdType: Rembrandt.THRESHOLD_PERCENT
        });

        let result = await rembrandt.compare();
        let difference = result.percentageDifference * 100;

        if (difference < bestSlider.difference) {
            bestSlider.difference = difference;
            bestSlider.position = currentPosition;
        }

        currentPosition += 5;
    }

    await page.mouse.move(handle.x + bestSlider.position, handle.y + handle.height / 2, { steps: 10 });
    await page.mouse.up();
    
    await new Promise(resolve => setTimeout(resolve, 30000));

    await browser.close();
})();
