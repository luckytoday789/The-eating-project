const questions = [
  {
    id: "mood",
    stepLabel: "先听听心里怎么说",
    kicker: "第一签 · 心情",
    title: "今天是哪一种心情？",
    help: "跟着第一感觉选就好。",
    options: [
      { value: "bright", icon: "☀", title: "心情不错", note: "想把快乐加倍" },
      { value: "tired", icon: "☁", title: "有点疲惫", note: "需要被治愈" },
      { value: "blue", icon: "☂", title: "小小低落", note: "想被好好哄哄" },
      { value: "indecisive", icon: "✣", title: "选择困难", note: "交给饭签决定" },
    ],
  },
  {
    id: "body",
    stepLabel: "再问问身体的感觉",
    kicker: "第二签 · 状态",
    title: "身体今天想被怎样照顾？",
    help: "选一个最接近此刻的状态。",
    options: [
      { value: "normal", icon: "✦", title: "状态在线", note: "什么都能接住" },
      { value: "period", icon: "◒", title: "姨妈期", note: "想吃得舒服些" },
      { value: "weary", icon: "⌁", title: "身体有点乏", note: "需要补充能量" },
      { value: "sensitive", icon: "♨", title: "胃口有点弱", note: "想温柔地垫垫" },
    ],
  },
  {
    id: "craving",
    stepLabel: "味蕾已经有了暗示",
    kicker: "第三签 · 馋意",
    title: "此刻更想要哪种感觉？",
    help: "别想菜名，只选最馋的感觉。",
    options: [
      { value: "warm", icon: "♨", title: "暖乎乎", note: "一口下去就安心" },
      { value: "bold", icon: "♨", title: "重口过瘾", note: "香辣酸爽才满足" },
      { value: "fresh", icon: "❋", title: "清爽鲜亮", note: "轻松但不将就" },
      { value: "sweet", icon: "♡", title: "甜甜治愈", note: "今天值得一颗糖" },
    ],
  },
  {
    id: "hunger",
    stepLabel: "再看看胃口有多大",
    kicker: "第四签 · 分量",
    title: "今晚想吃到几分饱？",
    help: "选好分量，再看看今晚怎么解决。",
    options: [
      { value: "light", icon: "◡", title: "轻轻垫垫", note: "舒服就刚刚好" },
      { value: "normal", icon: "◐", title: "正常一餐", note: "认真吃顿饭" },
      { value: "hungry", icon: "●", title: "已经饿坏了", note: "要扎实有满足感" },
      { value: "together", icon: "∞", title: "想一起分享", note: "适合两个人慢慢吃" },
    ],
  },
  {
    id: "scene",
    stepLabel: "把南邮的现实也算进去",
    kicker: "第五签 · 方式",
    title: "今晚准备怎么解决？",
    help: "先按“南邮仙林校区”的校园生活场景给灵感。",
    options: [
      { value: "canteen", icon: "▦", title: "食堂顺手吃", note: "近一点，稳稳解决" },
      { value: "delivery", icon: "↘", title: "外卖到取餐点", note: "少走几步，轻松解决" },
      { value: "dorm", icon: "⌂", title: "宿舍省事吃", note: "热水冲泡、食堂打包都行" },
      { value: "outside", icon: "⌖", title: "出门逛一圈", note: "想吃点南京味" },
    ],
  },
];

