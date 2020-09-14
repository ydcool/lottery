import "./index.css";
import "../css/animate.min.css";
import "./canvas.js";
import {
  addQipao,
  setPrizes,
  showPrizeList,
  setPrizeData,
  resetPrize,
  disablePrize,
} from "./prizeList";
import { NUMBER_MATRIX } from "./config.js";

const ROTATE_TIME = 3000;
const BASE_HEIGHT = 1080;

let TOTAL_CARDS,
  btns = {
    enter: document.querySelector("#enter"),
    lotteryBar: document.querySelector("#lotteryBar"),
  },
  prizes,
  EACH_COUNT,
  ROW_COUNT = 7,
  COLUMN_COUNT = 17,
  COMPANY,
  HIGHLIGHT_CELL = [],
  // 当前的比例
  Resolution = 1;

let camera,
  scene,
  renderer,
  controls,
  threeDCards = [],
  targets = {
    table: [],
    sphere: [],
  };

let selectedCardIndex = [],
  rotate = false,
  basicData = {
    prizes: [], //奖品信息
    users: [], //所有人员
    luckyUsers: {}, //已中奖人员
    leftUsers: [], //未中奖人员
    InternalLuckyGuys: {}, //内定中奖人信息
  },
  interval,
  // 当前抽的奖项，从最低奖开始抽，直到抽到大奖
  currentPrizeIndex,
  currentPrize,
  // 正在抽奖
  isLotting = false,
  // 缓存当前中奖人
  currentLuckys = [],
  //内定中奖人信息
  interLuckyGuys = {};

initAll();

/**
 * 初始化所有DOM
 */
function initAll() {
  window.AJAX({
    url: "/getTempData",
    success(data) {
      // 获取基础数据
      prizes = data.cfgData.prizes;
      EACH_COUNT = data.cfgData.EACH_COUNT;
      COMPANY = data.cfgData.COMPANY;
      HIGHLIGHT_CELL = createHighlight();
      basicData.prizes = prizes;
      setPrizes(prizes);
      basicData.InternalLuckyGuys = data.cfgData.InternalLuckyGuys;
      //deep copy
      interLuckyGuys = JSON.parse(
        JSON.stringify(data.cfgData.InternalLuckyGuys)
      );

      TOTAL_CARDS = ROW_COUNT * COLUMN_COUNT;

      // 读取当前已设置的抽奖结果
      basicData.leftUsers = data.leftUsers;
      basicData.luckyUsers = data.luckyData;

      let prizeIndex = basicData.prizes.length - 1;
      for (; prizeIndex > -1; prizeIndex--) {
        if (
          data.luckyData[prizeIndex] &&
          data.luckyData[prizeIndex].length >=
            basicData.prizes[prizeIndex].count
        ) {
          continue;
        }
        currentPrizeIndex = prizeIndex;
        currentPrize = basicData.prizes[currentPrizeIndex];
        break;
      }

      showPrizeList(currentPrizeIndex);
      let curLucks = basicData.luckyUsers[currentPrize.type];
      setPrizeData(currentPrizeIndex, curLucks ? curLucks.length : 0, true);

      //刷新其他奖品状态
      refreshAllPrize(currentPrizeIndex);
    },
  });

  window.AJAX({
    url: "/getUsers",
    success(data) {
      basicData.users = data;

      initCards();
      // startMaoPao();
      animate();
      shineCard();
    },
  });
}

function initCards() {
  let member = basicData.users,
    showCards = [],
    length = member.length;

  let isBold = false,
    showTable = basicData.leftUsers.length === basicData.users.length,
    index = 0,
    totalMember = member.length,
    position = {
      x: (140 * COLUMN_COUNT - 20) / 2,
      y: (180 * ROW_COUNT - 20) / 2,
    };

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 3000;

  scene = new THREE.Scene();

  for (let i = 0; i < ROW_COUNT; i++) {
    for (let j = 0; j < COLUMN_COUNT; j++) {
      isBold = HIGHLIGHT_CELL.includes(j + "-" + i);
      var element = createCard(
        member[index % length],
        isBold,
        index,
        showTable
      );

      var object = new THREE.CSS3DObject(element);
      object.position.x = Math.random() * 4000 - 2000;
      object.position.y = Math.random() * 4000 - 2000;
      object.position.z = Math.random() * 4000 - 2000;
      scene.add(object);
      threeDCards.push(object);
      //

      var object = new THREE.Object3D();
      object.position.x = j * 140 - position.x;
      object.position.y = -(i * 180) + position.y;
      targets.table.push(object);
      index++;
    }
  }

  // sphere

  var vector = new THREE.Vector3();

  for (var i = 0, l = threeDCards.length; i < l; i++) {
    var phi = Math.acos(-1 + (2 * i) / l);
    var theta = Math.sqrt(l * Math.PI) * phi;
    var object = new THREE.Object3D();
    object.position.setFromSphericalCoords(800 * Resolution, phi, theta);
    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);
    targets.sphere.push(object);
  }

  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  //

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.5;
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  bindEvent();

  if (showTable) {
    switchScreen("enter");
  } else {
    switchScreen("lottery");
  }
}

