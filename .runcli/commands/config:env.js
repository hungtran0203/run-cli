const klawSync = require("klaw-sync");
const _ = require("lodash");
const path = require("path");

const isEnvConfigFile = (file, { env, configFolder }) => {
  const dirname = path.dirname(file.path);
  const fileInfo = path.parse(file.path);
  let configName;
  const prefixEnv = `${env}.`;
  if (_.startsWith(fileInfo.base, prefixEnv)) {
    configName = _.trimStart(
      fileInfo.name.substring(prefixEnv.length - 1),
      "."
    );
    configName = `${configName}${fileInfo.ext}`;
    file.configName = configName;
    file.configFile = path.relative(
      configFolder,
      path.join(dirname, configName)
    );
    return true;
  }
  return false;
};

const getPossibleConfigFolders = (cwd) => {
  const levels = cwd.split(path.sep);
  const dirList = _.reduceRight(
    levels,
    (acc, val, index) => {
      if (index > 1) {
        const dir = levels.slice(index);
        acc.push(dir.join(path.sep));
      }
      return acc;
    },
    []
  );
  const folders = _.flatMap(
    ["config", "env"].map((val) => {
      return dirList.map((basename) => _.join([val, basename], path.sep));
    })
  );
  return folders;
};

module.exports = {
  name: "config:env",
  run: async function (toolbox) {
    const cwd = process.cwd();
    toolbox.print.info(`${toolbox.print.checkmark} cwd: ${cwd}`);
    const folders = getPossibleConfigFolders(cwd);

    const configFolders = toolbox.runtime.utils.searchParentPaths(cwd, folders);
    const configFolder = _.first(configFolders);
    const env = toolbox.parameters.first || "dev";
    if (env && configFolder) {
      let files = klawSync(configFolder, { nodir: true, depthLimit: 10 });
      files = _.map(files, (file) => {
        if (isEnvConfigFile(file, { env, configFolder })) {
          const { configFile, configName } = file;
          const srcFile = file.path;
          const dstFile = path.join(cwd, configFile);
          toolbox.print.info(
            `${toolbox.print.checkmark} Applying config/env ${configFile}`
          );
          toolbox.filesystem.copy(srcFile, dstFile, { overwrite: true });
        }
      });
    }
  },
};
