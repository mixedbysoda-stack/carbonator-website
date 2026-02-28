// Shared configuration — update version and URLs in one place
const VERSION = "2.2.0";

const DOWNLOAD_URLS = {
  mac: `https://github.com/mixedbysoda-stack/carbonator/releases/download/v${VERSION}/Carbonator-v${VERSION}-Installer.pkg`,
  windows: `https://github.com/mixedbysoda-stack/carbonator/releases/download/v${VERSION}/Carbonator-Windows-Installer.zip`,
};

module.exports = { VERSION, DOWNLOAD_URLS };