// 刷新其他奖品状态
function refreshAllPrize(cIdx) {
  basicData.prizes.forEach((p) => {
    if (p.type && p.type !== cIdx) {
      let luckys = basicData.luckyUsers[p.type];
      let luckyCount = luckys ? luckys.length : 0;
      if (luckyCount === p.count) {
        disablePrize(p.type);
      }
    }
  });
}

function setLotteryStatus(status = false) {
  isLotting = status;
}

function setLotteryBtnText(lottering = false) {
  document.getElementById("lottery").innerText = lottering ? "停止" : "开始";
}

/**
 * 事件绑定
 */
function bindEvent() {
  document.querySelector("#menu").addEventListener("click", function (e) {
    e.stopPropagation();

    let target = e.target.id;

    // 如果正在抽奖，则禁止一切操作
    if (isLotting && target !== "lottery") {
      addQipao("别着急，还没抽完呢~");
      return false;
    }

    switch (target) {
      // 显示数字墙
      case "welcome":
        switchScreen("enter");
        rotate = false;
        break;
      // 进入抽奖
      case "enter":
        removeHighlight();
        addQipao(`马上抽取[${currentPrize.title}],不要走开。`);
        // rotate = !rotate;
        rotate = true;
        switchScreen("lottery");
        break;
      // 重置
      case "reset":
        let doREset = window.confirm(
          "是否确认重置数据，重置后，当前已抽的奖项全部清空？"
        );
        if (!doREset) {
          return;
        }
        addQipao("重置所有数据，重新抽奖");
        addHighlight();
        resetCard();
        // 重置所有数据
        currentLuckys = [];
        basicData.leftUsers = Object.assign([], basicData.users);
        basicData.luckyUsers = {};
        currentPrizeIndex = basicData.prizes.length - 1;
        currentPrize = basicData.prizes[currentPrizeIndex];
        interLuckyGuys = JSON.parse(
          JSON.stringify(basicData.InternalLuckyGuys)
        );

        resetPrize(currentPrizeIndex);
        reset();
        switchScreen("enter");
        addPrizeItemListener();
        break;
      // 抽奖
      case "lottery":
        // 切换抽奖状态
        if (isLotting) {
          if (window.asdcd) return;
          window.asdcd = true;

          window.timeoutaaa = setTimeout(function () {
            window.asdcd = false;
          }, 2000);

          //结束抽奖
          setLotteryBtnText(false);
          rotateBall(false);
          // setTimeout(lottery, 400);
          lottery();
        } else {
          clearTimeout(window.timeoutaaa);
          window.asdcd = true;
          setTimeout(function () {
            window.asdcd = false;
          }, 2000);
          
          // 首先检查当前奖项余量,0 则提示，
          // 不再默认进行自动切换，须手动点选
          if (!checkLeftPrize()) {
            addQipao("当前奖品已全部抽取完毕！");
            break;
          }
          setLotteryStatus(true);
          setLotteryBtnText(true);
          //开始抽奖
          //更新剩余抽奖数目的数据显示
          changePrize();
          resetCard().then(() => {
            // 抽奖
            rotateBall(true);
          });
          addQipao(`正在抽取[${currentPrize.title}],调整好姿势`);
        }

        break;
      // 重新抽奖
      case "reLottery":
        if (currentLuckys.length === 0) {
          addQipao(`当前还没有抽奖，无法重新抽取喔~~`);
          return;
        }
        setErrorData(currentLuckys);
        addQipao(`重新抽取[${currentPrize.title}],做好准备`);
        setLotteryStatus(true);
        // 重新抽奖则直接进行抽取，不对上一次的抽奖数据进行保存
        // 抽奖
        resetCard().then(() => {
          // 抽奖
          lottery();
        });
        break;
      // 导出抽奖结果
      case "save":
        // saveData().then((res) => {
        resetCard().then((res) => {
          // 将之前的记录置空
          currentLuckys = [];
        });
        exportData();
        addQipao(`数据已保存到EXCEL中。`);
        // });
        break;
    }
  });

  window.addEventListener("resize", onWindowResize, false);
  addPrizeItemListener();
}

