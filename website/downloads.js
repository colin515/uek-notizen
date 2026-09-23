const repository = "colin515/uek-notizen";
const preferredRelease = "v1.5.1";
const safeFallbackRelease = "v1.5.0";

function applyRelease(release) {
  const assets = release.assets || [];
  const windows = assets.find(asset => asset.name === "UEK-Notizen-Windows-x64.zip");

  const winBtn = document.getElementById("windows-download");
  if (winBtn) {
    winBtn.href = windows?.browser_download_url ||
      `https://github.com/${repository}/releases/download/${safeFallbackRelease}/UEK-Notizen-Windows-x64.zip`;
  }

  // macOS always opens the dedicated installation guide first.
  // The guide page itself contains the direct DMG download.
  const macBtn = document.getElementById("mac-download");
  if (macBtn) {
    macBtn.href = "macos.html";
    macBtn.removeAttribute("target");
    macBtn.removeAttribute("rel");
  }

  const statusElem = document.getElementById("release-status");
  if (statusElem) statusElem.textContent = `Aktuelle Version: ${release.tag_name}`;
}

async function loadRelease() {
  try {
    const preferredResponse = await fetch(
      `https://api.github.com/repos/${repository}/releases/tags/${preferredRelease}`
    );

    if (preferredResponse.ok) {
      const preferred = await preferredResponse.json();
      const names = new Set((preferred.assets || []).map(asset => asset.name));
      if (names.has("UEK-Notizen-Windows-x64.zip") && names.has("UEK-Notizen-macOS.dmg")) {
        applyRelease(preferred);
        return;
      }
    }

    const fallbackResponse = await fetch(
      `https://api.github.com/repos/${repository}/releases/tags/${safeFallbackRelease}`
    );
    if (!fallbackResponse.ok) throw new Error("Kein funktionierender Release gefunden");
    applyRelease(await fallbackResponse.json());
  } catch {
    // Even when GitHub's API is unavailable, the Mac button must stay on the guide page.
    const macBtn = document.getElementById("mac-download");
    if (macBtn) {
      macBtn.href = "macos.html";
      macBtn.removeAttribute("target");
      macBtn.removeAttribute("rel");
    }

    const statusElem = document.getElementById("release-status");
    if (statusElem) statusElem.textContent = `Aktuelle Version: ${safeFallbackRelease} (Fallback)`;
  }
}

loadRelease();
