const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");

const fs = require("fs");

const { spawn } = require("child_process");
const puppeteer = require("puppeteer");
const zlib = require("zlib");
const os = require("os");

// Get the default download directory
const downloadsFolder = `${os.homedir()}\\Downloads`;

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

async function getFilePath() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (canceled) {
    return;
  } else {
    return filePaths[0];
  }
}

const automationLogger = async (logData) => {
  const myWindow = BrowserWindow.getAllWindows()[0];
  myWindow.webContents.send("sendDataToReact", logData);
};
// gets json data and send to renderer
const getStoredProjects = async () => {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync("data.json");
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
    fs.writeFileSync("data.json", jsonData);
    return true;
  } catch (err) {
    console.log(err);
    automationLogger(`Error storing data in json`);
  }
};

const runCommandPrompt = (path) => {
  return new Promise((resolve, reject) => {
    try {
      const runDocker = () => {
        return new Promise((resolve, reject) => {
          const dockerCommand = "docker-compose up -d";
          const cmd = spawn("cmd", ["/c", `cd ${path} && ${dockerCommand}`]);
          automationLogger(`Docker Compose Inititated ${dockerCommand}`);
          cmd.stdout.on("data", (data) => {
            console.log(`stdout: ${data}`);
            automationLogger(`Docker-Compose in Progress`);
          });

          cmd.stderr.on("data", (data) => {
            console.error(`stdout: ${data}`);
            automationLogger(`stdout: ${data}`);
          });

          cmd.on("close", (code) => {
            console.log(`child process exited with code ${code}`);
            automationLogger(`Docker child process exited with code ${code}`);

            resolve(true, runSqlCommand());
          });
          const runSqlCommand = () => {
            return new Promise((resolve, reject) => {
              try {
                console.log(`running sql command`);
                const dockerCommand =
                  "cat sqldb.sql | docker exec -i figaro-local-local-gd-db-1 mysql -u root -pexamplepass local-gd-db";
                const cmd = spawn("cmd", [
                  "/c",
                  `cd ${path} && ${dockerCommand}`,
                ]);

                automationLogger(
                  `Docker SQL command running -> ${dockerCommand} wait till it finishes`
                );
                cmd.stdout.on("data", (data) => {
                  console.log(`stdout: ${data}`);
                  automationLogger(`Running SQL: ${data}`);
                });

                cmd.stderr.on("data", (data) => {
                  console.error(`stdout: ${data}`);
                  automationLogger(`stdout: ${data}`);
                });

                cmd.on("close", (code) => {
                  console.log(
                    `child process exited with code ${code} sql command finished`
                  );
                  automationLogger(
                    `child process exited with code ${code} sql command finished you can start using your localhost now`
                  );
                });

                resolve(true);
              } catch (err) {
                console.log(err);
                reject(console.log(err));
                automationLogger(`Error: ${err}`);
              }
            });
          };
        });
      };

      runDocker();
      resolve(true, dateUpdater("after-download", activeProjectPath));
    } catch (err) {
      reject(automationLogger(err));
      automationLogger(`Error in running command prompt`);
    }
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
      automationLogger(`Error in getting db link`);
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
      automationLogger(
        `puppet operations finished, Node Operations in progress`
      );

      fs.readdir(downloadsFolder, (err, files) => {
        if (err) {
          reject(automationLogger(err), console.log(err));
        }
        if (files) {
          files.forEach((downloadfile) => {
            if (downloadfile.includes(".gz")) {
              automationLogger(`Download File Found Install Process Begins`);
              const dbFile = downloadfile;
              fs.stat(path.join(downloadsFolder, dbFile), (err, stats) => {
                if (err) console.log(err);
                const todaysDate = new Date().toDateString();

                if (todaysDate.includes(`${stats.mtime.toDateString()}`)) {
                  console.log(path.join(downloadsFolder, dbFile));
                  resolve(path.join(downloadsFolder, dbFile));
                }
              });
            }
          });
        }
      });
    });
  };

  const exportDbToProject = (zippedFilePath, unzippedFilePath) => {
    return new Promise((resolve, reject) => {
      try {
        automationLogger(`Decompressing and exporting DB to project`);
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
          automationLogger(`File decompressed and saved in Project Directory`);
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

      console.log(`from puppet ${true}`);
      const downloadResponse = await downloader(true);
      // 5. decompress the file
     if(downloadResponse){
      exportDbToProject(
        downloadResponse,
        path.join(activeProjectPath, "sqldb.sql")
      ).then((res) => {
        if (res) {
          // 6. run docker
          // 7. run sql command
          runCommandPrompt(activeProjectPath);
        }
      });
     }
      
    } catch (err) {
      reject(err)
      automationLogger(`download and install error`)
      console.error(err);
    }
  });
};

//downloadAndInstallDb();

