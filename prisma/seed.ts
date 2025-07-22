import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_USER_ID = "YOUR_TEST_USER_ID_HERE";

async function main() {
  console.log(`Start seeding for user: ${TEST_USER_ID}`);

  console.log(`Deleting existing decks for user ${TEST_USER_ID}...`);
  await prisma.deck.deleteMany({
    where: {
      userId: TEST_USER_ID,
    },
  });
  console.log("Existing decks deleted.");

  // --- サンプルデッキ1: TOEIC頻出単語 (15枚) ---
  await prisma.deck.create({
    data: {
      name: "TOEIC頻出英単語",
      description: "Part 1の写真描写問題でよく出る単語とフレーズを集めました。",
      userId: TEST_USER_ID,
      cards: {
        create: [
          {
            front: "The man is mowing the lawn.",
            back: "男性が芝を刈っている。",
          },
          {
            front: "A vendor is arranging items on a cart.",
            back: "露天商がカートの商品を並べている。",
          },
          {
            front: "Pedestrians are crossing the street at the crosswalk.",
            back: "歩行者が横断歩道で通りを渡っている。",
          },
          {
            front: "A man is leaning against a railing.",
            back: "男性が手すりに寄りかかっている。",
          },
          {
            front: "She's adjusting her glasses.",
            back: "彼女はメガネの位置を直している。",
          },
          { front: "They are shaking hands.", back: "彼らは握手をしている。" },
          {
            front: "A boat is docked at the pier.",
            back: "ボートが桟橋に停泊している。",
          },
          {
            front: "He is pointing at a chart.",
            back: "彼は図を指差している。",
          },
          {
            front: "Some documents are scattered on the table.",
            back: "書類がテーブルの上に散らばっている。",
          },
          {
            front: "A crowd has gathered to watch a performance.",
            back: "観衆がパフォーマンスを見るために集まっている。",
          },
          {
            front: "She is watering the plants.",
            back: "彼女は植物に水をやっている。",
          },
          { front: "A car is being towed.", back: "車が牽引されている。" },
          {
            front: "They are seated opposite each other.",
            back: "彼らは向かい合って座っている。",
          },
          {
            front: "A ladder is propped up against the wall.",
            back: "はしごが壁に立てかけられている。",
          },
          {
            front: "He is wearing a safety helmet.",
            back: "彼は安全ヘルメットを着用している。",
          },
        ],
      },
    },
  });

  // --- サンプルデッキ2: 旅行で使える実践フレーズ (15枚) ---
  await prisma.deck.create({
    data: {
      name: "旅行で使える実践フレーズ",
      description: "空港やホテル、レストランで役立つ短い会話集です。",
      userId: TEST_USER_ID,
      cards: {
        create: [
          {
            front: "Could I have the menu, please?",
            back: "メニューをいただけますか？",
          },
          {
            front: "Do you have any recommendations?",
            back: "何かおすすめはありますか？",
          },
          { front: "The bill, please.", back: "お会計をお願いします。" },
          { front: "How much is this?", back: "これはいくらですか？" },
          { front: "I'll take this one.", back: "これをください。" },
          {
            front: "Do you accept credit cards?",
            back: "クレジットカードは使えますか？",
          },
          {
            front: "Where is the nearest subway station?",
            back: "最寄りの地下鉄の駅はどこですか？",
          },
          {
            front: "Can you show me on the map?",
            back: "地図で示してもらえますか？",
          },
          {
            front: "I have a reservation under the name Shibuya.",
            back: "渋谷という名前で予約しています。",
          },
          {
            front: "What time is check-out?",
            back: "チェックアウトは何時ですか？",
          },
          { front: "A table for two, please.", back: "2名席をお願いします。" },
          { front: "Is the tip included?", back: "チップは含まれていますか？" },
          {
            front: "I'm just looking, thanks.",
            back: "見ているだけです、ありがとう。",
          },
          {
            front: "Could you take a picture for us?",
            back: "私たちの写真を撮っていただけますか？",
          },
          {
            front: "I'm allergic to peanuts.",
            back: "ピーナッツアレルギーです。",
          },
        ],
      },
    },
  });

  // --- サンプルデッキ3: イマージョン学習で見つけたフレーズ (30枚) ---
  await prisma.deck.create({
    data: {
      name: "動画コンテンツからのイマージョンフレーズ",
      description:
        "海外の動画やニュースを見ていて気になった、ネイティブがよく使う表現集。",
      userId: TEST_USER_ID,
      cards: {
        create: [
          {
            front: "You know what? I think I'm gonna call it a night.",
            back: "あのさ、もう今日はこの辺で終わりにしようと思う。",
          },
          {
            front: "That's a bit of a stretch, don't you think?",
            back: "それはちょっと大げさじゃない？／無理があるんじゃない？",
          },
          {
            front: "I'm on the fence about it.",
            back: "それについては、まだ決めかねているんだ。（どちらにしようか迷っている）",
          },
          {
            front: "Let's just play it by ear.",
            back: "成り行きに任せよう。／その場の状況で決めよう。",
          },
          {
            front: "He really gets on my nerves.",
            back: "彼には本当にイライラさせられる。",
          },
          {
            front: "Long story short, we missed the flight.",
            back: "手短に言うと、飛行機に乗り遅れたんだ。",
          },
          { front: "You can say that again!", back: "全くその通りだ！" },
          {
            front: "It's not rocket science.",
            back: "そんなに難しいことじゃないよ。",
          },
          {
            front: "I'm feeling a bit under the weather.",
            back: "ちょっと体調が悪いんだ。",
          },
          {
            front: "That costs an arm and a leg.",
            back: "それはものすごく値段が高い。",
          },
          {
            front: "Don't jump to conclusions.",
            back: "早とちりしないで。／結論を急がないで。",
          },
          {
            front: "I'll give you the benefit of the doubt.",
            back: "今回は信じてあげるよ。（疑わしいけど、一応信じる）",
          },
          {
            front: "He's just pulling your leg.",
            back: "彼は君をからかっているだけだよ。",
          },
          {
            front: "It turned out to be a blessing in disguise.",
            back: "結果的に、それは不幸中の幸いだった。",
          },
          {
            front: "We'll cross that bridge when we come to it.",
            back: "その問題はその時が来たら考えよう。",
          },
          {
            front: "I'm all ears.",
            back: "ぜひ聞かせて。（全身を耳にして聞いています）",
          },
          { front: "That's the last straw.", back: "もう我慢の限界だ。" },
          {
            front: "To make matters worse, it started to rain.",
            back: "さらに悪いことに、雨が降り始めた。",
          },
          {
            front: "We're back to square one.",
            back: "振り出しに戻ってしまった。",
          },
          { front: "It's a piece of cake.", back: "楽勝だよ。／朝飯前だよ。" },
          { front: "Let's get the ball rolling.", back: "さあ、始めようか。" },
          {
            front: "I'm swamped with work this week.",
            back: "今週は仕事でめちゃくちゃ忙しいんだ。",
          },
          {
            front: "Can we take a rain check?",
            back: "またの機会にしてもらえる？（延期したい）",
          },
          {
            front: "He's the spitting image of his father.",
            back: "彼はお父さんにそっくりだ。",
          },
          {
            front: "It's on the tip of my tongue.",
            back: "喉まで出かかっているんだけど、思い出せない。",
          },
          {
            front: "Don't beat around the bush.",
            back: "遠回しに言わないで。／はっきり言って。",
          },
          {
            front: "I think we're on the same page.",
            back: "私たちは同じ意見のようだね。",
          },
          {
            front: "That's easier said than done.",
            back: "言うは易く行うは難しだね。",
          },
          {
            front: "Let's call it a day.",
            back: "今日はこの辺で終わりにしよう。",
          },
          {
            front: "It's a win-win situation.",
            back: "誰にとっても得な状況だね。",
          },
        ],
      },
    },
  });

  // --- サンプルデッキ4: ポッドキャストで見つけたイディオム (5枚) ---
  await prisma.deck.create({
    data: {
      name: "ポッドキャストで見つけたイディオム",
      description:
        "英語のポッドキャストを聞いていて気になった、日常会話で使えるイディオム集。",
      userId: TEST_USER_ID,
      cards: {
        create: [
          {
            front: "It's not my cup of tea.",
            back: "それは私の好みではありません。",
          },
          {
            front: "He spilled the beans.",
            back: "彼が秘密を漏らしてしまった。",
          },
          {
            front: "Break a leg!",
            back: "頑張ってね！（舞台に出る人などへの応援）",
          },
          {
            front: "It's raining cats and dogs.",
            back: "土砂降りの雨が降っている。",
          },
          { front: "Bite the bullet.", back: "困難な状況に耐える／我慢する。" },
        ],
      },
    },
  });

  // --- サンプルデッキ5: Common English Phrasal Verbs (15枚) ---
  await prisma.deck.create({
    data: {
      name: "Common English Phrasal Verbs",
      description:
        "A collection of frequently used phrasal verbs for daily conversation.",
      userId: TEST_USER_ID,
      cards: {
        create: [
          {
            front: "She decided to give up smoking.",
            back: "To stop doing something.",
          },
          {
            front: "He pointed out the mistake in the report.",
            back: "To draw attention to something.",
          },
          {
            front: "We need to look into this issue more carefully.",
            back: "To investigate or examine.",
          },
          {
            front: "The meeting was called off due to the storm.",
            back: "To cancel something.",
          },
          {
            front: "I'll pick you up at 7 PM.",
            back: "To collect someone in a vehicle.",
          },
          {
            front: "Can you fill out this form?",
            back: "To complete a form with information.",
          },
          {
            front: "He came up with a great idea.",
            back: "To think of or suggest an idea.",
          },
          {
            front: "I'm looking forward to the weekend.",
            back: "To feel excited about something in the future.",
          },
          {
            front: "She takes after her mother.",
            back: "To resemble a family member.",
          },
          {
            front: "We ran out of milk this morning.",
            back: "To use all of something and have none left.",
          },
          {
            front: "Please turn down the music.",
            back: "To reduce the volume.",
          },
          {
            front: "He brought up an interesting point during the discussion.",
            back: "To start talking about a particular subject.",
          },
          {
            front: "I get along with my colleagues.",
            back: "To have a friendly relationship with someone.",
          },
          {
            front: "You should back up your important files.",
            back: "To make a copy of information.",
          },
          {
            front: "The company had to lay off 50 employees.",
            back: "To stop employing someone, usually because there is no work for them.",
          },
        ],
      },
    },
  });

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