// 检查当前奖项余量
function checkLeftPrize() {
  currentPrize = basicData.prizes[currentPrizeIndex];
  let luckys = basicData.luckyUsers[currentPrize.type];
  let luckyCount = luckys ? luckys.length : 0;
  return luckyCount !== currentPrize.count;
}

// 添加奖品点击事件
function addPrizeItemListener() {
  document.querySelectorAll(".prize-list>li>.prize-img").forEach((v) => {
    v.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("basic:", basicData);

      let target = e.target.parentElement.parentElement.id;

      currentPrizeIndex = target.replace("prize-item-", "");
      currentPrize = basicData.prizes[currentPrizeIndex];
      let luckys = basicData.luckyUsers[currentPrize.type];
      let luckyCount = luckys ? luckys.length : 0;
      // 修改左侧prize的数目和百分比
      setPrizeData(currentPrizeIndex, luckyCount);
    });
  });
  console.log("registered prize item listener.");
}

function switchScreen(type) {
  switch (type) {
    case "enter":
      document.getElementById("welcomeTxt").style.display = "block";
      document.querySelector("#prizeBar").style.display = "none";
      document.getElementById("container").style.display = "none";
      document.querySelector("#menu").style.bottom = "20vh";
      btns.enter.classList.remove("none");
      btns.lotteryBar.classList.add("none");
      transform(targets.table, 2000);
      break;
    default:
      btns.enter.classList.add("none");
      btns.lotteryBar.classList.remove("none");
      transform(targets.sphere, 2000);
      document.querySelector("#menu").style.bottom = "4vh";
      document.getElementById("welcomeTxt").style.display = "none";
      document.querySelector("#prizeBar").style.display = "block";
      document.getElementById("container").style.display = "block";
      break;
  }
}

/**
 * 创建元素
 */
function createElement(css, text) {
  let dom = document.createElement("div");
  dom.className = css || "";
  dom.innerHTML = text || "";
  return dom;
}

/**
 * 创建名牌
 */
function createCard(user, isBold, id, showTable) {
  var element = createElement();
  element.id = "card-" + id;

  if (isBold) {
    element.className = "element lightitem";
    if (showTable) {
      element.classList.add("highlight");
    }
  } else {
    element.className = "element";
    element.style.backgroundColor =
      "rgba(0,127,127," + (Math.random() * 0.7 + 0.25) + ")";
  }
  //添加公司标识
  element.appendChild(createElement("company", COMPANY));

  element.appendChild(createElement("name", user[1]));

  element.appendChild(createElement("details", user[0] + "<br/>" + user[2]));
  return element;
}

function removeHighlight() {
  document.querySelectorAll(".highlight").forEach((node) => {
    node.classList.remove("highlight");
  });
}

function addHighlight() {
  document.querySelectorAll(".lightitem").forEach((node) => {
    node.classList.add("highlight");
  });
}

/**
 * 渲染地球等
 */