//date checker to launch download and install based on date to avoid multiple installs on restart
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
          resolve(
            console.log(
              activeProject,
              " this project is updated today",
              automationLogger(`Project Update Completed and is Updated Today`)
            )
          );
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

  const beforeDownload = async (data, manualUpdate) => {
    const storedProjectsList = data;

    const activeProject = storedProjectsList.filter(
      (project) => project.projectState !== false
    );
    return new Promise((resolve, reject) => {
      const todaysDateAndTime = new Date().toISOString().substring(0, 10);

      activeProject.forEach((project) => {
        const lastUpdateDate = project.updateDate;
        console.log(project);

        if (lastUpdateDate === todaysDateAndTime && !manualUpdate) {
          resolve(
            automationLogger(
              ` This project is updated today do not need to download and install manual update => ${manualUpdate}`
            ),
            " This project is updated today do not need to download and install"
          );
        } else {
          resolve(
            downloadAndInstallDb(),
            automationLogger(
              `This project is not updated today download and install in progress and manual update => ${manualUpdate}`
            ),
            " This project is not updated today download and install in progress"
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
    console.log(`dateUpdater invoked`);
    const update = await beforeDownload(storageData, false);
    return new Promise((resolve, reject) => {
      resolve(update);
    });
  }
  if (updateType === "manual-download") {
    const update = await beforeDownload(storageData, true);
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
        //automationLogger(log)
      };

      // const browser = await puppeteer.launch();

      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--window-size = 2160,3840"],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 2560, height: 1293 });
      page.setDefaultTimeout(0);
      page.setDefaultNavigationTimeout(0);
      await page.exposeFunction("logPrinter", logPrinter);
      await page.exposeFunction("automationLogger", automationLogger);

      // Navigate to webpage
      await page.goto(process.env.PANTHEON_DASHBOARDLINK);
      console.log(`dashboard login`);
      automationLogger(`dashboard Login`);
      await page.waitForSelector(".c-login-button");
      await page.click(".c-login-button");
      console.log(`login with email button clicked`);
      automationLogger(`login with email button clicked`);
      await page.waitForNetworkIdle();
      await page.waitForSelector(".auth0-lock-input");
      await page.waitForNetworkIdle();
      automationLogger(`authentication begins.....`);

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
      automationLogger(`credentials submitted`);
      await page.waitForNetworkIdle();
      await page.waitForSelector('a[href*="/sites"]');
      await page.click('a[href*="/sites"]');
      automationLogger(`pantheon believes that I am a human`);
      await page.waitForNetworkIdle();
      await page.waitForSelector('input[placeholder*="Search by Site Name"]');
      automationLogger(`waiting for links to load`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await page.waitForNetworkIdle();
      automationLogger(`waited for 5 seconds for links to load`);
      console.log("Page loaded completely");
      await page.waitForSelector("span.site-list-status-container");
      automationLogger(`before clicking the repo link`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await page.waitForSelector("td[role*=cell] a");
      await page.click("td[role*=cell] a");
      automationLogger(`after clicking repo link`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      automationLogger(`wait before clicking multidev`);
      await page.waitForSelector('a[href*="#multidev"]');
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await page.click('a[href*="#multidev"]');

      automationLogger(`multidev instance clicked`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log(`waited for 5 seconds`);
      // await page.waitForSelector(".branches-overview-wrapper");
      automationLogger(`multidev Loaded`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log(`waited for 5 seconds`);
      // await page.waitForSelector("text/autodbhost",{timeout:600000});
      // await page.click("text/autodbhost");
      await page.evaluate(() => {
        const hostBranch = document.querySelectorAll(`.name a`);

        hostBranch.forEach((elem) => {
          if (elem.innerText === "autodbhost") {
            elem.click();
          }
        });
      });
      automationLogger(`host branch clicked`);
      automationLogger(`wait for 5 seconds`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // await page.evaluate(() => {
      //   const backupLogButton = document.querySelector(
      //     'a[data-name="backups"]'
      //   );
      //   backupLogButton.click();
      //   logPrinter(`backup Button from menu clicked Clicked`);
      // });
      await page.waitForSelector(' a[data-name="backups"]');
      await page.click(' a[data-name="backups"]');
      // await page.waitForSelector("text/Backup Log");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      automationLogger(`backup log clicked`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      // await page.evaluate(() => {
      //   const fakeClick = document.querySelector("body");

      //   fakeClick.click();
      //   logPrinter(`fake click done`);
      // });
      // automationLogger(`pop ups cleared`);
      // await page.evaluate(() => {
      //   let downloadLink = document.querySelector(
      //     ".backups table.table tbody tr:first-child .download-td.database-download .archive-download .btn.btn-default.btn-xs.js-download"
      //   );

      //   async function checkBackupLink() {
      //     while (!downloadLink) {
      //       await new Promise((resolve) => setTimeout(resolve, 10000));
      //       logPrinter(`check again for backup`);
      //       downloadLink = document.querySelector(
      //         ".backups table.table tbody tr:first-child .download-td.database-download .archive-download .btn.btn-default.btn-xs.js-download"
      //       );
      //     }
      //     return;
      //   }
      //   checkBackupLink();
      //   logPrinter(`Check Completed`);
      // });
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await page.waitForSelector(
        ".backups .download-td.database-download .archive-download .btn.btn-default.btn-xs.js-download",
        { timeout: 600000 }
      );
      await page.click(
        ".backups .download-td.database-download .archive-download .btn.btn-default.btn-xs.js-download"
      );
      await page.waitForSelector(
        ".popover.bound.bottom.in .popover-inner .popover-content input"
      );

      const downloadStorageLink = await page.evaluate(() => {
        const linkInput = document.querySelector(
          ".popover.bound.bottom.in .popover-inner .popover-content .btn.btn-default.btn-sm.pull-right"
        );

        automationLogger(`Found Download Button`);
        linkInput.click();
        automationLogger(`Download Button Clicked, Download Initiated`);

        return true;
      });
      // Wait for the download to finish
      await new Promise((resolve) => setTimeout(resolve, 420000));
      automationLogger(`Downloads checked and verified`);
      resolve(downloadStorageLink);
      await new Promise((resolve) => setTimeout(resolve, 10000));
      //await browser.close();
    } catch (err) {
      console.error(err);
      automationLogger(err.message);
      reject(err);
    }
  });
};
