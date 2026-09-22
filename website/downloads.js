const repository = "colin515/uek-notizen";

fetch(`https://api.github.com/repos/${repository}/releases/latest`)
  .then(response => {
    if (!response.ok) throw new Error("Kein Release gefunden");
    return response.json();
  })
  .then(release => {
    const assets = release.assets || [];
    const windows = assets.find(asset => asset.name === "UEK-Notizen-Windows-x64.zip");
    const macDmg = assets.find(asset => asset.name === "UEK-Notizen-macOS.dmg");

    const winBtn = document.getElementById("windows-download");
    if (winBtn) {
      winBtn.href = windows?.browser_download_url ||
        `https://github.com/${repository}/releases/latest/download/UEK-Notizen-Windows-x64.zip`;
    }

    const macBtn = document.getElementById("mac-download");
    if (macBtn) {
      macBtn.href = macDmg?.browser_download_url ||
        `https://github.com/${repository}/releases/latest/download/UEK-Notizen-macOS.dmg`;
      macBtn.target = "_blank";
      macBtn.rel = "noopener";
    }

    const statusElem = document.getElementById("release-status");
    if (statusElem) statusElem.textContent = `Aktuelle Version: ${release.tag_name}`;
  })
  .catch(() => {
    // Die direkten latest-download Links bleiben als Fallback aktiv.
  });
