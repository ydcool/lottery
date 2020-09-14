let prizes = [
  {
    type: 0,
    count: 0,
    text: "无",
    title: "所有奖品已抽取完毕",
    img: "../img/huawei.png",
  },
  {
    type: 1,
    count: 2,
    text: "一等奖",
    title: "山东五天四夜游",
    img: "../img/lucky_img1.jpg",
  },
  {
    type: 2,
    count: 6,
    text: "二等奖",
    title: "琉璃泰山工艺品",
    img: "../img/lucky_img2.jpg",
  },
  {
    type: 3,
    count: 12,
    text: "三等奖",
    title: "淄博白瓷茶具套装",
    img: "../img/lucky_img3.jpg",
  },
  {
    type: 4,
    count: 70,
    text: "纪念奖",
    title: "紫光檀木鲁班锁",
    img: "../img/lucky_img4.jpg",
  },
];

/**
 * 内定的中奖人
 *  .type 对应 prizes 的 type
 *  .records 对应人员名单 excel 记录
 *  .records.column 对应 人员名单 excel 内第几列属性，抽奖时按照此属性查找中奖人，0 即第一列（邮箱）
 *  .records.value  匹配列的内定人员的具体属性值
 */
let InternalLuckyGuys = {
  type: 1,
  records: [
    { column: 0, value: "angellin527@gmail.com" },
    { column: 0, value: "wang58pp@gmail.com" },
  ],
};

/**
 * 一次抽取的奖品个数
 * 顺序为：[特别奖，一等奖，二等奖，三等奖，四等奖，五等奖]
 */
const EACH_COUNT = [1, 1, 1, 1, 1];

const COMPANY = "旅发大会";
const ROW_COUNT = 7;
const COLUMN_COUNT = 17;

/**
 * 高亮矩阵
 */
const HIGHLIGHT_CELL = [
  "1-1",
  "1-2",
  "1-3",
  "2-3",
  "3-1",
  "3-2",
  "3-3",
  "4-1",
  "5-1",
  "5-2",
  "5-3",
  "1-5",
  "1-6",
  "1-7",
  "2-5",
  "2-7",
  "3-5",
  "3-7",
  "4-5",
  "4-7",
  "5-5",
  "5-6",
  "5-7",
  "1-9",
  "1-10",
  "1-11",
  "2-11",
  "3-9",
  "3-10",
  "3-11",
  "4-9",
  "5-9",
  "5-10",
  "5-11",
  "1-13",
  "1-14",
  "1-15",
  "2-13",
  "2-15",
  "3-13",
  "3-15",
  "4-13",
  "4-15",
  "5-13",
  "5-14",
  "5-15",
];

module.exports = {
  prizes,
  EACH_COUNT,
  ROW_COUNT,
  COLUMN_COUNT,
  COMPANY,
  HIGHLIGHT_CELL,
  InternalLuckyGuys,
};
