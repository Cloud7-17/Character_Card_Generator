const CARD_WIDTH = 1500;
const CARD_HEIGHT = 2100;
const MAX_ANSWER_WIDTH = 1040;

const palettes = {
  "53": {
    primary: "#1f7a66",
    primaryDark: "#145447",
    accent: "#c49a45",
    accentSoft: "rgba(196, 154, 69, 0.42)",
    warm: "#c86f63",
    warmSoft: "rgba(200, 111, 99, 0.2)",
    paperA: "#fffdf5",
    paperB: "#f2f8f2",
    paperC: "#fff1ec",
    pattern: "rgba(31, 122, 102, 0.16)",
    titleStroke: "#fff8e8"
  },
  "54": {
    primary: "#345da8",
    primaryDark: "#223c70",
    accent: "#b77ac2",
    accentSoft: "rgba(183, 122, 194, 0.38)",
    warm: "#e08a55",
    warmSoft: "rgba(224, 138, 85, 0.2)",
    paperA: "#fbfdff",
    paperB: "#eef4ff",
    paperC: "#fff2f7",
    pattern: "rgba(52, 93, 168, 0.16)",
    titleStroke: "#fff2fa"
  }
};

const questions = [
  "你最喜欢的大学课程是什么？",
  "你最推荐的食堂的一道菜是什么？",
  "你最喜欢的歌手是谁？",
  "你最近循环播放的一首歌是什么？",
  "你最想推荐给同学的一本书是什么？",
  "你在校园里最喜欢的地方是哪里？",
  "你最难忘的一次社团或班级活动是什么？",
  "如果拥有一天完全自由的时间，你会怎么安排？",
  "你最擅长的一项技能是什么？",
  "你最喜欢的运动或放松方式是什么？",
  "你觉得自己最像哪种天气？",
  "你最近学到的一个小知识是什么？",
  "你最想去旅行的城市是哪里？",
  "你给新朋友的一句自我介绍是什么？",
  "你最期待大学里完成的一件事是什么？"
];

const elements = {
  form: document.querySelector("#cardForm"),
  photoInput: document.querySelector("#photoInput"),
  photoPreview: document.querySelector("#photoPreview"),
  photoPlaceholder: document.querySelector("#photoPlaceholder"),
  cropCanvas: document.querySelector("#cropCanvas"),
  cropControls: document.querySelector("#cropControls"),
  cropZoom: document.querySelector("#cropZoom"),
  cropReset: document.querySelector("#cropReset"),
  nameInput: document.querySelector("#nameInput"),
  classInput: document.querySelector("#classInput"),
  drawQuestions: document.querySelector("#drawQuestions"),
  questionList: document.querySelector("#questionList"),
  message: document.querySelector("#message"),
  resetBtn: document.querySelector("#resetBtn"),
  frontCanvas: document.querySelector("#frontCanvas"),
  backCanvas: document.querySelector("#backCanvas"),
  downloadFront: document.querySelector("#downloadFront"),
  downloadBack: document.querySelector("#downloadBack")
};

const state = {
  photoImage: null,
  photoDataUrl: "",
  crop: {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0
  },
  frontDownloadUrl: "",
  backDownloadUrl: "",
  currentQuestions: []
};

const assetSources = {
  academy: window.CARD_ASSETS?.academy ?? "笃实书院.jpg",
  "53": window.CARD_ASSETS?.["53"] ?? "53.jpg",
  "54": window.CARD_ASSETS?.["54"] ?? "54.jpg"
};

const assets = {};

window.addEventListener("DOMContentLoaded", async () => {
  await loadAssets();
  drawEmptyCards();
  drawQuestionSet();
});

elements.photoInput.addEventListener("change", handlePhotoUpload);
elements.cropZoom.addEventListener("input", handleCropZoom);
elements.cropReset.addEventListener("click", resetCrop);
elements.cropCanvas.addEventListener("pointerdown", startCropDrag);
elements.cropCanvas.addEventListener("pointermove", moveCropDrag);
elements.cropCanvas.addEventListener("pointerup", endCropDrag);
elements.cropCanvas.addEventListener("pointercancel", endCropDrag);
elements.classInput.addEventListener("change", invalidateDownloads);
elements.drawQuestions.addEventListener("click", drawQuestionSet);
elements.form.addEventListener("submit", handleGenerate);
elements.resetBtn.addEventListener("click", resetForm);

