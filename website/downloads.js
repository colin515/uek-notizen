const repository = "colin515/uek-notizen";

fetch(`https://api.github.com/repos/${repository}/releases/latest`)
  .then(response => {
    if (!response.ok) throw new Error("Noch kein Release");
    return response.json();
  })
  .then(release => {
    const assets = release.assets || [];
    const windows = assets.find(asset => /windows|x64.*\.zip|\.msi$|setup.*\.exe$/i.test(asset.name));
    const macDmg = assets.find(asset => /\.dmg$/i.test(asset.name));
    const macZip = assets.find(asset => /macos.*\.zip|universal.*\.zip/i.test(asset.name));
    activate("windows-download", windows);
    activate("mac-download", macDmg || macZip);
    activate("mac-zip-download", macZip && macDmg ? macZip : null);
    document.getElementById("release-status").textContent = `Aktuelle Version: ${release.tag_name}`;
  })
  .catch(() => {
    document.getElementById("release-status").textContent = "Die ersten Downloads werden gerade gebaut.";
  });

function activate(id, asset) {
  if (!asset) return;
  const link = document.getElementById(id);
  link.href = asset.browser_download_url;
  link.classList.remove("disabled");
}

