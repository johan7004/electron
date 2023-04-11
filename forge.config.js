module.exports = {
  packagerConfig: {},
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        config: {
          authors: "Johan",

          name: "GD-DB-Grabber",
          setupExe: "GD-DB-1.1.exe",
          setupMsi: "GD-DB-1.1.msi"

        },
      },
    },
    {
      name: "@electron-forge/maker-zip",
    },
    // {
    //   name: "@electron-forge/maker-deb",
    //   config: {},
    // },
    // {
    //   name: "@electron-forge/maker-rpm",
    //   config: {},
    // },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/index.html",
              js: "./src/renderer.js",
              name: "main_window",
              preload: {
                js: "./src/preload.js",
              },
            },
          ],
        },
      },
    },
  ],
};