async function loadAssets() {
  const entries = Object.entries(assetSources);
  await Promise.all(
    entries.map(async ([key, src]) => {
      assets[key] = await loadImage(src);
    })
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法读取图片：${src}`));
    image.src = src;
  });
}

async function handlePhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setMessage("请选择图片文件。");
    return;
  }

  state.photoDataUrl = await readFileAsDataUrl(file);
  state.photoImage = await loadImage(state.photoDataUrl);
  resetCrop(false);

  elements.photoPreview.classList.add("is-ready");
  elements.cropControls.hidden = false;
  drawCropPreview();
  invalidateDownloads();
  setMessage("照片已载入。", true);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function drawQuestionSet() {
  state.currentQuestions = shuffle([...questions]).slice(0, 5);
  elements.questionList.innerHTML = "";

  state.currentQuestions.forEach((question, index) => {
    const card = document.createElement("section");
    card.className = "question-card";

    const label = document.createElement("label");
    label.className = "question-check";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "selectedQuestion";
    checkbox.value = String(index);

    const text = document.createElement("span");
    text.textContent = question;

    const answer = document.createElement("textarea");
    answer.placeholder = "选择这道题后填写答案";
    answer.maxLength = 80;
    answer.disabled = true;

    checkbox.addEventListener("change", () => {
      const checked = getCheckedQuestionCards();
      if (checked.length > 3) {
        checkbox.checked = false;
        setMessage("最多选择 3 道题。");
        return;
      }

      answer.disabled = !checkbox.checked;
      if (!checkbox.checked) answer.value = "";
      card.classList.toggle("is-selected", checkbox.checked);
      setMessage(`已选择 ${getCheckedQuestionCards().length} / 3 道题。`, true);
    });

    label.append(checkbox, text);
    card.append(label, answer);
    elements.questionList.append(card);
  });
}

function handleGenerate(event) {
  event.preventDefault();
  const payload = collectPayload();
  if (!payload) return;

  renderFront(payload);
  renderBack(payload);
  const baseName = buildFileBaseName(payload);
  const frontReady = updateDownloadLink(elements.downloadFront, elements.frontCanvas, `${baseName}_正面.png`, "frontDownloadUrl");
  const backReady = updateDownloadLink(elements.downloadBack, elements.backCanvas, `${baseName}_反面.png`, "backDownloadUrl");
  if (frontReady && backReady) {
    setMessage("卡片已生成，可以下载 PNG。", true);
  }
}

function collectPayload() {
  const name = elements.nameInput.value.trim();
  if (!state.photoImage) {
    setMessage("请先上传人物照片。");
    return null;
  }
  if (!name) {
    setMessage("请填写姓名。");
    elements.nameInput.focus();
    return null;
  }

  const selected = getCheckedQuestionCards();
  if (selected.length !== 3) {
    setMessage("请选择并回答 3 道题。");
    return null;
  }

  const answers = selected.map(({ card, checkbox }) => {
    const textarea = card.querySelector("textarea");
    return {
      question: state.currentQuestions[Number(checkbox.value)],
      answer: textarea.value.trim()
    };
  });

  const missing = answers.find((item) => !item.answer);
  if (missing) {
    setMessage("每道已选择的问题都需要填写答案。");
    return null;
  }

  return {
    name,
    classId: elements.classInput.value,
    className: `笃实${elements.classInput.value}`,
    answers,
    photo: state.photoImage,
    crop: { ...state.crop }
  };
}

function getCheckedQuestionCards() {
  return [...elements.questionList.querySelectorAll(".question-card")]
    .map((card) => ({ card, checkbox: card.querySelector("input[type='checkbox']") }))
    .filter((item) => item.checkbox.checked);
}

function renderFront(payload) {
  const ctx = elements.frontCanvas.getContext("2d");
  const palette = palettes[payload.classId];
  drawCardBase(ctx, "front", palette);

  roundedImage(ctx, payload.photo, 170, 190, 1160, 1565, 56, payload.crop);

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  roundRect(ctx, 170, 1468, 1160, 287, 56);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#fffaf0";
  ctx.font = "700 128px Microsoft YaHei, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  fitText(ctx, payload.name, 248, 1520, 720, 128);

  ctx.font = "500 48px Microsoft YaHei, sans-serif";
  ctx.fillText(payload.className, 258, 1664);

  drawRoundAsset(ctx, assets.academy, 810, 1518, 190);
  drawRoundAsset(ctx, assets[payload.classId], 1040, 1518, 190);
  drawCollegeLine(ctx, 1840, palette);
}

function renderBack(payload) {
  const ctx = elements.backCanvas.getContext("2d");
  const palette = palettes[payload.classId];
  drawCardBase(ctx, "back", palette);

  drawBackHeader(ctx, palette);

  const startY = 650;
  payload.answers.forEach((item, index) => {
    const y = startY + index * 410;
    drawAnswerBlock(ctx, item, index + 1, y, palette);
  });
  drawCollegeLine(ctx, 1840, palette);
}

function drawEmptyCards() {
  const front = elements.frontCanvas.getContext("2d");
  const back = elements.backCanvas.getContext("2d");
  drawCardBase(front, "front", palettes["53"]);
  drawCardBase(back, "back", palettes["53"]);

  front.fillStyle = "#637178";
  front.font = "500 54px Microsoft YaHei, sans-serif";
  front.textAlign = "center";
  front.fillText("上传照片后生成正面", CARD_WIDTH / 2, CARD_HEIGHT / 2);

  back.fillStyle = "#637178";
  back.font = "500 54px Microsoft YaHei, sans-serif";
  back.textAlign = "center";
  back.fillText("完成问答后生成反面", CARD_WIDTH / 2, CARD_HEIGHT / 2);
}

function drawCardBase(ctx, side, palette = palettes["53"]) {
  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, palette.paperA);
  gradient.addColorStop(0.55, palette.paperB);
  gradient.addColorStop(1, palette.paperC);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  drawPattern(ctx, palette);
  drawBorder(ctx, palette);

  ctx.save();
  ctx.globalAlpha = side === "front" ? 0.16 : 0.12;
  for (let i = 0; i < 7; i += 1) {
    ctx.strokeStyle = i % 2 ? palette.primary : palette.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(180 + i * 195, 1880, 96, 34, -0.35, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPattern(ctx, palette = palettes["53"]) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.pattern;
  ctx.lineWidth = 4;
  for (let y = 120; y < CARD_HEIGHT; y += 190) {
    for (let x = 110; x < CARD_WIDTH; x += 210) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 34, y - 44, x + 68, y);
      ctx.quadraticCurveTo(x + 34, y + 44, x, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBorder(ctx, palette = palettes["53"]) {
  ctx.save();
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 18;
  roundRect(ctx, 58, 58, CARD_WIDTH - 116, CARD_HEIGHT - 116, 90);
  ctx.stroke();

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 6;
  roundRect(ctx, 104, 104, CARD_WIDTH - 208, CARD_HEIGHT - 208, 62);
  ctx.stroke();

  drawCorner(ctx, 130, 130, 1, 1, palette);
  drawCorner(ctx, CARD_WIDTH - 130, 130, -1, 1, palette);
  drawCorner(ctx, 130, CARD_HEIGHT - 130, 1, -1, palette);
  drawCorner(ctx, CARD_WIDTH - 130, CARD_HEIGHT - 130, -1, -1, palette);
  ctx.restore();
}

function drawCorner(ctx, x, y, sx, sy, palette = palettes["53"]) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = palette.warm;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 98);
  ctx.bezierCurveTo(18, 40, 45, 18, 98, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(92, 92, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFrontMedallions(ctx) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ["53", "54"].forEach((text, index) => {
    const x = 515 + index * 470;
    ctx.fillStyle = index === 0 ? "#fff6e4" : "#eff8f5";
    ctx.strokeStyle = index === 0 ? "#c49a45" : "#1f7a66";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, 1915, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#243036";
    ctx.font = "700 50px Microsoft YaHei, sans-serif";
    ctx.fillText(text, x, 1918);
  });
  ctx.restore();
}

function drawBackHeader(ctx, palette = palettes["53"]) {
  ctx.save();
  const headerGradient = ctx.createLinearGradient(245, 210, 1255, 535);
  headerGradient.addColorStop(0, palette.pattern);
  headerGradient.addColorStop(0.32, "rgba(255, 246, 228, 0.9)");
  headerGradient.addColorStop(0.66, "rgba(255, 255, 255, 0.86)");
  headerGradient.addColorStop(1, palette.warmSoft);
  ctx.fillStyle = headerGradient;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 7;
  roundRect(ctx, 245, 210, 1010, 330, 54);
  ctx.fill();
  ctx.stroke();

  for (let i = 0; i < 9; i += 1) {
    const x = 330 + i * 105;
    const y = i % 2 ? 448 : 302;
    ctx.fillStyle = i % 3 === 0 ? palette.warm : palette.primary;
    ctx.beginPath();
    ctx.arc(x, y, i % 2 ? 13 : 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i += 1) {
    const y = 360 + i * 54;
    ctx.beginPath();
    ctx.moveTo(330, y);
    ctx.bezierCurveTo(500, y - 72, 610, y + 72, 750, y);
    ctx.bezierCurveTo(910, y - 72, 1030, y + 64, 1170, y - 10);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.accentSoft;
  ctx.lineWidth = 4;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(415 + i * 165, 250 + (i % 2) * 235, 68, 24, -0.28, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.font = "700 112px Microsoft YaHei, sans-serif";
  ctx.lineWidth = 12;
  ctx.strokeStyle = palette.titleStroke;
  ctx.strokeText("关于 Ta", CARD_WIDTH / 2, 402);
  ctx.lineWidth = 4;
  ctx.strokeStyle = palette.accent;
  ctx.strokeText("关于 Ta", CARD_WIDTH / 2, 402);
  ctx.fillStyle = palette.primaryDark;
  ctx.fillText("关于 Ta", CARD_WIDTH / 2, 402);
  ctx.restore();
}

function drawCollegeLine(ctx, y, palette = palettes["53"]) {
  ctx.save();
  const leftStart = 305;
  const leftEnd = CARD_WIDTH / 2 - 120;
  const rightStart = CARD_WIDTH / 2 + 120;
  const rightEnd = CARD_WIDTH - 305;
  const chinese = ["笃", "实", "书", "院"];
  const english = "Dushi College";

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 38px Microsoft YaHei, sans-serif";
  ctx.fillStyle = palette.primaryDark;

  chinese.forEach((char, index) => {
    const x = leftStart + ((leftEnd - leftStart) * index) / (chinese.length - 1);
    ctx.fillText(char, x, y);
  });

  ctx.fillStyle = palette.accent;
  ctx.font = "700 48px Microsoft YaHei, sans-serif";
  ctx.fillText("※", CARD_WIDTH / 2, y - 1);

  ctx.fillStyle = palette.primaryDark;
  ctx.font = "600 34px Georgia, 'Times New Roman', serif";
  const letters = [...english];
  letters.forEach((char, index) => {
    const x = rightStart + ((rightEnd - rightStart) * index) / (letters.length - 1);
    ctx.fillText(char, x, y + 1);
  });

  drawCollegeLinePattern(ctx, 255, CARD_WIDTH / 2 - 70, y, palette, -1);
  drawCollegeLinePattern(ctx, CARD_WIDTH / 2 + 70, CARD_WIDTH - 255, y, palette, 1);
  ctx.restore();
}

function drawAnswerBlock(ctx, item, number, y, palette = palettes["53"]) {
  ctx.save();
  const blockGradient = ctx.createLinearGradient(210, y, 1290, y + 335);
  blockGradient.addColorStop(0, "rgba(255, 255, 255, 0.94)");
  blockGradient.addColorStop(1, "rgba(244, 250, 247, 0.88)");
  ctx.fillStyle = blockGradient;
  ctx.strokeStyle = palette.pattern;
  ctx.lineWidth = 5;
  roundRect(ctx, 210, y, 1080, 335, 38);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.arc(310, y + 76, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fffaf0";
  ctx.font = "700 36px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Q${number}`, 310, y + 79);

  ctx.fillStyle = "#243036";
  ctx.font = "700 44px Microsoft YaHei, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  wrapTextBalanced(ctx, item.question, 390, y + 72, 735, 56, 2);

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(275, y + 158);
  ctx.lineTo(1225, y + 158);
  ctx.stroke();

  ctx.fillStyle = "#84652a";
  ctx.font = "600 56px Microsoft YaHei, sans-serif";
  wrapTextBalanced(ctx, item.answer, 275, y + 245, 930, 68, 2);

  ctx.fillStyle = palette.warm;
  ctx.beginPath();
  ctx.arc(1208, y + 78, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCollegeLinePattern(ctx, fromX, toX, y, palette, direction) {
  const width = toX - fromX;
  const colors = [palette.accentSoft, palette.pattern, palette.warmSoft];

  ctx.save();
  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = i === 1 ? 8 : 5;
    ctx.beginPath();
    ctx.moveTo(fromX, y - 34 + i * 34);
    ctx.bezierCurveTo(
      fromX + width * 0.26,
      y - 58 * direction + i * 20,
      fromX + width * 0.58,
      y + 48 * direction - i * 12,
      toX,
      y - 34 + i * 34
    );
    ctx.stroke();
  }

  ctx.fillStyle = palette.accent;
  [0.18, 0.5, 0.82].forEach((ratio, index) => {
    ctx.beginPath();
    ctx.arc(fromX + width * ratio, y + (index - 1) * 26, index === 1 ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function roundedImage(ctx, image, x, y, width, height, radius, crop = null) {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  if (crop) {
    drawImageCoverCropped(ctx, image, x, y, width, height, crop);
  } else {
    drawImageCover(ctx, image, x, y, width, height);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#fffaf0";
  ctx.lineWidth = 14;
  roundRect(ctx, x, y, width, height, radius);
  ctx.stroke();
  ctx.restore();
}

function drawRoundAsset(ctx, image, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  drawImageCover(ctx, image, x, y, size, size);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#fffaf0";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawImageCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) / 2;
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}

function drawImageCoverCropped(ctx, image, x, y, width, height, crop) {
  const scale = Math.max(width / image.width, height / image.height) * crop.zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const maxX = Math.max(0, (drawWidth - width) / 2);
  const maxY = Math.max(0, (drawHeight - height) / 2);
  const offsetX = clamp(crop.offsetX, -maxX, maxX);
  const offsetY = clamp(crop.offsetY, -maxY, maxY);
  const dx = x + (width - drawWidth) / 2 + offsetX;
  const dy = y + (height - drawHeight) / 2 + offsetY;
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}

function handleCropZoom(event) {
  state.crop.zoom = Number(event.target.value);
  clampCropOffsets();
  drawCropPreview();
  invalidateDownloads();
}

function resetCrop(redraw = true) {
  state.crop.zoom = 1;
  state.crop.offsetX = 0;
  state.crop.offsetY = 0;
  elements.cropZoom.value = "1";
  if (redraw) drawCropPreview();
  invalidateDownloads();
}

function startCropDrag(event) {
  if (!state.photoImage) return;
  event.preventDefault();
  state.crop.dragging = true;
  state.crop.lastX = event.clientX;
  state.crop.lastY = event.clientY;
  elements.cropCanvas.setPointerCapture(event.pointerId);
  elements.photoPreview.classList.add("is-dragging");
}

function moveCropDrag(event) {
  if (!state.crop.dragging || !state.photoImage) return;
  event.preventDefault();
  const rect = elements.cropCanvas.getBoundingClientRect();
  const scaleX = 1160 / rect.width;
  const scaleY = 1565 / rect.height;
  state.crop.offsetX += (event.clientX - state.crop.lastX) * scaleX;
  state.crop.offsetY += (event.clientY - state.crop.lastY) * scaleY;
  state.crop.lastX = event.clientX;
  state.crop.lastY = event.clientY;
  clampCropOffsets();
  drawCropPreview();
  invalidateDownloads();
}

function endCropDrag(event) {
  state.crop.dragging = false;
  elements.photoPreview.classList.remove("is-dragging");
  if (event.pointerId !== undefined && elements.cropCanvas.hasPointerCapture(event.pointerId)) {
    elements.cropCanvas.releasePointerCapture(event.pointerId);
  }
}

function drawCropPreview() {
  const ctx = elements.cropCanvas.getContext("2d");
  ctx.clearRect(0, 0, elements.cropCanvas.width, elements.cropCanvas.height);
  if (!state.photoImage) return;

  ctx.fillStyle = "#fffdf5";
  ctx.fillRect(0, 0, elements.cropCanvas.width, elements.cropCanvas.height);
  drawImageCoverCropped(ctx, state.photoImage, 0, 0, elements.cropCanvas.width, elements.cropCanvas.height, {
    zoom: state.crop.zoom,
    offsetX: state.crop.offsetX,
    offsetY: state.crop.offsetY
  });

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, elements.cropCanvas.width - 10, elements.cropCanvas.height - 10);
  ctx.strokeStyle = "rgba(31, 122, 102, 0.9)";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(16, 16, elements.cropCanvas.width - 32, elements.cropCanvas.height - 32);
  ctx.restore();
}

function clampCropOffsets() {
  if (!state.photoImage) return;
  const scale = Math.max(1160 / state.photoImage.width, 1565 / state.photoImage.height) * state.crop.zoom;
  const drawWidth = state.photoImage.width * scale;
  const drawHeight = state.photoImage.height * scale;
  state.crop.offsetX = clamp(state.crop.offsetX, -Math.max(0, (drawWidth - 1160) / 2), Math.max(0, (drawWidth - 1160) / 2));
  state.crop.offsetY = clamp(state.crop.offsetY, -Math.max(0, (drawHeight - 1565) / 2), Math.max(0, (drawHeight - 1565) / 2));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = [...text];
  const lines = [];
  let line = "";

  chars.forEach((char) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = visible[visible.length - 1];
    while (ctx.measureText(`${last}...`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1);
    }
    visible[visible.length - 1] = `${last}...`;
  }

  visible.forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * lineHeight);
  });
}

function wrapTextBalanced(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = splitTextLines(ctx, text, maxWidth);
  if (lines.length > 1 && [...lines[lines.length - 1]].length <= 2) {
    const previous = lines[lines.length - 2];
    const chars = [...previous];
    while (chars.length > 1 && [...lines[lines.length - 1]].length < 4) {
      const moved = chars.pop();
      const candidateLast = moved + lines[lines.length - 1];
      const candidatePrev = chars.join("");
      if (ctx.measureText(candidateLast).width <= maxWidth && candidatePrev.length > 0) {
        lines[lines.length - 2] = candidatePrev;
        lines[lines.length - 1] = candidateLast;
      } else {
        break;
      }
    }
  }

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = visible[visible.length - 1];
    while (ctx.measureText(`${last}...`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1);
    }
    visible[visible.length - 1] = `${last}...`;
  }

  visible.forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * lineHeight);
  });
}