function transform(targets, duration) {
  // TWEEN.removeAll();
  for (var i = 0; i < threeDCards.length; i++) {
    var object = threeDCards[i];
    var target = targets[i];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    // new TWEEN.Tween(object.rotation)
    //     .to({
    //         x: target.rotation.x,
    //         y: target.rotation.y,
    //         z: target.rotation.z
    //     }, Math.random() * duration + duration)
    //     .easing(TWEEN.Easing.Exponential.InOut)
    //     .start();
  }

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

var currentRotateAnim;
function rotateBall(start = true) {
  if (!start) {
    if (currentRotateAnim !== null) {
      currentRotateAnim.stop();
      currentRotateAnim = null;
      scene.rotation.y = 0;
    } else {
      console.error(
        "rotate animation object should not be null while stopping"
      );
    }
  } else {
    scene.rotation.y = 0;
    currentRotateAnim = new TWEEN.Tween(scene.rotation)
      .to(
        {
          y: Math.PI * 6000,
        },
        100000
      )
      // .repeat(1)
      .onUpdate(render)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function animate() {
  // 让场景通过x轴或者y轴旋转
  // rotate && (scene.rotation.y += 0.088);

  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();

  // 渲染循环
  // render();
}

function render() {
  renderer.render(scene, camera);
}

function selectCard(duration = 600) {
  rotate = false;
  let width = 140,
    tag = -(currentLuckys.length - 1) / 2,
    locates = [];

  // 计算位置信息, 大于5个分两排显示
  if (currentLuckys.length > 5) {
    let yPosition = [-87, 87],
      l = selectedCardIndex.length,
      mid = Math.ceil(l / 2);
    tag = -(mid - 1) / 2;
    for (let i = 0; i < mid; i++) {
      locates.push({
        x: tag * width * Resolution,
        y: yPosition[0] * Resolution,
      });
      tag++;
    }

    tag = -(l - mid - 1) / 2;
    for (let i = mid; i < l; i++) {
      locates.push({
        x: tag * width * Resolution,
        y: yPosition[1] * Resolution,
      });
      tag++;
    }
  } else {
    for (let i = selectedCardIndex.length; i > 0; i--) {
      locates.push({
        x: tag * width * Resolution,
        y: 0 * Resolution,
      });
      tag++;
    }
  }

  let text = currentLuckys.map((item) => item[1]);
  addQipao(`恭喜${text.join("、")}获得${currentPrize.title}, 欧气爆棚！`);

  selectedCardIndex.forEach((cardIndex, index) => {
    changeCard(cardIndex, currentLuckys[index]);
    var object = threeDCards[cardIndex];
    new TWEEN.Tween(object.position)
      .to(
        {
          x: locates[index].x,
          y: locates[index].y * Resolution,
          z: 2200,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: 0,
          y: 0,
          z: 0,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    object.element.classList.add("prize");
    tag++;
  });

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start()
    .onComplete(() => {
      // 动画结束后可以操作
      setLotteryStatus();
    });
}

/**
 * 重置抽奖牌内容
 */
function resetCard(duration = 500) {
  if (currentLuckys.length === 0) {
    return Promise.resolve();
  }

  selectedCardIndex.forEach((index) => {
    let object = threeDCards[index],
      target = targets.sphere[index];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  });

  return new Promise((resolve, reject) => {
    new TWEEN.Tween(this)
      .to({}, duration * 2)
      .onUpdate(render)
      .start()
      .onComplete(() => {
        selectedCardIndex.forEach((index) => {
          let object = threeDCards[index];
          object.element.classList.remove("prize");
        });
        resolve();
      });
  });
}

/**
 * 抽奖
 */
function lottery() {
  // 将之前的记录置空
  currentLuckys = [];
  selectedCardIndex = [];
  // 当前同时抽取的数目,当前奖品抽完还可以继续抽，但是不记录数据
  let perCount = EACH_COUNT[currentPrizeIndex],
    leftCount = basicData.leftUsers.length;

  if (leftCount === 0) {
    addQipao("人员已抽完，现在重新设置所有人员可以进行二次抽奖！");
    basicData.leftUsers = basicData.users;
    leftCount = basicData.leftUsers.length;
  }

  for (let i = 0; i < perCount; i++) {
    let luckyId = -1;
    if (
      interLuckyGuys &&
      interLuckyGuys.records &&
      interLuckyGuys.records.length > 0
    ) {
      if (interLuckyGuys.type == currentPrizeIndex) {
        // 如果有内定，直接返回内定结果
        let randI = random(interLuckyGuys.records.length);
        let iGuy = interLuckyGuys.records[randI];
        for (let i = 0; i < basicData.leftUsers.length; i++) {
          let u = basicData.leftUsers[i];
          if (u[iGuy.column] == iGuy.value) {
            luckyId = i;
            break;
          }
        }
        interLuckyGuys.records.splice(randI, 1);
        if (luckyId < 0) {
          console.error(
            `internal lucky user not found, fall back to random user`,
            iGuy
          );
          luckyId = random(leftCount);
        }
      } else {
        //其他奖项排除掉内定人员
        let recursiveGetLucky = () => {
          luckyId = random(leftCount);
          let lk = basicData.leftUsers[luckyId];
          let match = false;
          interLuckyGuys.records.forEach((u) => {
            if (!match && lk[u.column] == u.value) {
              match = true;
            }
          });
          match && recursiveGetLucky();
        };
        recursiveGetLucky();
      }
    } else {
      luckyId = random(leftCount);
    }

    currentLuckys.push(basicData.leftUsers.splice(luckyId, 1)[0]);
    leftCount--;

    let cardIndex = random(TOTAL_CARDS);
    while (selectedCardIndex.includes(cardIndex)) {
      cardIndex = random(TOTAL_CARDS);
    }
    selectedCardIndex.push(cardIndex);
  }

  // 展示动画，结束后标定抽奖状态
  selectCard();
  // 立即保存抽奖数据
  saveData();
}

/**
 * 保存上一次的抽奖结果
 */
function saveData() {
  if (!currentPrize) {
    //若奖品抽完，则不再记录数据，但是还是可以进行抽奖
    return;
  }

  let type = currentPrize.type,
    curLucky = basicData.luckyUsers[type] || [];

  curLucky = curLucky.concat(currentLuckys);

  basicData.luckyUsers[type] = curLucky;

  // 当前奖项抽取完成后，自动抽取上一级奖项
  if (currentPrize.count <= curLucky.length) {
    // 更改为手动选择奖项，不再支持自动切换奖项
    // currentPrizeIndex--;
    // if (currentPrizeIndex <= -1) {
    //   currentPrizeIndex = 0;
    // }
    // currentPrize = basicData.prizes[currentPrizeIndex];
  }

  if (currentLuckys.length > 0) {
    // todo by xc 添加数据保存机制，以免服务器挂掉数据丢失
    return setData(type, currentLuckys);
  }
  return Promise.resolve();
}

function changePrize() {
  let luckys = basicData.luckyUsers[currentPrize.type];
  let luckyCount = (luckys ? luckys.length : 0) + EACH_COUNT[currentPrizeIndex];
  // 修改左侧prize的数目和百分比
  setPrizeData(currentPrizeIndex, luckyCount);
}

/**
 * 随机抽奖
 */
function random(num) {
  // Math.floor取到0-num-1之间数字的概率是相等的
  return Math.floor(Math.random() * num);
}

/**
 * 切换名牌人员信息
 */
function changeCard(cardIndex, user) {
  let card = threeDCards[cardIndex].element;

  card.innerHTML = `<div class="company">${COMPANY}</div><div class="name">${
    user[1]
  }</div><div class="details">${user[0]}<br/>${user[2] || "PSST"}</div>`;
}

/**
 * 切换名牌背景
 */
function shine(cardIndex, color) {
  let card = threeDCards[cardIndex].element;
  card.style.backgroundColor =
    color || "rgba(0,127,127," + (Math.random() * 0.7 + 0.25) + ")";
}

/**
 * 随机切换背景和人员信息
 */
function shineCard() {
  let maxCard = 10,
    maxUser;
  let shineCard = 10 + random(maxCard);

  setInterval(() => {
    // 正在抽奖停止闪烁
    if (isLotting) {
      return;
    }
    maxUser = basicData.leftUsers.length;
    for (let i = 0; i < shineCard; i++) {
      let index = random(maxUser),
        cardIndex = random(TOTAL_CARDS);
      // 当前显示的已抽中名单不进行随机切换
      if (selectedCardIndex.includes(cardIndex)) {
        continue;
      }
      shine(cardIndex);
      changeCard(cardIndex, basicData.leftUsers[index]);
    }
  }, 500);
}

function setData(type, data) {
  return new Promise((resolve, reject) => {
    window.AJAX({
      url: "/saveData",
      data: {
        type,
        data,
      },
      success() {
        resolve();
      },
      error() {
        reject();
      },
    });
  });
}

function setErrorData(data) {
  return new Promise((resolve, reject) => {
    window.AJAX({
      url: "/errorData",
      data: {
        data,
      },
      success() {
        resolve();
      },
      error() {
        reject();
      },
    });
  });
}

function exportData() {
  window.AJAX({
    url: "/export",
    success(data) {
      if (data.type === "success") {
        location.href = data.url;
      }
    },
  });
}

function reset() {
  window.AJAX({
    url: "/reset",
    success(data) {
      console.log("重置成功");
    },
  });
}

function createHighlight() {
  let year = new Date().getFullYear() + "";
  let step = 4,
    xoffset = 1,
    yoffset = 1,
    highlight = [];

  year.split("").forEach((n) => {
    highlight = highlight.concat(
      NUMBER_MATRIX[n].map((item) => {
        return `${item[0] + xoffset}-${item[1] + yoffset}`;
      })
    );
    xoffset += step;
  });

  return highlight;
}

let onload = window.onload;

window.onload = function () {
  onload && onload();

  let music = document.querySelector("#music");

  let rotated = 0,
    stopAnimate = false,
    musicBox = document.querySelector("#musicBox");

  function animate() {
    requestAnimationFrame(function () {
      if (stopAnimate) {
        return;
      }
      rotated = rotated % 360;
      musicBox.style.transform = "rotate(" + rotated + "deg)";
      rotated += 1;
      animate();
    });
  }

  musicBox.addEventListener(
    "click",
    function (e) {
      if (music.paused) {
        music.play().then(
          () => {
            stopAnimate = false;
            animate();
          },
          () => {
            addQipao("背景音乐自动播放失败，请手动播放！");
          }
        );
      } else {
        music.pause();
        stopAnimate = true;
      }
    },
    false
  );

  setTimeout(function () {
    musicBox.click();
  }, 1000);
};
