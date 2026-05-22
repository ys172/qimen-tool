#!/usr/bin/env node

import { astro } from "iztro";

const PALACE_NAMES = [
  "命宫",
  "兄弟",
  "夫妻",
  "子女",
  "财帛",
  "疾厄",
  "迁移",
  "仆役",
  "官禄",
  "田宅",
  "福德",
  "父母",
];

function parseArgs(argv) {
  const args = {
    birth: undefined,
    gender: "男",
    timeIndex: 0,
    target: new Date(),
    targetTimeIndex: undefined,
    fixLeap: true,
    language: "zh-CN",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];

    if (item === "--json") {
      args.json = true;
      continue;
    }

    if (!item.startsWith("--")) continue;

    const key = item.slice(2);
    const next = argv[i + 1];

    if (next === undefined || next.startsWith("--")) {
      throw new Error(`参数 --${key} 后面需要一个值`);
    }

    i += 1;

    switch (key) {
      case "birth":
        args.birth = next;
        break;
      case "gender":
        args.gender = next;
        break;
      case "time":
      case "timeIndex":
        args.timeIndex = toInteger(next, "--time");
        break;
      case "target":
        args.target = next;
        break;
      case "targetTime":
      case "targetTimeIndex":
        args.targetTimeIndex = toInteger(next, "--targetTime");
        break;
      case "fixLeap":
        args.fixLeap = next !== "false";
        break;
      case "language":
        args.language = next;
        break;
      default:
        throw new Error(`不认识的参数：--${key}`);
    }
  }

  if (!args.birth) {
    throw new Error("请提供出生阳历日期，例如 --birth 1990-05-18");
  }

  validateTimeIndex(args.timeIndex, "--time");
  if (args.targetTimeIndex !== undefined) {
    validateTimeIndex(args.targetTimeIndex, "--targetTime");
  }

  if (!["男", "女"].includes(args.gender)) {
    throw new Error("--gender 只支持 男 或 女");
  }

  return args;
}

function toInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new Error(`${name} 必须是整数`);
  }
  return number;
}

function validateTimeIndex(value, name) {
  if (value < 0 || value > 12) {
    throw new Error(`${name} 必须在 0 到 12 之间`);
  }
}

function formatStars(stars) {
  if (!Array.isArray(stars) || stars.length === 0) return "无";
  return stars
    .filter(Boolean)
    .map((star) => {
      const mutagen = star.mutagen ? `化${star.mutagen}` : "";
      return [star.name, mutagen].filter(Boolean).join("");
    })
    .join("、") || "无";
}

function palaceNameAt(item) {
  return PALACE_NAMES[item?.index] ?? `第 ${item?.index} 宫`;
}

function summarizeItem(title, item) {
  if (!item) return [`${title}：无数据`];

  const lines = [
    `${title}：${item.name ?? ""}`,
    `  所在宫位：${palaceNameAt(item)}（索引 ${item.index}）`,
    `  干支：${item.heavenlyStem ?? ""}${item.earthlyBranch ?? ""}`,
    `  十二宫位：${Array.isArray(item.palaceNames) ? item.palaceNames.join("、") : "无"}`,
    `  四化：${Array.isArray(item.mutagen) ? item.mutagen.join("、") : "无"}`,
  ];

  if (Array.isArray(item.stars)) {
    lines.push("  流耀：");
    item.stars.forEach((stars, index) => {
      lines.push(`    ${PALACE_NAMES[index] ?? `第 ${index} 宫`}：${formatStars(stars)}`);
    });
  }

  return lines;
}

function buildResult(args) {
  const astrolabe = astro.astrolabeBySolarDate(
    args.birth,
    args.timeIndex,
    args.gender,
    args.fixLeap,
    args.language,
  );

  const horoscope = astrolabe.horoscope(args.target, args.targetTimeIndex);

  return {
    input: args,
    natal: {
      gender: astrolabe.gender,
      solarDate: astrolabe.solarDate,
      lunarDate: astrolabe.lunarDate,
      chineseDate: astrolabe.chineseDate,
      time: astrolabe.time,
      timeRange: astrolabe.timeRange,
      zodiac: astrolabe.zodiac,
      sign: astrolabe.sign,
      fiveElementsClass: astrolabe.fiveElementsClass,
      soulPalace: astrolabe.earthlyBranchOfSoulPalace,
      bodyPalace: astrolabe.earthlyBranchOfBodyPalace,
      soul: astrolabe.soul,
      body: astrolabe.body,
    },
    horoscope,
  };
}

function printSummary(result) {
  const { natal, horoscope } = result;

  const lines = [
    "本命信息",
    `  阳历：${natal.solarDate}`,
    `  农历：${natal.lunarDate}`,
    `  四柱：${natal.chineseDate}`,
    `  时辰：${natal.time}（${natal.timeRange}）`,
    `  生肖/星座：${natal.zodiac} / ${natal.sign}`,
    `  五行局：${natal.fiveElementsClass}`,
    `  命主/身主：${natal.soul} / ${natal.body}`,
    "",
    "运限信息",
    `  查询阳历：${horoscope.solarDate}`,
    `  查询农历：${horoscope.lunarDate}`,
    `  小限：${horoscope.age?.nominalAge ?? "未知"} 岁，${PALACE_NAMES[horoscope.age?.index] ?? "未知宫位"}`,
    "",
    ...summarizeItem("大限", horoscope.decadal),
    "",
    ...summarizeItem("流年", horoscope.yearly),
    "",
    ...summarizeItem("流月", horoscope.monthly),
    "",
    ...summarizeItem("流日", horoscope.daily),
    "",
    ...summarizeItem("流时", horoscope.hourly),
  ];

  console.log(lines.join("\n"));
}

function printHelp() {
  console.log(`用法：
  npm install
  node liu-yun.mjs --birth 1990-05-18 --time 5 --gender 男 --target 2026-05-19 --targetTime 6

参数：
  --birth       出生阳历日期，格式 YYYY-M-D，例如 1990-05-18
  --time        出生时辰索引，0~12。0=早子时，1=丑时，2=寅时 ... 12=晚子时
  --gender      性别：男 或 女，默认 男
  --target      要查询流年/流月/流日/流时的阳历日期，默认今天
  --targetTime  查询流时的时辰索引，0~12。不传时，iztro 会按 target 的小时推算
  --json        输出完整 JSON

时辰索引：
  0 早子时  1 丑时  2 寅时  3 卯时  4 辰时  5 巳时  6 午时
  7 未时    8 申时  9 酉时  10 戌时 11 亥时 12 晚子时`);
}

try {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const args = parseArgs(process.argv.slice(2));
  const result = buildResult(args);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printSummary(result);
  }
} catch (error) {
  console.error(`出错了：${error.message}`);
  console.error("");
  printHelp();
  process.exit(1);
}