function splitTextLines(ctx, text, maxWidth) {
  const chars = [...text];
  const lines = [];
  let line = "";

  chars.forEach((char) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function fitText(ctx, text, x, y, maxWidth, fontSize) {
  let size = fontSize;
  do {
    ctx.font = `700 ${size}px Microsoft YaHei, sans-serif`;
    size -= 4;
  } while (ctx.measureText(text).width > maxWidth && size > 46);
  ctx.fillText(text, x, y);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function updateDownloadLink(link, canvas, filename, stateKey) {
  try {
    state[stateKey] = "";
    disableDownloadLink(link);
    state[stateKey] = canvas.toDataURL("image/png");
    link.href = state[stateKey];
    link.download = filename;
    link.classList.remove("is-disabled");
    link.setAttribute("aria-disabled", "false");
    return true;
  } catch (error) {
    setMessage("图片导出失败，请刷新页面后重新上传图片再生成。");
    return false;
  }
}

function buildFileBaseName(payload) {
  const raw = `${payload.name}_${payload.className}`;
  return raw.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "");
}

function resetForm() {
  elements.form.reset();
  state.photoDataUrl = "";
  state.photoImage = null;
  state.frontDownloadUrl = "";
  state.backDownloadUrl = "";
  elements.photoPreview.classList.remove("is-ready", "is-dragging");
  elements.cropControls.hidden = true;
  resetCrop(false);
  const ctx = elements.cropCanvas.getContext("2d");
  ctx.clearRect(0, 0, elements.cropCanvas.width, elements.cropCanvas.height);
  disableDownloadLink(elements.downloadFront);
  disableDownloadLink(elements.downloadBack);
  drawQuestionSet();
  drawEmptyCards();
  setMessage("已清空，可以重新制作。", true);
}

function disableDownloadLink(link) {
  link.removeAttribute("href");
  link.removeAttribute("download");
  link.classList.add("is-disabled");
  link.setAttribute("aria-disabled", "true");
}

function invalidateDownloads() {
  state.frontDownloadUrl = "";
  state.backDownloadUrl = "";
  disableDownloadLink(elements.downloadFront);
  disableDownloadLink(elements.downloadBack);
}

function setMessage(text, ok = false) {
  elements.message.textContent = text;
  elements.message.classList.toggle("ok", ok);
}
