const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const https = require("https");
const fs = require("fs");

const { spawn } = require("child_process");
const puppeteer = require("puppeteer");
const zlib = require("zlib");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("index.html");
  // maximize the window
  mainWindow.maximize();
  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  //  mainWindow.webContents.openDevTools();
};

ipcMain.handle("getFilePath", async () => getFilePath());
ipcMain.handle("getStoredProjects", async () => getStoredProjects());
ipcMain.handle("storeProjectData", async (events, args) =>
  storeProjectData(args)
);
ipcMain.handle(
  "dateUpdater",
  async (events, args) => {
    const [{ updateType, updatePath, completeProjectData }] = args;

    return dateUpdater(updateType, updatePath, completeProjectData);
  }
  //dateUpdater(args, "no-path")
);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// gets file Path for selected project directory

const getFilePath = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (canceled) {
    return;
  } else {
    return filePaths[0];
  }
};

// gets json data and send to renderer
const getStoredProjects = async () => {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync("./src/data/data.json");
      const projectData = JSON.parse(data);
      resolve(projectData);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

const storeProjectData = async (data) => {
  const jsonData = JSON.stringify(data);

  try {
    fs.writeFileSync("./src/data/data.json", jsonData);
    return true;
  } catch (err) {
    console.log(err);
  }
};

const runCommandPrompt = (path) => {
  return new Promise((resolve, reject) => {
    try {
      const runDocker = () => {
        const dockerCommand = "docker-compose up -d";
        const cmd = spawn("cmd", ["/c", `cd ${path} && ${dockerCommand}`]);

        cmd.stdout.on("data", (data) => {
          console.log(`stdout: ${data}`);
        });

        cmd.stderr.on("data", (data) => {
          console.error(`stderr: ${data}`);
        });

        cmd.on("close", (code) => {
          console.log(`child process exited with code ${code}`);
        });

        return true;
      };
      const runSqlCommand = () => {
        return new Promise((resolve, reject) => {
          try {
            console.log(`running sql command`);
            const dockerCommand =
              "cat sqldb.sql | docker exec -i gdm-b2b-figaro2-local-gd-db-1 mysql -u root -pexamplepass local-gd-db";
            const cmd = spawn("cmd", ["/c", `cd ${path} && ${dockerCommand}`]);

            cmd.stdout.on("data", (data) => {
              console.log(`stdout: ${data}`);
            });

            cmd.stderr.on("data", (data) => {
              console.error(`stderr: ${data}`);
            });

            cmd.on("close", (code) => {
              console.log(
                `child process exited with code ${code} sql command finished`
              );
            });

            resolve(true);
          } catch (err) {}
        });
      };

      runDocker();

      if (runDocker) {
        runSqlCommand();
      }

      resolve(true);
    } catch {}
  });
};

//   1. we get the download link

const getDBLink = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      const dbLink = await launchPuppet();

      resolve(dbLink);
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

// 2. we get the active projects list
// 3. we get project path

const getActiveProject = async () => {
  const allProjects = await getStoredProjects();
  return new Promise((resolve, reject) => {
    try {
      if (allProjects.length) {
        const activeProject = allProjects.filter(
          (project) => project.projectState !== false
        );

        [{ projectPath }] = activeProject;

        resolve(projectPath);
      }
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

// 4. start downloading.
const downloadAndInstallDb = async () => {
  const downloader = (link) => {
    return new Promise((resolve, reject) => {
      const fileUrl = link;
      const downloadDir = path.resolve("./");
      const filename = "sqldb.gz";

      const file = fs.createWriteStream(path.join(downloadDir, filename));

      https
        .get(fileUrl, (response) => {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            console.log(
              "File downloaded to:",
              path.join(downloadDir, filename)
            );
            resolve(path.join(downloadDir, filename));
          });
        })
        .on("error", (err) => {
          fs.unlinkSync(file);
          reject(console.error(`Error downloading file: ${err.message}`));
        });
    });
  };

  const exportDbToProject = (zippedFilePath, unzippedFilePath) => {
    return new Promise((resolve, reject) => {
      try {
        const inputPath = zippedFilePath;
        const outputPath = unzippedFilePath;

        const inputStream = fs.createReadStream(inputPath);

        const outputStream = fs.createWriteStream(outputPath);

        // Create a gzip decompression stream
        const gzipStream = zlib.createGunzip();

        // Pipe the input stream through the decompression stream and then to the output stream
        inputStream.pipe(gzipStream).pipe(outputStream);

        // Listen for the 'finish'
        outputStream.on("finish", () => {
          console.log("File decompressed and saved to", outputPath);
          resolve(true);
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  return new Promise(async (resolve, reject) => {
    try {
      const dbDownloadLink = await getDBLink();
      const activeProjectPath = await getActiveProject();

      console.log(`from puppet ${dbDownloadLink}`);
      const downloadResponse = await downloader(dbDownloadLink);
      // 5. decompress the file
      const exportResponse = await exportDbToProject(
        downloadResponse,
        path.join(activeProjectPath, "sqldb.sql")
      );
      if (exportResponse) {
        // 6. run docker
        // 7. run sql command
        await runCommandPrompt(activeProjectPath);
        if (runCommandPrompt) {
          dateUpdater("after-download", activeProjectPath);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });
};

//downloadAndInstallDb();

// date checker to launch download and install based on date to avoid multiple installs on restart
const dateUpdater = async (updateType, updatedPath, storageData) => {
  const afterDownload = async () => {
    const storedProjectsList = await getStoredProjects();
    console.log(storedProjectsList);
    const activeProject = storedProjectsList.filter(
      (project) => project.projectState !== false
    );
    return new Promise((resolve, reject) => {
      const todaysDateAndTime = new Date().toISOString().substring(0, 10);
      console.log(todaysDateAndTime, "date");

      activeProject.forEach((project) => {
        const lastUpdateDate = project.updateDate;
        console.log(lastUpdateDate);

        if (lastUpdateDate === todaysDateAndTime) {
          resolve(console.log(activeProject, " this project is updated today"));
        } else {
          const todaysDateAndTime = new Date().toISOString().substring(0, 10);
          const updatedProjectData = storedProjectsList.map((project) => {
            const projectPath = project.projectPath;

            if (projectPath === updatedPath) {
              console.log(project);
              project.updateDate = todaysDateAndTime;
            }
            return project;
          });
          console.log(updatedProjectData);
          resolve(
            storeProjectData(updatedProjectData),
            " update completed update the last update date in json db"
          );
        }
      });
    });
  };

  const beforeDownload = async (data) => {
    const storedProjectsList = data;

    const activeProject = storedProjectsList.filter(
      (project) => project.projectState !== false
    );
    return new Promise((resolve, reject) => {
      const todaysDateAndTime = new Date().toISOString().substring(0, 10);

      activeProject.forEach((project) => {
        const lastUpdateDate = project.updateDate;
        console.log(project);

        if (lastUpdateDate === todaysDateAndTime) {
          resolve(
            " this project is updated today do not need to download and install"
          );
        } else {
          resolve(
            downloadAndInstallDb(),
            " this project is not updated today download and install in progress"
          );
        }
      });
    });
  };

  if (updateType === "after-download") {
    const update = await afterDownload();
    return new Promise((resolve) => resolve(update));
  }
  if (updateType === "before-download") {
    const update = await beforeDownload(storageData);
    return new Promise((resolve, reject) => {
      resolve(update);
    });
  }
};

const launchPuppet = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      const logPrinter = (log) => {
        console.log(log);
      };

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      page.setDefaultTimeout(0);
      await page.exposeFunction("logPrinter", logPrinter);

      // Navigate to webpage
      await page.goto(process.env.PANTHEON_DASHBOARDLINK);
      console.log(`dashboard login`);
      await page.waitForSelector(".c-login-button");
      await page.click(".c-login-button");
      console.log(`login with email button clicked`);
      await page.waitForNetworkIdle();
      await page.waitForSelector(".auth0-lock-input");
      await page.waitForNetworkIdle();
      console.log(`authentication begins.....`);

      await page.type('input[name="email"]', process.env.PANTHEON_USERNAME, {
        delay: 900,
      });

      await page.type(
        'input[name="password"]',
        process.env.PANTHEON_USERPASSWORD,
        {
          delay: 900,
        }
      );

      await page.waitForSelector('button[name="submit"]');
      await page.click('button[name="submit"]');
      console.log(`credentials submitted`);
      await page.waitForSelector('a[href*="/sites"]');
      await page.click('a[href*="/sites"]');
      console.log(`pantheon believes that I am a human`);
      await page.waitForNetworkIdle();
      await page.waitForSelector('input[placeholder*="Search by Site Name"]');
      console.log(`waiting for links to load`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log(`waited for 5 seconds for links to load`);
      console.log("Page loaded completely");
      await page.waitForSelector("span.site-list-status-container");
      console.log(`before clicking the repo link`);
      const links = await page.waitForSelector("text/B2B GDM Figaro1");
      links.click();
      console.log(`after clicking repo link`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log(`wait before clicking multidev`);
      await page.waitForSelector('a[href*="#multidev"]');
      await page.click('a[href*="#multidev"]');

      console.log(`multidev instance clicked`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log(`waited for 3 seconds`);
      // await page.waitForSelector(".branches-overview-wrapper");
      console.log(`multidev Loaded`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log(`waited for 5 seconds`);
      await page.waitForSelector("text/autodbhost");
      await page.click("text/autodbhost");
      console.log(`host branch clicked`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log(`waited for 5 seconds`);
      await page.evaluate(() => {
        const backupLogButton = document.querySelector(
          'a[data-name="backups"]'
        );
        backupLogButton.click();
        logPrinter(`backup Button from menu clicked Clicked`);
      });
      await page.waitForSelector("text/Backup Log");

      console.log(`backup log clicked`);
      await page.evaluate(() => {
        let downloadLink = document.querySelector(
          ".backups table.table tbody tr:first-child .download-td.database-download .archive-download .btn.btn-default.btn-xs.js-download"
        );

        async function checkBackupLink() {
          while (!downloadLink) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            logPrinter(`check again for backup`);
            downloadLink = document.querySelector(
              ".backups table.table tbody tr:first-child .download-td.database-download .archive-download .btn.btn-default.btn-xs.js-download"
            );
          }
          return;
        }
        checkBackupLink();
        logPrinter(`Check Completed`);
      });

      await page.waitForSelector(
        ".backups table.table tbody tr:first-child .download-td.database-download .archive-download .btn.btn-default.btn-xs.js-download"
      );
      await page.click(
        ".backups table.table tbody tr:first-child .download-td.database-download .archive-download .btn.btn-default.btn-xs.js-download"
      );
      await page.waitForSelector(
        ".popover.bound.bottom.in .popover-inner .popover-content input"
      );

      const downloadStorageLink = await page.evaluate(() => {
        const linkInput = document.querySelector(
          ".popover.bound.bottom.in .popover-inner .popover-content input"
        );

        // logPrinter(linkInput.value);

        return linkInput.value;
      });
      console.log(downloadStorageLink);

      resolve(downloadStorageLink);
      await browser.close();
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};
