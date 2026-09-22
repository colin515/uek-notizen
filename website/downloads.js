const repository = "colin515/uek-notizen";

fetch(`https://api.github.com/repos/${repository}/releases/latest`)
  .then(response => {
    if (!response.ok) throw new Error("Kein Release gefunden");
    return response.json();
  })
  .then(release => {
    const assets = release.assets || [];
    const windows = assets.find(asset => /windows|x64.*\.zip|\.msi$|setup.*\.exe$/i.test(asset.name));
    const macDmg = assets.find(asset => /\.dmg$/i.test(asset.name));
    
    if (windows) {
      const winBtn = document.getElementById("windows-download");
      if (winBtn) winBtn.href = windows.browser_download_url;
    }
    const statusElem = document.getElementById("release-status");
    if (statusElem) statusElem.textContent = `Aktuelle Version: ${release.tag_name}`;
  })
  .catch(() => {
    // Fallback links bereits im HTML hinterlegt
  });

