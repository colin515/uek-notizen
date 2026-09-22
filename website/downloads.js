const repository = "colin515/uek-notizen";
const releaseTag = "v1.1.11";

fetch(`https://api.github.com/repos/${repository}/releases/tags/${releaseTag}`)
  .then(response => {
    if (!response.ok) throw new Error("Release nicht gefunden");
    return response.json();
  })
  .then(release => {
    const assets = release.assets || [];
    const windows = assets.find(asset => asset.name === "UEK-Notizen-Windows-x64.zip");
    const macDmg = assets.find(asset => asset.name === "UEK-Notizen-macOS.dmg");

    if (windows) {
      const winBtn = document.getElementById("windows-download");
      if (winBtn) winBtn.href = windows.browser_download_url;
    }

    if (macDmg) {
      const macBtn = document.getElementById("mac-download");
      if (macBtn) {
        macBtn.href = macDmg.browser_download_url;
        macBtn.target = "_blank";
        macBtn.rel = "noopener";
      }
    }

    const statusElem = document.getElementById("release-status");
    if (statusElem) statusElem.textContent = `Aktuelle Version: ${release.tag_name}`;
  })
  .catch(() => {
    // Direkter Windows-Fallback bleibt im HTML aktiv.
  });