const meals = [
  {
    id: "tomato-udon",
    name: "番茄肥牛乌冬",
    emoji: "🍅",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["period", "weary", "normal"],
    cravings: ["warm"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "normal",
    tagline: "酸甜、热乎，还有一大口踏实。",
    fortune: "宜加一颗溏心蛋",
    tone: "把疲惫稳稳接住",
  },
  {
    id: "porridge",
    name: "砂锅鲜虾粥",
    emoji: "🥣",
    moods: ["tired", "blue"],
    bodies: ["period", "sensitive", "weary"],
    cravings: ["warm", "fresh"],
    hunger: ["light", "normal"],
    scenes: ["delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "normal",
    tagline: "咕嘟咕嘟的热气，慢慢把人哄好。",
    fortune: "宜慢一点吃",
    tone: "温柔又不寡淡",
  },
  {
    id: "mushroom-noodle",
    name: "菌菇鸡汤面",
    emoji: "🍜",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["period", "sensitive", "weary"],
    cravings: ["warm"],
    hunger: ["light", "normal"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "low",
    effort: "low",
    wait: "fast",
    tagline: "清香的汤底，是今晚最安静的安慰。",
    fortune: "宜喝完最后一口汤",
    tone: "清清爽爽地回血",
  },
  {
    id: "coconut-chicken",
    name: "椰子鸡火锅",
    emoji: "🥥",
    moods: ["bright", "tired", "indecisive"],
    bodies: ["period", "weary", "normal"],
    cravings: ["warm", "fresh"],
    hunger: ["hungry", "together"],
    scenes: ["delivery", "outside"],
    cost: "high",
    effort: "high",
    wait: "patient",
    tagline: "清甜热汤配上喜欢的人，刚刚好。",
    fortune: "宜把第一碗汤留给她",
    tone: "舒服地分享一顿",
  },
  {
    id: "sukiyaki",
    name: "日式寿喜锅",
    emoji: "🍲",
    moods: ["bright", "blue", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["warm", "sweet"],
    hunger: ["hungry", "together"],
    scenes: ["delivery", "outside"],
    cost: "high",
    effort: "high",
    wait: "patient",
    tagline: "甜咸锅气里，藏着两个人的好心情。",
    fortune: "宜多煮一盘肥牛",
    tone: "把普通晚上变成约会",
  },
  {
    id: "hotpot",
    name: "自选麻辣烫",
    emoji: "🌶️",
    moods: ["bright", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["bold", "warm"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "mid",
    effort: "mid",
    wait: "normal",
    tagline: "想吃的都放进去，今天不做取舍。",
    fortune: "宜多夹一份土豆",
    tone: "热辣地重启心情",
  },
  {
    id: "kimchi-pot",
    name: "韩式部队锅",
    emoji: "🍲",
    moods: ["bright", "blue"],
    bodies: ["normal", "weary"],
    cravings: ["bold", "warm"],
    hunger: ["hungry", "together"],
    scenes: ["delivery", "outside"],
    cost: "high",
    effort: "high",
    wait: "patient",
    tagline: "热闹的一锅，专治今晚不够尽兴。",
    fortune: "宜加芝士与年糕",
    tone: "用热闹赶跑低气压",
  },
  {
    id: "beef-soup",
    name: "酸汤肥牛",
    emoji: "🍋",
    moods: ["bright", "tired", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["bold"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "normal",
    tagline: "酸香先醒胃，肥牛负责满足。",
    fortune: "宜拌一小碗米饭",
    tone: "利落地唤醒味蕾",
  },
  {
    id: "roast-meat",
    name: "炭火烤肉拼盘",
    emoji: "🥩",
    moods: ["bright", "blue"],
    bodies: ["normal", "weary"],
    cravings: ["bold"],
    hunger: ["hungry", "together"],
    scenes: ["outside"],
    cost: "high",
    effort: "high",
    wait: "patient",
    tagline: "滋啦一声，快乐就有了具体形状。",
    fortune: "宜把最好的一块夹给她",
    tone: "大口吃掉今天的辛苦",
  },
  {
    id: "hainan-chicken",
    name: "海南鸡饭",
    emoji: "🍚",
    moods: ["bright", "indecisive"],
    bodies: ["normal", "sensitive"],
    cravings: ["fresh"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "fast",
    tagline: "鸡肉嫩、米饭香，清爽却很有满足感。",
    fortune: "宜多蘸一点葱姜酱",
    tone: "不费力地吃好一餐",
  },
  {
    id: "pho",
    name: "越南牛肉粉",
    emoji: "🌿",
    moods: ["bright", "tired", "indecisive"],
    bodies: ["normal", "sensitive", "weary"],
    cravings: ["fresh", "warm"],
    hunger: ["light", "normal"],
    scenes: ["delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "normal",
    tagline: "清亮汤头和香草，把味觉轻轻叫醒。",
    fortune: "宜挤一瓣青柠",
    tone: "清透又有精神",
  },
  {
    id: "eel-rice",
    name: "蒲烧鳗鱼饭",
    emoji: "🍱",
    moods: ["blue", "tired", "bright"],
    bodies: ["normal", "weary"],
    cravings: ["sweet", "warm"],
    hunger: ["normal", "hungry"],
    scenes: ["delivery", "outside"],
    cost: "high",
    effort: "low",
    wait: "normal",
    tagline: "甜香酱汁裹住米饭，认真犒劳今天。",
    fortune: "宜一口鳗鱼一口饭",
    tone: "有分寸地奖励自己",
  },
  {
    id: "curry-omelette",
    name: "咖喱蛋包饭",
    emoji: "🍛",
    moods: ["blue", "tired", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["warm", "sweet"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "normal",
    tagline: "软软的蛋和浓浓的咖喱，是安心的味道。",
    fortune: "宜从蛋皮中间划开",
    tone: "把心情包得软乎乎",
  },
  {
    id: "salad-bowl",
    name: "牛油果鲜虾饭碗",
    emoji: "🥑",
    moods: ["bright", "indecisive"],
    bodies: ["normal", "sensitive"],
    cravings: ["fresh"],
    hunger: ["light", "normal"],
    scenes: ["delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "normal",
    tagline: "颜色明亮、口感丰富，轻盈也能很满足。",
    fortune: "宜淋一点焙煎芝麻汁",
    tone: "清爽地照顾自己",
  },
  {
    id: "xiaolongbao",
    name: "小笼包配甜豆浆",
    emoji: "🥟",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["period", "sensitive", "weary"],
    cravings: ["warm", "sweet"],
    hunger: ["light", "normal", "together"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "low",
    effort: "low",
    wait: "fast",
    tagline: "一笼热气和一杯甜，简单却很会安慰人。",
    fortune: "宜先开一扇小窗散热",
    tone: "用熟悉感安顿今晚",
  },
  {
    id: "pancake-dessert",
    name: "舒芙蕾松饼套餐",
    emoji: "🥞",
    moods: ["bright", "blue", "tired"],
    bodies: ["normal"],
    cravings: ["sweet"],
    hunger: ["light", "together"],
    scenes: ["delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "patient",
    tagline: "云朵一样软，今天可以先吃甜的。",
    fortune: "宜和她分最后一口",
    tone: "给心情补一点糖",
  },
  {
    id: "pumpkin-risotto",
    name: "南瓜奶油烩饭",
    emoji: "🎃",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["period", "sensitive", "weary"],
    cravings: ["warm", "sweet"],
    hunger: ["light", "normal"],
    scenes: ["delivery", "outside"],
    cost: "mid",
    effort: "low",
    wait: "normal",
    tagline: "绵软温热，像把晚餐盖上了一层小毯子。",
    fortune: "宜撒一点黑胡椒",
    tone: "软绵绵地被照顾",
  },
  {
    id: "seafood-paella",
    name: "海鲜焗饭",
    emoji: "🦐",
    moods: ["bright", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["fresh", "warm"],
    hunger: ["hungry", "together"],
    scenes: ["delivery", "outside"],
    cost: "high",
    effort: "low",
    wait: "patient",
    tagline: "金黄锅巴和海鲜香，适合庆祝平凡一天。",
    fortune: "宜挖到边缘的锅巴",
    tone: "认真制造一点仪式感",
  },
  {
    id: "duck-vermicelli",
    name: "鸭血粉丝汤配烧饼",
    emoji: "🦆",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["period", "weary", "normal"],
    cravings: ["warm", "bold"],
    hunger: ["light", "normal", "together"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "low",
    effort: "low",
    wait: "fast",
    local: true,
    tagline: "一碗南京热汤，粉丝滑溜，烧饼酥香。",
    fortune: "宜把烧饼掰进汤里一角",
    tone: "今晚吃一口南京",
  },
  {
    id: "pidu-noodle",
    name: "南京皮肚面",
    emoji: "🍜",
    moods: ["bright", "tired", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["warm", "bold"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "low",
    effort: "low",
    wait: "fast",
    local: true,
    tagline: "皮肚吸满汤汁，配菜热热闹闹，饱得很踏实。",
    fortune: "宜把辣油放在一边慢慢加",
    tone: "南京人的热乎满足",
  },
  {
    id: "beef-potstickers",
    name: "牛肉锅贴配小馄饨",
    emoji: "🥟",
    moods: ["bright", "blue", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["warm", "bold"],
    hunger: ["normal", "hungry", "together"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "low",
    effort: "low",
    wait: "normal",
    local: true,
    tagline: "一边焦脆，一边清汤，南京式的双重满足。",
    fortune: "宜把最后一只锅贴留给她",
    tone: "脆与软都不必取舍",
  },
  {
    id: "salted-duck-rice",
    name: "盐水鸭腿饭",
    emoji: "🍚",
    moods: ["bright", "indecisive"],
    bodies: ["normal", "weary", "sensitive"],
    cravings: ["fresh"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen", "delivery", "outside"],
    cost: "low",
    effort: "low",
    wait: "fast",
    local: true,
    tagline: "咸鲜鸭肉配热米饭，清爽但绝不敷衍。",
    fortune: "宜配一份清炒时蔬",
    tone: "南京味也可以很清爽",
  },
  {
    id: "instant-noodle",
    name: "泡面配卤蛋火腿",
    emoji: "🍜",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["warm", "bold"],
    hunger: ["normal", "hungry"],
    scenes: ["dorm"],
    cost: "low",
    effort: "low",
    wait: "fast",
    simple: true,
    tagline: "今晚不必隆重，一壶热水就能解决，热乎又够香。",
    fortune: "宜配现成卤蛋与即食海苔",
    tone: "把力气省下来也很好",
  },
  {
    id: "dipping-vegetables",
    name: "热乎蘸水菜拼盘",
    emoji: "🥬",
    moods: ["tired", "indecisive", "bright"],
    bodies: ["period", "sensitive", "normal", "weary"],
    cravings: ["fresh", "bold", "warm"],
    hunger: ["light", "normal", "together"],
    scenes: ["dorm"],
    cost: "low",
    effort: "mid",
    wait: "fast",
    simple: true,
    tagline: "从食堂打包蔬菜、豆腐和土豆，配一碗蘸水就很有滋味。",
    fortune: "宜多夹一块豆腐",
    tone: "简单，也要吃得有滋味",
  },
  {
    id: "quick-dumplings",
    name: "水饺配紫菜蛋花汤",
    emoji: "🥟",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["period", "sensitive", "weary", "normal"],
    cravings: ["warm", "fresh"],
    hunger: ["light", "normal", "hungry", "together"],
    scenes: ["dorm"],
    cost: "low",
    effort: "low",
    wait: "fast",
    simple: true,
    tagline: "从食堂一趟带回主食和热汤，省事但很完整。",
    fortune: "宜往汤里滴两滴香油",
    tone: "今晚只做最省力的选择",
  },
  {
    id: "tomato-egg-rice",
    name: "番茄鸡蛋盖饭",
    emoji: "🍅",
    moods: ["tired", "blue", "indecisive", "bright"],
    bodies: ["period", "sensitive", "weary", "normal"],
    cravings: ["warm", "sweet", "fresh"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen", "delivery", "dorm"],
    cost: "low",
    effort: "low",
    wait: "fast",
    simple: true,
    tagline: "熟悉的酸甜盖住热米饭，怎么吃都不会出错。",
    fortune: "宜多留一点汤汁拌饭",
    tone: "稳稳接住今天的普通一餐",
  },
  {
    id: "sesame-noodle",
    name: "麻酱拌面配黄瓜",
    emoji: "🥒",
    moods: ["bright", "tired", "indecisive"],
    bodies: ["normal", "weary"],
    cravings: ["bold", "fresh"],
    hunger: ["normal", "hungry"],
    scenes: ["dorm"],
    cost: "low",
    effort: "low",
    wait: "fast",
    simple: true,
    tagline: "买一份拌面，拌开麻酱和黄瓜，香得很直接。",
    fortune: "宜加一点醋和白芝麻",
    tone: "十分钟做出认真吃饭的样子",
  },
  {
    id: "sweet-oats",
    name: "热水燕麦杯配香蕉",
    emoji: "🥛",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["period", "sensitive", "weary", "normal"],
    cravings: ["sweet", "fresh", "warm"],
    hunger: ["light", "normal"],
    scenes: ["dorm"],
    cost: "low",
    effort: "low",
    wait: "fast",
    simple: true,
    tagline: "即食燕麦用热水泡开，香蕉自带甜味，没胃口也能慢慢吃。",
    fortune: "宜撒一小把坚果碎",
    tone: "今天就轻轻地照顾自己",
  },
  {
    id: "campus-combo",
    name: "食堂一荤两素",
    emoji: "🍱",
    moods: ["bright", "tired", "blue", "indecisive"],
    bodies: ["normal", "period", "weary", "sensitive"],
    cravings: ["warm", "fresh"],
    hunger: ["normal", "hungry"],
    scenes: ["canteen"],
    cost: "low",
    effort: "low",
    wait: "fast",
    campus: true,
    tagline: "不用研究菜单，荤素都有，端起餐盘就能踏实吃饭。",
    fortune: "宜把最喜欢的菜留到最后",
    tone: "仙林校园里的稳妥保底",
  },
  {
    id: "campus-wonton",
    name: "小馄饨配茶叶蛋",
    emoji: "🥣",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["period", "sensitive", "weary", "normal"],
    cravings: ["warm", "fresh"],
    hunger: ["light", "normal"],
    scenes: ["canteen", "delivery", "dorm", "outside"],
    cost: "low",
    effort: "low",
    wait: "fast",
    campus: true,
    tagline: "一碗热汤加一颗蛋，没力气时也能把胃安顿好。",
    fortune: "宜先喝两口汤",
    tone: "轻轻松松吃点热的",
  },
  {
    id: "campus-riceball",
    name: "饭团豆浆配茶叶蛋",
    emoji: "🍙",
    moods: ["bright", "tired", "indecisive"],
    bodies: ["normal", "weary", "sensitive"],
    cravings: ["warm", "fresh"],
    hunger: ["light", "normal"],
    scenes: ["canteen", "delivery", "dorm"],
    cost: "low",
    effort: "low",
    wait: "fast",
    campus: true,
    simple: true,
    tagline: "拿到就能吃，主食、蛋白质和热饮都没有落下。",
    fortune: "宜选一杯热豆浆",
    tone: "赶时间也不随便对付",
  },
  {
    id: "campus-bread-fruit",
    name: "面包牛奶水果组",
    emoji: "🥛",
    moods: ["tired", "blue", "indecisive"],
    bodies: ["normal", "weary", "sensitive"],
    cravings: ["sweet", "fresh"],
    hunger: ["light", "normal"],
    scenes: ["canteen", "delivery", "dorm"],
    cost: "low",
    effort: "low",
    wait: "fast",
    campus: true,
    simple: true,
    tagline: "完全不想折腾时，三样现成的小东西也能组成一餐。",
    fortune: "宜挑一个今天最想吃的水果",
    tone: "把吃饭这件事变简单",
  },
];

const bodyWarnings = {
  period: ["hotpot", "kimchi-pot", "beef-soup"],
  sensitive: ["hotpot", "kimchi-pot", "beef-soup", "roast-meat"],
};

const locationContext = {
  city: "南京",
  campus: "仙林校区",
  label: "南京邮电大学仙林校区",
  shortLabel: "南邮仙林校区",
  address: "文苑路 9 号",
};

const state = {
  step: 0,
  answers: {},
  currentMeal: null,
  alternatives: [],
  previousMeals: [],
  canReroll: true,
  isAdvancing: false,
};

const card = document.querySelector(".oracle-card");

function getOption(questionId, value) {
  return questions.find((question) => question.id === questionId)?.options.find((option) => option.value === value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSimpleChoices(question) {
  const selected = state.answers[question.id];
  return `
    <div class="choice-grid" role="radiogroup" aria-label="${escapeHtml(question.title)}">
      ${question.options.map((option) => `
        <button
          class="choice${selected === option.value ? " selected" : ""}"
          type="button"
          role="radio"
          data-answer="${option.value}"
          aria-checked="${selected === option.value}"
        >
          <span class="choice-icon" aria-hidden="true">${option.icon}</span>
          <span><b>${escapeHtml(option.title)}</b><small>${escapeHtml(option.note)}</small></span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderQuestion() {
  const question = questions[state.step];
  const progress = ((state.step + 1) / questions.length) * 100;
  state.isAdvancing = false;

  card.className = "oracle-card";
  card.innerHTML = `
    <div class="progress-head">
      <button class="back-button" type="button" ${state.step === 0 ? "disabled" : ""} aria-label="返回上一问">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
      </button>
      <span class="step-count">${String(state.step + 1).padStart(2, "0")} / ${String(questions.length).padStart(2, "0")}</span>
      <span class="step-label">${escapeHtml(question.stepLabel)}</span>
    </div>
    <div
      class="progress-track"
      role="progressbar"
      aria-label="问答进度"
      aria-valuemin="1"
      aria-valuemax="${questions.length}"
      aria-valuenow="${state.step + 1}"
    ><span style="width: ${progress}%"></span></div>
    <div class="question-pane question-enter">
      <p class="question-kicker">${escapeHtml(question.kicker)}</p>
      <h2 tabindex="-1">${escapeHtml(question.title)}</h2>
      <p class="question-help">${escapeHtml(question.help)}</p>
      ${renderSimpleChoices(question)}
    </div>
    <p class="auto-advance-note">点一下选项，就会自动继续</p>
  `;
}

function scoreMeal(meal) {
  let score = Math.random() * 1.7;
  if (meal.moods.includes(state.answers.mood)) score += 2.2;
  if (meal.bodies.includes(state.answers.body)) score += 3.1;
  if (meal.cravings.includes(state.answers.craving)) score += 4.2;
  if (meal.hunger.includes(state.answers.hunger)) score += 2.4;
  if (meal.scenes.includes(state.answers.scene)) score += 5.4;
  if (meal.local) score += state.answers.scene === "outside" ? 2.2 : 1.2;
  if (state.answers.hunger === "together" && meal.hunger.includes("together")) score += 1.6;
  if (bodyWarnings[state.answers.body]?.includes(meal.id)) score -= 4.8;
  if (state.previousMeals.includes(meal.id)) score -= 2.6;
  return score;
}

function pickMeals() {
  const warnings = bodyWarnings[state.answers.body] ?? [];
  const candidates = meals.filter((meal) => (
    meal.scenes.includes(state.answers.scene)
    && !warnings.includes(meal.id)
  ));

  const withoutCurrent = candidates.filter((meal) => meal.id !== state.currentMeal?.id);
  const eligibleMeals = withoutCurrent.length ? withoutCurrent : candidates;
  const ranked = eligibleMeals
    .map((meal) => ({ meal, score: scoreMeal(meal) }))
    .sort((a, b) => b.score - a.score);
  const cravingRanked = ranked.filter((item) => item.meal.cravings.includes(state.answers.craving));
  const primaryRanked = cravingRanked.length ? cravingRanked : ranked;

  const topPool = primaryRanked.slice(0, 4);
  const weighted = topPool.map((item, index) => ({ ...item, weight: 4 - index }));
  const weightTotal = weighted.reduce((total, item) => total + item.weight, 0);
  let roll = Math.random() * weightTotal;
  let picked = weighted[0].meal;

  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) {
      picked = item.meal;
      break;
    }
  }

  state.currentMeal = picked;
  const primaryIds = new Set(primaryRanked.map((item) => item.meal.id));
  const alternativeSource = [
    ...primaryRanked,
    ...ranked.filter((item) => !primaryIds.has(item.meal.id)),
  ];
  state.alternatives = alternativeSource
    .filter((item) => item.meal.id !== picked.id)
    .slice(0, 3)
    .map((item) => item.meal);
  state.previousMeals = [picked.id, ...state.previousMeals].slice(0, 4);
  state.canReroll = candidates.length > 1;
  return true;
}

function buildReason(meal) {
  const pieces = [];
  const mood = state.answers.mood;
  const body = state.answers.body;
  const craving = getOption("craving", state.answers.craving)?.title;
  const scene = getOption("scene", state.answers.scene)?.title;
  const hunger = getOption("hunger", state.answers.hunger)?.title;
  const matchesBody = meal.bodies.includes(body);
  const matchesCraving = meal.cravings.includes(state.answers.craving);
  const matchesHunger = meal.hunger.includes(state.answers.hunger);

  if (meal.local) pieces.push(`你在${locationContext.shortLabel}，今晚选的是“${scene}”，饭签特意从容易实现的南京味里挑`);
  else if (meal.campus) pieces.push(`你在${locationContext.shortLabel}，今晚选的是“${scene}”，饭签先从校园里的稳妥选择中挑`);
  else if (meal.simple) pieces.push(`今晚选的是“${scene}”，饭签先把费时费力的做法都划掉了`);
  else pieces.push(`你在${locationContext.shortLabel}，今晚选的是“${scene}”，这份饭更容易实现`);

  if (matchesHunger) pieces.push(`它也接得住你想要的“${hunger}”`);
  else pieces.push(`分量可以按你想要的“${hunger}”灵活加减`);

  if (mood === "tired") pieces.push("你今天有点累，需要一顿不费力的安慰");
  if (mood === "blue") pieces.push("低落的时候，熟悉的香气会更有拥抱感");
  if (mood === "bright") pieces.push("好心情值得用一顿有满足感的饭继续加码");
  if (mood === "indecisive") pieces.push("既然不想做选择，就让最合拍的味道先站出来");

  if (body === "period" && matchesBody) pieces.push("你把状态标成姨妈期，这次也更照顾“想舒服一点”的偏好");
  if (body === "period" && !matchesBody) pieces.push("你把状态标成姨妈期，所以饭签避开了这套菜单里偏刺激的几类选择");
  if (body === "sensitive" && matchesBody) pieces.push("胃口有点弱，所以这次更看重温和与好入口");
  if (body === "sensitive" && !matchesBody) pieces.push("胃口有点弱，所以饭签避开了这套菜单里偏刺激的几类选择");
  if (body === "weary") pieces.push("身体有点乏，今晚适合吃得踏实一点");
  if (body === "normal" && mood === "indecisive") pieces.push("状态在线，可以放心把选择交给饭签");

  if (matchesCraving) pieces.push(`再加上它正好命中你想要的“${craving}”，${meal.name}就成了今晚的上上签`);
  else pieces.push(`它虽然不是最典型的“${craving}”，但综合今晚的场景与状态，仍然是很稳的一签`);
  return pieces.join("；") + "。";
}

function renderResult() {
  const meal = state.currentMeal;
  const sealNumber = String(meals.findIndex((item) => item.id === meal.id) + 1).padStart(2, "0");
  const scene = getOption("scene", state.answers.scene);

  card.className = "oracle-card result-card";
  card.innerHTML = `
    <div class="result-visual">
      <img src="./assets/food-oracle.svg" alt="夜色里一份热气腾腾的料理，像一支发光的饭签" />
      <div class="result-shade"></div>
      <div class="result-seal"><span>第 ${sealNumber} 支</span><b>今日饭签</b></div>
      <button class="restart-icon" type="button" aria-label="重新回答">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6M20 20v-6h-6"/><path d="M5.1 15a8 8 0 0 0 13.3 2.7M18.9 9A8 8 0 0 0 5.6 6.3"/></svg>
      </button>
    </div>
    <div class="result-body result-enter">
      <div class="result-context" aria-label="本次饭签的位置与场景">
        <span><b aria-hidden="true">⌖</b>${escapeHtml(locationContext.label)}</span>
        <span>${escapeHtml(scene.title)}</span>
        ${meal.local ? "<span>南京味</span>" : ""}
        ${meal.campus ? "<span>校园保底</span>" : ""}
        ${meal.simple ? "<span>省事吃</span>" : ""}
      </div>
      <div class="result-title-row">
        <div>
          <p class="question-kicker">${escapeHtml(meal.tone)}</p>
          <h2 tabindex="-1">${escapeHtml(meal.name)}</h2>
        </div>
        <span class="meal-emoji" aria-hidden="true">${meal.emoji}</span>
      </div>
      <p class="result-tagline">${escapeHtml(meal.tagline)}</p>
      <div class="fortune-line"><span aria-hidden="true">✦</span>${escapeHtml(meal.fortune)}</div>
      <div class="why-box">
        <span>为什么是它</span>
        <p>${escapeHtml(buildReason(meal))}</p>
      </div>
      <div class="alternatives">
        <span class="alternatives-label">如果还想看看</span>
        <div class="alternative-list">
          ${state.alternatives.map((alternative) => `
            <button type="button" data-alternative="${alternative.id}">
              <span aria-hidden="true">${alternative.emoji}</span>${escapeHtml(alternative.name)}
            </button>
          `).join("")}
        </div>
      </div>
      <div class="result-actions">
        <button class="reroll-button" type="button" ${state.canReroll ? "" : "disabled"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7L20 14"/><path d="M20 5v6h-6"/></svg>
          再抽一次
        </button>
        <button class="accept-button" type="button">就吃这个 <span aria-hidden="true">→</span></button>
      </div>
      <p class="health-note">基于仙林校区与校园常见餐食给灵感，不代表实时门店、价格、库存或送达时间。如需加热，请只使用宿舍允许的设备。</p>
    </div>
  `;

  requestAnimationFrame(() => card.querySelector("h2")?.focus({ preventScroll: true }));
}

function renderAccepted() {
  const meal = state.currentMeal;
  const scene = getOption("scene", state.answers.scene);
  card.className = "oracle-card accepted-card";
  card.innerHTML = `
    <div class="accepted-visual">
      <img src="./assets/food-oracle.svg" alt="一份在夜色里发光的热腾腾料理" />
      <div class="accepted-glow" aria-hidden="true"></div>
    </div>
    <div class="accepted-body result-enter">
      <span class="accepted-mark" aria-hidden="true">✓</span>
      <p class="question-kicker">${escapeHtml(locationContext.shortLabel)} · ${escapeHtml(scene.title)} · 今晚就这么定啦</p>
      <h2 tabindex="-1">${escapeHtml(meal.name)}</h2>
      <p>${escapeHtml(meal.tagline)}<br />别再纠结，趁热去吃吧。</p>
      <div class="accepted-actions">
        <button class="reroll-button accepted-reroll" type="button">临时反悔，再抽一次</button>
        <button class="reset-button" type="button">重新走一遍五步占卜</button>
      </div>
    </div>
  `;
  requestAnimationFrame(() => card.querySelector("h2")?.focus({ preventScroll: true }));
}

function resetExperience() {
  state.step = 0;
  state.answers = {};
  state.currentMeal = null;
  state.alternatives = [];
  state.previousMeals = [];
  state.canReroll = true;
  state.isAdvancing = false;
  renderQuestion();
}

function chooseAlternative(mealId) {
  const nextMeal = meals.find((meal) => meal.id === mealId);
  if (!nextMeal) return;
  const previous = state.currentMeal;
  state.currentMeal = nextMeal;
  state.alternatives = [previous, ...state.alternatives.filter((meal) => meal.id !== mealId)].slice(0, 3);
  renderResult();
}

card.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-answer]");
  if (choice) {
    if (state.isAdvancing) return;
    const question = questions[state.step];
    state.answers[question.id] = choice.dataset.answer;
    state.isAdvancing = true;
    card.querySelectorAll("[data-answer]").forEach((button) => {
      const isSelected = button === choice;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-checked", String(isSelected));
      button.disabled = !isSelected;
    });
    card.querySelector(".auto-advance-note").textContent = state.step === questions.length - 1
      ? "收到，正在为你抽签…"
      : "收到，下一问…";
    setTimeout(() => {
      if (state.step < questions.length - 1) {
        state.step += 1;
        renderQuestion();
      } else {
        pickMeals();
        renderResult();
      }
      requestAnimationFrame(() => card.querySelector("h2")?.focus({ preventScroll: true }));
    }, 180);
    return;
  }

  if (event.target.closest(".back-button")) {
    if (state.step > 0) {
      state.step -= 1;
      renderQuestion();
      requestAnimationFrame(() => card.querySelector("h2")?.focus({ preventScroll: true }));
    }
    return;
  }

  if (event.target.closest(".reroll-button")) {
    pickMeals();
    renderResult();
    return;
  }

  if (event.target.closest(".accept-button")) {
    renderAccepted();
    return;
  }

  if (event.target.closest(".restart-icon") || event.target.closest(".reset-button")) {
    resetExperience();
    return;
  }

  const alternative = event.target.closest("[data-alternative]");
  if (alternative) chooseAlternative(alternative.dataset.alternative);
});

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  const enumFor = (questionId) => questions.find((question) => question.id === questionId).options.map((option) => option.value);
  const tool = {
    name: "draw_meal_fortune",
    title: "抽取今日饭签",
    description: "结合南邮仙林校区场景，根据心情、身体状态、口味和饭量抽一份轻松好选的餐食推荐。",
    inputSchema: {
      type: "object",
      properties: {
        mood: { type: "string", description: "她今天的心情", enum: enumFor("mood") },
        body: { type: "string", description: "她此刻希望怎样照顾身体", enum: enumFor("body") },
        craving: { type: "string", description: "此刻最想要的口味感觉", enum: enumFor("craving") },
        hunger: { type: "string", description: "这一餐想吃到几分饱", enum: enumFor("hunger") },
        scene: { type: "string", description: "在南邮仙林校区打算怎样解决这一餐", enum: enumFor("scene") },
      },
      required: ["mood", "body", "craving", "hunger", "scene"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      const valid = questions.every((question) => question.options.some((option) => option.value === input?.[question.id]));
      if (!valid) throw new TypeError("饭签参数不完整或不在可选范围内");
      state.answers = {
        mood: input.mood,
        body: input.body,
        craving: input.craving,
        hunger: input.hunger,
        scene: input.scene,
      };
      state.step = questions.length - 1;
      pickMeals();
      renderResult();
      return {
        meal: state.currentMeal.name,
        tagline: state.currentMeal.tagline,
        fortune: state.currentMeal.fortune,
        reason: buildReason(state.currentMeal),
        location: locationContext.label,
        scene: getOption("scene", state.answers.scene).title,
        alternatives: state.alternatives.map((meal) => meal.name),
      };
    },
  };

  try {
    void Promise.resolve(context.registerTool(tool)).catch(() => {});
  } catch {
    // The visible experience remains fully functional when WebMCP is unavailable.
  }
}

renderQuestion();
registerWebMcpTools();

