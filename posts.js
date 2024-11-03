// Importar módulos necesarios y configuraciones
const playwright = require("playwright");
const fs = require("fs");
const { faker } = require("@faker-js/faker");
const config = require("./config.json");

// Configuración
const GHOST_URL = config.url;
const HEADLESS = config.headless || false;
const DEPTH_LEVELS = config.depthLevels || 1;
const INPUT_VALUES = config.inputValues || false;
const BROWSERS = config.browsers || ["chromium"];

//Constants
var screenshots_directory = "./screenshots";
const beforeInteraction = "BEFORE";
const afterInteraction = "AFTER";
var temp_directory = "./temp"; //Stores the visitedDOMs
var graphFilenameRoot = "graph";

// Variables de inicio de sesión
const USERNAME = config.values.userInput;
const PASSWORD = config.values.passwordInput;

const saveScreenshot = async (page, step) => {
  const screenshotPath = `./screenshots/${step}.png`;
  await page.screenshot({ path: screenshotPath });
  console.log(`Captura guardada en: ${screenshotPath}`);
};

async function saveDOM(dom) {
  let path = temp_directory + "/" + statesDiscovered + ".txt";
  let stream = fs.createWriteStream(path);
  stream.write(dom);
}

// Función principal para ejecutar CRUD de posts y reportes en múltiples navegadores
(async () => {
  let datetime = new Date().toISOString().replace(/:/g, ".");
  for (const browserType of BROWSERS) {
    const browser = await playwright[browserType].launch({
      headless: HEADLESS,
    });
    const page = await browser.newPage();

    let basePath = `./results/${datetime}/${browserType}`;
    screenshots_directory = `${basePath}/screenshots`;
    temp_directory = `${basePath}/temp` + browserType;
    graphFilenameRoot = `${basePath}/graph`;

    if (!fs.existsSync(screenshots_directory)) {
      fs.mkdirSync(screenshots_directory, { recursive: true });
    } else {
      clean(screenshots_directory);
    }
    //Create the temp directory if it doesn't exist. Clean the directory if it does.
    if (!fs.existsSync(temp_directory)) {
      fs.mkdirSync(temp_directory);
    } else {
      clean(temp_directory);
    }

    // Iniciar sesión en Ghost
    await page.goto(GHOST_URL + "/ghost/#/signin");
    await page.fill('input[name="identification"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);

    // Esperar a que el enlace "Sign in" esté disponible y hacer clic
    await page.click('button[data-test-button="sign-in"]'); // Clic en el enlace de inicio de sesión

    await page.waitForNavigation();
    await saveScreenshot(page, `${browserType}_login`);
    await saveDOM(page, `${browserType}_login`);

    // CRUD de Post
    const postTitle = faker.lorem.words(5);
    const postContent = faker.lorem.paragraph();

    // Crear Post
    await page.goto(`${GHOST_URL}/ghost/#/editor/post`);
    await page.fill(".gh-editor-title", postTitle);
    await page.fill(".koenig-editor__editor", postContent);
    await page.click(".gh-publishmenu");
    await page.click(".gh-publishmenu-button");
    await saveScreenshot(page, `${browserType}_post_created`);
    await saveDOM(page, `${browserType}_post_created`);
    console.log(`Post creado con título: ${postTitle}`);

    // Verificar Post
    await page.goto(`${GHOST_URL}/ghost/#/posts`);
    const postExists = await page
      .locator(".gh-content-entry-title", { hasText: postTitle })
      .isVisible();
    console.log(
      postExists ? "Post verificado en la lista" : "Error: Post no encontrado"
    );

    // Actualizar Post
    const updatedTitle = `${postTitle} Actualizado`;
    await page.click(`text=${postTitle}`);
    await page.fill(".gh-editor-title", updatedTitle);
    await page.click(".gh-publishmenu");
    await page.click(".gh-publishmenu-button");
    await saveScreenshot(page, `${browserType}_post_updated`);
    await saveDOM(page, `${browserType}_post_updated`);
    console.log(`Post actualizado a: ${updatedTitle}`);

    // Eliminar Post
    await page.goto(`${GHOST_URL}/ghost/#/posts`);
    await page.click(`text=${updatedTitle}`);
    await page.click(".settings-menu-toggle");
    await page.click(".settings-menu-delete-button");
    await page.click(".modal-footer .gh-btn-red");
    await saveScreenshot(page, `${browserType}_post_deleted`);
    await saveDOM(page, `${browserType}_post_deleted`);
    console.log("Post eliminado");

    // Cerrar navegador
    await browser.close();
  }
})();
