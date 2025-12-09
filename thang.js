setInterval(() => {
    if (navigator.onLine) {
        console.log("Đang có mạng");
    } else {
        console.log("Mất mạng rồi");
    }
}, 3000);

(function () {
  // ====== Config ======
  const WEBSITE_URL = "https://project1-chi-smoky.vercel.app/";
  const IMGBB_KEY = "77dadf4a753b97cc9c0300582110c848"; // nên thay bằng key riêng của bạn
  const IMAGE_MAX_DIM = 1000;
  const IMAGE_QUALITY = 0.80;

  // ====== Helpers ======
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
  const safeGet = (id) => document.getElementById(id) || null;

  function createQRCode(container, text, size = 220) {
    if (!container) return;
    container.innerHTML = "";
    new QRCode(container, {
      text: text,
      width: size,
      height: size,
      correctLevel: QRCode.CorrectLevel.H,
      colorDark: "#000000",
      colorLight: "#ffffff"
    });
  }

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > IMAGE_MAX_DIM || h > IMAGE_MAX_DIM) {
          const ratio = Math.min(IMAGE_MAX_DIM / w, IMAGE_MAX_DIM / h);
          w *= ratio; h *= ratio;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject("Compress failed"), "image/jpeg", IMAGE_QUALITY);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function uploadToImgbb(blobOrFile) {
    const form = new FormData();
    form.append("image", blobOrFile);
    const url = `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`;
    const resp = await fetch(url, { method: "POST", body: form });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (!json.success) throw new Error(json.error?.message || "Upload failed");

    let imageUrl = json.data.url;
    if (imageUrl.startsWith("http://")) {
      imageUrl = imageUrl.replace("http://", "https://");
    }
    return imageUrl;
  }

  function setDownloadHrefFromCanvas(el, container) {
    if (!el || !container) return;
    const canvas = container.querySelector("canvas");
    if (canvas) el.href = canvas.toDataURL("image/png");
  }

  // ====== DOM Elements ======
  const websiteQrContainer = $('#qrWeb #qrcode');
  const downloadQRBtn = $('#qrWeb #downloadQR');
  const imageInput = safeGet('imageInput');
  const previewBox = $('.preview-box');
  const previewImage = safeGet('previewImage');
  const qrcodeImageBox = safeGet('qrcodeImage');
  const downloadQRImageBtn = safeGet('downloadQRImage');
  const qrLoadTimeEl = safeGet('qrLoadTime');
  const qrTabButtons = $$('.qr-tab');
  const qrTabContents = $$('.qr-tab-content');
  const menuMobile = safeGet('menuMobile');

  // ====== Init QR Website ======
  if (websiteQrContainer) {
    createQRCode(websiteQrContainer, WEBSITE_URL);
    setTimeout(() => setDownloadHrefFromCanvas(downloadQRBtn, websiteQrContainer), 600);
  }

  // ====== Tab switching ======
  function switchTab(tab) {
    qrTabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    qrTabContents.forEach(c => c.classList.toggle('active', c.id === (tab === 'web' ? 'qrWeb' : 'qrImage')));
  }
  qrTabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // ====== Mobile menu ======
  window.toggleMenu = () => menuMobile?.classList.toggle('active');

  // ====== Upload ảnh → QR (có đếm ngược 3s đẹp như cũ) ======
  if (imageInput) {
    imageInput.addEventListener('change', async function () {
      const file = this.files[0];
      if (!file) return;

      // Preview
      if (previewImage && previewBox) {
        previewImage.src = URL.createObjectURL(file);
        previewBox.style.display = 'block';
      }

      // Bắt đầu đếm ngược + loading
      let seconds = 3;
      if (qrLoadTimeEl) {
        qrLoadTimeEl.style.color = '#ff9800';
        qrLoadTimeEl.textContent = `Đang tạo QR... ${seconds}s`;
      }

      const countdownInterval = setInterval(() => {
        seconds--;
        if (seconds > 0) {
          qrLoadTimeEl.textContent = `Đang tạo QR... ${seconds}s`;
        } else {
          qrLoadTimeEl.textContent = `Đang xử lý ảnh...`;
          clearInterval(countdownInterval);
        }
      }, 1000);

      const startTime = performance.now();

      let imageURL = "";
      try {
        const compressed = await compressImageFile(file);
        imageURL = await uploadToImgbb(compressed);
      } catch (err) {
        clearInterval(countdownInterval);
        if (qrLoadTimeEl) {
          qrLoadTimeEl.style.color = 'red';
          qrLoadTimeEl.textContent = 'Upload thất bại! Thử lại hoặc dùng ảnh nhỏ hơn';
        }
        console.error("Upload error:", err);
        return;
      }

      // Tạo QR
      if (qrcodeImageBox) {
        qrcodeImageBox.innerHTML = "";
        createQRCode(qrcodeImageBox, imageURL);
      }

      // Download link
      setTimeout(() => setDownloadHrefFromCanvas(downloadQRImageBtn, qrcodeImageBox), 400);

      // Hoàn tất
      const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
      if (qrLoadTimeEl) {
        qrLoadTimeEl.style.color = '#2ecc71';
        qrLoadTimeEl.textContent = `Hoàn tất trong ${totalTime}s`;
      }

      // Chuyển sang tab QR Ảnh
      switchTab('image');
    });
  }
})();