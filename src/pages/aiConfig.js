// aiConfig.js

export const aiAvatars = {
  "林怡君": "/avatars/g01.gif",
  "張雅婷": "/avatars/g02.gif",
  "思妤": "/avatars/g03.gif",
  "黃彥廷": "/avatars/b01.gif",
  "隨風飛揚": "/avatars/b02.gif",
  "家瑋": "/avatars/b03.gif",
  "李佩珊": "/avatars/g04.gif",
  "蔡承翰": "/avatars/b04.gif",
  "婷x2": "/avatars/g05.gif",
  "周俊宏": "/avatars/b05.gif",
  "詩與遠方": "/avatars/g06.gif",
  "鄭宇翔": "/avatars/b06.gif",
  "郭心怡的朋友": "/avatars/g07.gif",
  "江柏翰": "/avatars/b07.gif",
  "小龍女": "/avatars/g08.gif",
  "神鍵墨客": "/avatars/b08.gif",
};

export const aiProfiles = {
  "林怡君": {
    color: "purple",
    phrases: ["真的", "有趣", "好"],
    templates: [
      "我覺得 {lastUser} 說的很有趣",
      "你們知道嗎？我最近發現了……",
      "對啊，我也這麼想"
    ],
    level: 5,
    gender: "女",
    job: "社群行銷",
    avatar: aiAvatars["林怡君"]
  },
  "張雅婷": {
    color: "pink",
    phrases: ["哇", "耶", "真的假的"],
    templates: [
      "我剛剛在想 {lastUser} 的話題",
      "這件事真有趣",
      "你們覺得呢"
    ],
    level: 8,
    gender: "女",
    job: "學生",
    avatar: aiAvatars["張雅婷"]
  },
  "思妤": {
    color: "violet",
    phrases: ["好酷", "有趣", "哈哈"],
    templates: [
      "{lastUser} 這樣說很有道理",
      "我也想分享一下",
      "這個話題太棒了"
    ],
    level: 13,
    gender: "女",
    job: "喜劇演員",
    avatar: aiAvatars["思妤"]
  },
  "黃彥廷": {
    color: "green",
    phrases: ["不錯", "真的", "你說"],
    templates: [
      "{lastUser} 的意思是……",
      "我也想說同樣的事",
      "我沒想到這點"
    ],
    level: 15,
    gender: "男",
    job: "律師",
    avatar: aiAvatars["黃彥廷"]
  },
  "隨風飛揚": {
    color: "blue",
    phrases: ["好", "對", "哈哈"],
    templates: [
      "我剛剛想到了 {lastUser} 說的事",
      "大家有什麼想法",
      "這個話題太棒了"
    ],
    level: 17,
    gender: "男",
    job: "大學生",
    avatar: aiAvatars["隨風飛揚"]
  },
  "家瑋": {
    color: "teal",
    phrases: ["不錯", "好", "嗯"],
    templates: [
      "{lastUser} 說的真有趣",
      "我也想分享我的看法",
      "這真的很有趣"
    ],
    level: 20,
    gender: "男",
    job: "心理諮商師",
    avatar: aiAvatars["家瑋"]
  },
  "李佩珊": {
    color: "orange",
    phrases: ["真的", "嗯", "哈哈"],
    templates: [
      "我覺得 {lastUser} 講得很棒",
      "你們知道嗎，我最近發現……",
      "這個話題讓我想到一件事"
    ],
    level: 22,
    gender: "女",
    job: "業務專員",
    avatar: aiAvatars["李佩珊"]
  },
  "蔡承翰": {
    color: "cyan",
    phrases: ["好", "XD", "哈哈"],
    templates: [
      "{lastUser} 說得有意思",
      "我也想補充一下",
      "大家覺得呢"
    ],
    level: 25,
    gender: "男",
    job: "工程師",
    avatar: aiAvatars["蔡承翰"]
  },
  "婷x2": {
    color: "magenta",
    phrases: ["嗯", "好", "真的"],
    templates: [
      "我覺得 {lastUser} 說得很有趣",
      "這件事太棒了",
      "你們有什麼想法呢"
    ],
    level: 31,
    gender: "女",
    job: "老師",
    avatar: aiAvatars["婷x2"]
  },
  "周俊宏": {
    color: "red",
    phrases: ["哈哈", "XD", "不錯"],
    templates: [
      "我剛剛在想 {lastUser} 的話題",
      "這件事真的很有趣",
      "大家覺得呢"
    ],
    level: 32,
    gender: "男",
    job: "主持人",
    avatar: aiAvatars["周俊宏"]
  },
  "詩與遠方": {
    color: "teal",
    phrases: ["好", "嗯", "對"],
    templates: [
      "{lastUser} 說的太對了",
      "我也有同感",
      "這個話題好好玩"
    ],
    level: 40,
    gender: "女",
    job: "作家",
    avatar: aiAvatars["詩與遠方"]
  },
  "鄭宇翔": {
    color: "purple",
    phrases: ["XD", "哈哈", "真的"],
    templates: [
      "我覺得 {lastUser} 的想法很棒",
      "大家有什麼想法",
      "這個話題太有趣了"
    ],
    level: 45,
    gender: "男",
    job: "資料分析師",
    avatar: aiAvatars["鄭宇翔"]
  },
  "郭心怡的朋友": {
    color: "pink",
    phrases: ["好", "哈哈", "嗯"],
    templates: [
      "{lastUser} 說得太棒了",
      "我也想補充一下",
      "這件事真有趣"
    ],
    level: 47,
    gender: "女",
    job: "幼教老師",
    avatar: aiAvatars["郭心怡的朋友"]
  },
  "江柏翰": {
    color: "blue",
    phrases: ["XD", "真的", "哈哈"],
    templates: [
      "我剛剛在想 {lastUser} 的話題",
      "大家覺得呢",
      "這個話題太好玩了"
    ],
    level: 48,
    gender: "男",
    job: "軟體工程師",
    avatar: aiAvatars["江柏翰"]
  },
  "小龍女": {
    color: "pink",
    phrases: ["哈哈", "好", "XD"],
    templates: [
      "我剛剛在想 {lastUser} 說的事",
      "你們覺得呢",
      "這個話題好有趣"
    ],
    level: 49,
    gender: "女",
    job: "記者",
    avatar: aiAvatars["小龍女"]
  },
  "神鍵墨客": {
    color: "green",
    phrases: ["XD", "哈哈", "不錯"],
    templates: [
      "{lastUser} 說的很有趣",
      "我也想分享一下",
      "這件事真的很棒"
    ],
    level: 50,
    gender: "男",
    job: "健身教練",
    avatar: aiAvatars["神鍵墨客"]
  }
};
