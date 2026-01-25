// MongoDB script to update image URLs to local paths
// Run with: node update_image_urls.js

require('dotenv').config({ path: '../../.env.local' });
const { MongoClient } = require('mongodb');

const updates = [
  {
    "name": "African Elephant",
    "old_url": "https://pngimg.com/uploads/elephants/elephants_PNG18776.png",
    "new_url": "/images/animals/african-elephant.png"
  },
  {
    "name": "African Lion",
    "old_url": "https://png.pngtree.com/png-clipart/20230507/ourmid/pngtree-big-lion-walking-wild-cat-png-image_7088507.png",
    "new_url": "/images/animals/african-lion.png"
  },
  {
    "name": "African Wild Dog",
    "old_url": "https://static.vecteezy.com/system/resources/previews/068/743/693/non_2x/african-wild-dog-lycaon-pictus-isolated-on-transparent-background-endangered-painted-wolf-png.png",
    "new_url": "/images/animals/african-wild-dog.png"
  },
  {
    "name": "Albatross",
    "old_url": "https://png.pngtree.com/png-vector/20240607/ourmid/pngtree-albatross-isolated-on-transparent-background-png-image_12622698.png",
    "new_url": "/images/animals/albatross.png"
  },
  {
    "name": "Alligator",
    "old_url": "https://pngimg.com/d/crocodile_PNG13185.png",
    "new_url": "/images/animals/alligator.png"
  },
  {
    "name": "Alpaca",
    "old_url": "https://png.pngtree.com/png-vector/20250530/ourmid/pngtree-alpaca-isolated-on-a-transparent-background-png-image_16414654.png",
    "new_url": "/images/animals/alpaca.png"
  },
  {
    "name": "Anaconda",
    "old_url": "https://pngimg.com/uploads/anaconda/anaconda_PNG12.png",
    "new_url": "/images/animals/anaconda.png"
  },
  {
    "name": "Anglerfish",
    "old_url": "https://static.vecteezy.com/system/resources/previews/030/723/796/non_2x/angler-fish-isolated-on-a-transparent-background-free-png.png",
    "new_url": "/images/animals/anglerfish.png"
  },
  {
    "name": "Anteater",
    "old_url": "https://png.pngtree.com/png-clipart/20250606/original/pngtree-walking-an-anteater-animal-png-image_21128272.png",
    "new_url": "/images/animals/anteater.png"
  },
  {
    "name": "Arctic Fox",
    "old_url": "https://png.pngtree.com/png-clipart/20231008/original/pngtree-arctic-fox-transparent-background-png-image_13290621.png",
    "new_url": "/images/animals/arctic-fox.png"
  },
  {
    "name": "Arctic Wolf",
    "old_url": "https://png.pngtree.com/png-clipart/20240520/original/pngtree-an-arctic-wolf-transparent-background-png-image_15139629.png",
    "new_url": "/images/animals/arctic-wolf.png"
  },
  {
    "name": "Armadillo",
    "old_url": "https://stickypng.com/wp-content/uploads/2023/07/5c7f956c72f5d9028c17ecb1.png",
    "new_url": "/images/animals/armadillo.png"
  },
  {
    "name": "Army Ant",
    "old_url": "https://png.pngtree.com/png-clipart/20240731/original/pngtree-3d-army-ant-isolated-on-solid-transparent-background-ai-generative-png-image_15670375.png",
    "new_url": "/images/animals/army-ant.png"
  },
  {
    "name": "Axolotl",
    "old_url": "https://png.pngtree.com/png-vector/20240717/ourmid/pngtree-axolotl-on-white-background-png-image_13135659.png",
    "new_url": "/images/animals/axolotl.png"
  },
  {
    "name": "Badger",
    "old_url": "https://upload.wikimedia.org/wikipedia/commons/6/66/Animals_png_set_by_mossi889-d4uye4q_-_Badger.png",
    "new_url": "/images/animals/badger.png"
  },
  {
    "name": "Bald Eagle",
    "old_url": "https://www.nicepng.com/png/full/2-21156_bald-eagle-png-background-image-bald-eagle-transparent.png",
    "new_url": "/images/animals/bald-eagle.png"
  },
  {
    "name": "Barn Owl",
    "old_url": "https://static.vecteezy.com/system/resources/previews/043/988/968/non_2x/close-up-portrait-of-a-barn-owl-against-transparent-background-png.png",
    "new_url": "/images/animals/barn-owl.png"
  },
  {
    "name": "Barracuda",
    "old_url": "https://png.pngtree.com/png-clipart/20250628/original/pngtree-barracuda-isolated-on-a-transparent-background-png-image_21240516.png",
    "new_url": "/images/animals/barracuda.png"
  },
  {
    "name": "Beaver",
    "old_url": "https://png.pngtree.com/png-vector/20240809/ourmid/pngtree-the-industrious-life-of-beavers-amazing-facts-about-png-image_13420997.png",
    "new_url": "/images/animals/beaver.png"
  },
  {
    "name": "Beluga Whale",
    "old_url": "https://png.pngtree.com/png-vector/20240205/ourmid/pngtree-beluga-whale-sealife-png-image_11621534.png",
    "new_url": "/images/animals/beluga-whale.png"
  },
  {
    "name": "Bighorn Sheep",
    "old_url": "https://static.vecteezy.com/system/resources/previews/054/590/008/non_2x/ram-with-big-horns-on-transparent-background-free-png.png",
    "new_url": "/images/animals/bighorn-sheep.png"
  },
  {
    "name": "Black Bear",
    "old_url": "https://png.pngtree.com/png-vector/20240203/ourmid/pngtree-black-bear-cub-isolated-3d-rendering-png-image_11533156.png",
    "new_url": "/images/animals/black-bear.png"
  },
  {
    "name": "Black Mamba",
    "old_url": "https://png.pngtree.com/png-clipart/20241011/original/pngtree-a-beautiful-black-mamba-snake-reptile-on-transparent-png-image_16272393.png",
    "new_url": "/images/animals/black-mamba.png"
  },
  {
    "name": "Black Panther",
    "old_url": "https://png.pngtree.com/png-clipart/20231007/ourmid/pngtree-black-panther-in-ferocious-display-on-a-clear-transparent-background-png-image_10195947.png",
    "new_url": "/images/animals/black-panther.png"
  },
  {
    "name": "Black Rhinoceros",
    "old_url": "https://www.nicepng.com/png/full/278-2781004_rhinoceros-png-clip-art-black-rhinoceros-for-the.png",
    "new_url": "/images/animals/black-rhinoceros.png"
  },
  {
    "name": "Black Widow",
    "old_url": "https://png.pngtree.com/png-clipart/20241117/original/pngtree-black-widow-spider-clipart-illustration-high-quality-graphic-png-image_17160500.png",
    "new_url": "/images/animals/black-widow.png"
  },
  {
    "name": "Blue Whale",
    "old_url": "https://static.vecteezy.com/system/resources/previews/054/809/536/non_2x/blue-whale-isolated-on-the-transparent-background-marine-creature-free-png.png",
    "new_url": "/images/animals/blue-whale.png"
  },
  {
    "name": "Boa Constrictor",
    "old_url": "https://png.pngtree.com/png-clipart/20241011/original/pngtree-beautiful-boa-constrictor-snake-on-transparent-background-png-image_16272415.png",
    "new_url": "/images/animals/boa-constrictor.png"
  },
  {
    "name": "Bobcat",
    "old_url": "https://png.pngtree.com/png-clipart/20241110/original/pngtree-view-of-wild-bobcat-transparent-background-png-image_16827981.png",
    "new_url": "/images/animals/bobcat.png"
  },
  {
    "name": "Bongo",
    "old_url": "https://png.pngtree.com/png-clipart/20241106/original/pngtree-transparent-bongo-cat-png-image_16691817.png",
    "new_url": "/images/animals/bongo.png"
  },
  {
    "name": "Bottlenose Dolphin",
    "old_url": "https://png.pngtree.com/png-vector/20240531/ourmid/pngtree-playful-cartoon-blue-atlantic-bottlenose-dolphin-png-image_12579985.png",
    "new_url": "/images/animals/bottlenose-dolphin.png"
  },
  {
    "name": "Box Jellyfish",
    "old_url": "https://static.vecteezy.com/system/resources/previews/056/402/503/non_2x/box-jellyfish-isolated-on-a-transparent-background-png.png",
    "new_url": "/images/animals/box-jellyfish.png"
  },
  {
    "name": "Bull Shark",
    "old_url": "https://png.pngtree.com/png-clipart/20250417/original/pngtree-bull-shark-fish-isolated-on-transparent-background-png-image_20716697.png",
    "new_url": "/images/animals/bull-shark.png"
  },
  {
    "name": "Bullet Ant",
    "old_url": "https://static.vecteezy.com/system/resources/thumbnails/050/760/407/small/macro-photography-of-a-black-ant-on-a-transparent-background-png.png",
    "new_url": "/images/animals/bullet-ant.png"
  },
  {
    "name": "Bullfrog",
    "old_url": "https://png.pngtree.com/png-clipart/20240901/original/pngtree-bullfrog-sitting-png-image_15906776.png",
    "new_url": "/images/animals/bullfrog.png"
  },
  {
    "name": "Camel",
    "old_url": "https://upload.wikimedia.org/wikipedia/commons/3/34/Transparent_Background_Dromedary_Camel.png",
    "new_url": "/images/animals/camel.png"
  },
  {
    "name": "Camel Spider",
    "old_url": "https://upload.wikimedia.org/wikipedia/commons/7/78/Ammotrecha_itzaana_4414721993.png",
    "new_url": "/images/animals/camel-spider.png"
  },
  {
    "name": "Cape Buffalo",
    "old_url": "https://static.vecteezy.com/system/resources/previews/066/397/223/non_2x/isolated-african-buffalo-image-in-format-on-transparent-background-for-editing-purposes-png.png",
    "new_url": "/images/animals/cape-buffalo.png"
  },
  {
    "name": "Capuchin Monkey",
    "old_url": "https://static.vecteezy.com/system/resources/previews/048/947/305/non_2x/capuchin-monkey-on-a-transparent-background-png.png",
    "new_url": "/images/animals/capuchin-monkey.png"
  },
  {
    "name": "Capybara",
    "old_url": "https://png.pngtree.com/png-clipart/20250106/original/pngtree-capybara-isolated-on-transparent-background-png-image_20109760.png",
    "new_url": "/images/animals/capybara.png"
  },
  {
    "name": "Caracal",
    "old_url": "https://png.pngtree.com/png-clipart/20250131/original/pngtree-caracal-isolated-on-transparent-background-png-image_20109761.png",
    "new_url": "/images/animals/caracal.png"
  },
  {
    "name": "Cassowary",
    "old_url": "https://png.pngtree.com/png-clipart/20250306/original/pngtree-cassowary-bird-with-a-distinctive-helmet-like-crown-walking-in-its-png-image_20583525.png",
    "new_url": "/images/animals/cassowary.png"
  },
  {
    "name": "Chameleon",
    "old_url": "https://png.pngtree.com/png-clipart/20230506/original/pngtree-isolated-colorfull-chameleon-stand-on-branch-transparent-png-image_9145544.png",
    "new_url": "/images/animals/chameleon.png"
  },
  {
    "name": "Cheetah",
    "old_url": "https://png.pngtree.com/png-clipart/20231003/original/pngtree-cheetah-png-with-ai-generated-png-image_13245678.png",
    "new_url": "/images/animals/cheetah.png"
  },
  {
    "name": "Chimpanzee",
    "old_url": "https://pngimg.com/d/monkey_PNG18738.png",
    "new_url": "/images/animals/chimpanzee.png"
  },
  {
    "name": "Clouded Leopard",
    "old_url": "https://png.pngtree.com/png-vector/20250513/ourmid/pngtree-playful-white-clouded-leopard-cub-for-wildlife-graphics-png-image_16251416.png",
    "new_url": "/images/animals/clouded-leopard.png"
  },
  {
    "name": "Cockatoo",
    "old_url": "https://png.pngtree.com/png-clipart/20231110/original/pngtree-cockatoo-full-body-png-image_13524811.png",
    "new_url": "/images/animals/cockatoo.png"
  },
  {
    "name": "Coconut Crab",
    "old_url": "https://png.pngtree.com/png-clipart/20241002/original/pngtree-crab-playing-with-coconut-png-image_16159600.png",
    "new_url": "/images/animals/coconut-crab.png"
  },
  {
    "name": "Colossal Squid",
    "old_url": "https://png.pngtree.com/png-vector/20220609/ourmid/pngtree-white-background-wordcard-design-featuring-a-giant-squid-vector-png-image_37153242.png",
    "new_url": "/images/animals/colossal-squid.png"
  },
  {
    "name": "Condor",
    "old_url": "https://static.vecteezy.com/system/resources/thumbnails/052/264/639/small_2x/front-view-andean-condor-is-spreading-its-wings-and-flying-isolated-on-a-transparent-background-png.png",
    "new_url": "/images/animals/condor.png"
  },
  {
    "name": "Cougar",
    "old_url": "https://static.vecteezy.com/system/resources/thumbnails/053/573/098/small/a-cougar-sitting-on-a-transparent-background-png.png",
    "new_url": "/images/animals/cougar.png"
  },
  {
    "name": "Coyote",
    "old_url": "https://png.pngtree.com/png-vector/20240628/ourmid/pngtree-jackal-or-coyote-animal-on-a-transparent-background-png-image_12912471.png",
    "new_url": "/images/animals/coyote.png"
  },
  {
    "name": "Crow",
    "old_url": "https://pngimg.com/d/crow_PNG3094.png",
    "new_url": "/images/animals/crow.png"
  },
  {
    "name": "Cuttlefish",
    "old_url": "https://png.pngtree.com/png-vector/20240913/ourmid/pngtree-cuttlefish-side-view-transparent-background-png-image_13823624.png",
    "new_url": "/images/animals/cuttlefish.png"
  },
  {
    "name": "Deathstalker Scorpion",
    "old_url": "https://www.nicepng.com/png/full/26-261547_poisonous-scorpion-png-transparent-image-deathstalker-scorpion.png",
    "new_url": "/images/animals/deathstalker-scorpion.png"
  },
  {
    "name": "Dhole",
    "old_url": "https://png.pngtree.com/png-vector/20250204/ourmid/pngtree-dhole-also-known-as-the-asiatic-wild-dog-png-image_15384095.png",
    "new_url": "/images/animals/dhole.png"
  },
  {
    "name": "Dingo",
    "old_url": "https://static.vecteezy.com/system/resources/previews/051/666/305/non_2x/dingo-side-view-isolated-on-transparent-background-png.png",
    "new_url": "/images/animals/dingo.png"
  },
  {
    "name": "Donkey",
    "old_url": "https://png.pngtree.com/png-vector/20250101/ourmid/pngtree-donkey-isolated-on-white-headstrong-farm-animal-with-domestic-mammal-look-png-image_14874365.png",
    "new_url": "/images/animals/donkey.png"
  },
  {
    "name": "Dragonfly",
    "old_url": "https://png.pngtree.com/png-vector/20240129/ourmid/pngtree-dragonfly-png-with-ai-generated-png-image_11564530.png",
    "new_url": "/images/animals/dragonfly.png"
  },
  {
    "name": "Electric Eel",
    "old_url": "https://png.pngtree.com/png-clipart/20250809/original/pngtree-electric-eel-isolated-on-a-transparent-background-png-image_21207328.png",
    "new_url": "/images/animals/electric-eel.png"
  },
  {
    "name": "Elk",
    "old_url": "https://png.pngtree.com/png-clipart/20241121/original/pngtree-elk-png-image_17283230.png",
    "new_url": "/images/animals/elk.png"
  },
  {
    "name": "Emperor Penguin",
    "old_url": "https://png.pngtree.com/png-clipart/20240514/original/pngtree-emperor-penguin-isolated-on-transparent-background-png-image_15084756.png",
    "new_url": "/images/animals/emperor-penguin.png"
  },
  {
    "name": "Emperor Scorpion",
    "old_url": "https://png.pngtree.com/png-clipart/20230912/original/pngtree-emperor-scorpion-white-background-picture-image_13031791.png",
    "new_url": "/images/animals/emperor-scorpion.png"
  },
  {
    "name": "Emu",
    "old_url": "https://png.pngtree.com/png-vector/20250228/ourmid/pngtree-emu-bird-png-image_15612249.png",
    "new_url": "/images/animals/emu.png"
  },
  {
    "name": "Fennec Fox",
    "old_url": "https://png.pngtree.com/png-clipart/20231008/original/pngtree-fennec-fox-transparent-background-png-image_13290629.png",
    "new_url": "/images/animals/fennec-fox.png"
  },
  {
    "name": "Ferret",
    "old_url": "https://pngimg.com/uploads/ferret/ferret_PNG17112.png",
    "new_url": "/images/animals/ferret.png"
  },
  {
    "name": "Flamingo",
    "old_url": "https://pngimg.com/d/flamingo_PNG15093.png",
    "new_url": "/images/animals/flamingo.png"
  },
  {
    "name": "Flying Squirrel",
    "old_url": "https://png.pngtree.com/png-vector/20231114/ourmid/pngtree-sugarglider-flying-squirrel-png-image_10584524.png",
    "new_url": "/images/animals/flying-squirrel.png"
  },
  {
    "name": "Gaboon Viper",
    "old_url": "https://png.pngtree.com/png-clipart/20250415/original/pngtree-high-quality-3d-gaboon-viper-snake-model-with-transparent-background-png-image_20683578.png",
    "new_url": "/images/animals/gaboon-viper.png"
  },
  {
    "name": "Galapagos Tortoise",
    "old_url": "https://png.pngtree.com/png-clipart/20250518/original/pngtree-galapagos-giant-tortoise-on-transparent-background-png-image_21021132.png",
    "new_url": "/images/animals/galapagos-tortoise.png"
  },
  {
    "name": "Gazelle",
    "old_url": "https://www.pngmart.com/files/3/Gazelle-PNG-Transparent-Image.png",
    "new_url": "/images/animals/gazelle.png"
  },
  {
    "name": "Gecko",
    "old_url": "https://png.pngtree.com/png-vector/20250611/ourmid/pngtree-leopard-gecko-isolated-on-a-transparent-background-png-image_16518730.png",
    "new_url": "/images/animals/gecko.png"
  },
  {
    "name": "Giant Centipede",
    "old_url": "https://pngimg.com/d/centipede_PNG2.png",
    "new_url": "/images/animals/giant-centipede.png"
  },
  {
    "name": "Giant Squid",
    "old_url": "https://png.pngtree.com/png-clipart/20230814/original/pngtree-white-background-wordcard-design-featuring-a-giant-squid-vector-picture-image_10677754.png",
    "new_url": "/images/animals/giant-squid.png"
  },
  {
    "name": "Gibbon",
    "old_url": "https://png.pngtree.com/png-clipart/20231005/ourmid/pngtree-hoolock-gibbon-transparent-background-png-image_10193781.png",
    "new_url": "/images/animals/gibbon.png"
  },
  {
    "name": "Gila Monster",
    "old_url": "https://png.pngtree.com/png-clipart/20230912/original/pngtree-gila-monster-looking-picture-image_13031491.png",
    "new_url": "/images/animals/gila-monster.png"
  },
  {
    "name": "Giraffe",
    "old_url": "https://static.vecteezy.com/system/resources/previews/024/280/390/non_2x/giraffe-isolate-on-transparent-background-ai-generated-free-png.png",
    "new_url": "/images/animals/giraffe.png"
  },
  {
    "name": "Golden Eagle",
    "old_url": "https://static.vecteezy.com/system/resources/previews/047/554/734/non_2x/golden-eagle-isolated-on-transparent-background-free-png.png",
    "new_url": "/images/animals/golden-eagle.png"
  },
  {
    "name": "Goliath Birdeater",
    "old_url": "https://png.pngtree.com/png-clipart/20231101/original/pngtree-goliath-birdeater-colorful-endangered-photo-png-image_13482039.png",
    "new_url": "/images/animals/goliath-birdeater.png"
  },
  {
    "name": "Goose",
    "old_url": "https://png.pngtree.com/png-vector/20231020/ourmid/pngtree-watercolor-goose-clip-art-png-image_10298313.png",
    "new_url": "/images/animals/goose.png"
  },
  {
    "name": "Gorilla",
    "old_url": "https://pngimg.com/d/gorilla_PNG18709.png",
    "new_url": "/images/animals/gorilla.png"
  },
  {
    "name": "Gray Wolf",
    "old_url": "https://png.pngtree.com/png-vector/20240512/ourmid/pngtree-a-lone-wolf-stands-amidst-vast-emptiness-silent-sentinel-in-world-png-image_12439843.png",
    "new_url": "/images/animals/gray-wolf.png"
  },
  {
    "name": "Great Horned Owl",
    "old_url": "https://png.pngtree.com/png-clipart/20240722/original/pngtree-great-horned-owl-on-transparent-background-png-image_15609436.png",
    "new_url": "/images/animals/great-horned-owl.png"
  },
  {
    "name": "Great White Shark",
    "old_url": "https://png.pngtree.com/png-clipart/20241110/original/pngtree-great-white-shark-transparent-background-png-image_16826884.png",
    "new_url": "/images/animals/great-white-shark.png"
  },
  {
    "name": "Green Anaconda",
    "old_url": "https://static.vecteezy.com/system/resources/previews/059/466/540/non_2x/illustration-of-a-coiled-green-anaconda-with-spots-and-tongue-protruding-on-a-plain-background-transparent-background-free-png.png",
    "new_url": "/images/animals/green-anaconda.png"
  },
  {
    "name": "Grizzly Bear",
    "old_url": "https://png.pngtree.com/png-clipart/20240323/original/pngtree-grizzly-bear-png-png-image_14655347.png",
    "new_url": "/images/animals/grizzly-bear.png"
  },
  {
    "name": "Guanaco",
    "old_url": "https://static.vecteezy.com/system/resources/thumbnails/062/810/553/small/fluffy-guanaco-standing-profile-cut-out-transparent-png.png",
    "new_url": "/images/animals/guanaco.png"
  },
  {
    "name": "Hammerhead Shark",
    "old_url": "https://static.vecteezy.com/system/resources/previews/053/237/878/non_2x/hammerhead-shark-isolated-on-transparent-background-png.png",
    "new_url": "/images/animals/hammerhead-shark.png"
  },
  {
    "name": "Harpy Eagle",
    "old_url": "https://png.pngtree.com/png-vector/20240920/ourmid/pngtree-harpy-eagle-flying-with-transparent-background-png-image_13877939.png",
    "new_url": "/images/animals/harpy-eagle.png"
  },
  {
    "name": "Hedgehog",
    "old_url": "https://static.vecteezy.com/system/resources/previews/048/720/340/non_2x/hedgehog-animal-isolated-on-transparent-background-free-png.png",
    "new_url": "/images/animals/hedgehog.png"
  },
  {
    "name": "Hellbender",
    "old_url": "https://png.pngtree.com/png-vector/20250614/ourmid/pngtree-japanese-giant-salamander-isolated-on-a-transparent-background-png-image_16536523.png",
    "new_url": "/images/animals/hellbender.png"
  },
  {
    "name": "Hercules Beetle",
    "old_url": "https://png.pngtree.com/png-clipart/20250520/original/pngtree-png-hercules-beetle-vintage-insect-illustration-by-george-edwards-png-image_21035889.png",
    "new_url": "/images/animals/hercules-beetle.png"
  },
  {
    "name": "Hippopotamus",
    "old_url": "https://png.pngtree.com/png-clipart/20230529/original/pngtree-hippo-isolated-on-transparent-background-png-image_9173057.png",
    "new_url": "/images/animals/hippopotamus.png"
  },
  {
    "name": "Hornet",
    "old_url": "https://png.pngtree.com/png-clipart/20240520/original/pngtree-an-asian-giant-hornet-on-transparent-background-png-image_15139707.png",
    "new_url": "/images/animals/hornet.png"
  },
  {
    "name": "Howler Monkey",
    "old_url": "https://png.pngtree.com/png-vector/20250601/ourmid/pngtree-monkey-isolated-on-a-transparent-background-png-image_16442751.png",
    "new_url": "/images/animals/howler-monkey.png"
  },
  {
    "name": "Hummingbird",
    "old_url": "https://png.pngtree.com/png-vector/20230903/ourmid/pngtree-hummingbird-colibri-png-image_9953519.png",
    "new_url": "/images/animals/hummingbird.png"
  },
  {
    "name": "Huntsman Spider",
    "old_url": "https://static.vecteezy.com/system/resources/thumbnails/049/667/702/small/a-huntsman-spider-with-transparent-background-showing-its-eight-legs-and-three-eyes-on-a-black-background-png.png",
    "new_url": "/images/animals/huntsman-spider.png"
  },
  {
    "name": "Hyena",
    "old_url": "https://png.pngtree.com/png-clipart/20220707/ourmid/pngtree-affrican-spotted-hyena-transparent-png-picture-png-image_5732585.png",
    "new_url": "/images/animals/hyena.png"
  },
  {
    "name": "Ibex",
    "old_url": "https://png.pngtree.com/png-vector/20240819/ourmid/pngtree-a-image-of-ibex-png-image_13538242.png",
    "new_url": "/images/animals/ibex.png"
  },
  {
    "name": "Iguana",
    "old_url": "https://png.pngtree.com/png-vector/20250622/ourmid/pngtree-green-iguana-isolated-on-transparent-background-png-image_16570506.png",
    "new_url": "/images/animals/iguana.png"
  },
  {
    "name": "Impala",
    "old_url": "https://png.pngtree.com/png-clipart/20231119/original/pngtree-adult-male-impala-isolated-africa-photo-png-image_13643700.png",
    "new_url": "/images/animals/impala.png"
  },
  {
    "name": "Jackal",
    "old_url": "https://upload.wikimedia.org/wikipedia/commons/0/0a/Dogs%2C_jackals%2C_wolves%2C_and_foxes_BHL19827472_white_background.png",
    "new_url": "/images/animals/jackal.png"
  },
  {
    "name": "Jaguar",
    "old_url": "https://pngimg.com/d/jaguar_PNG20746.png",
    "new_url": "/images/animals/jaguar.png"
  },
  {
    "name": "Japanese Macaque",
    "old_url": "https://png.pngtree.com/png-vector/20250606/ourmid/pngtree-seated-japanese-macaque-png-image_16462905.png",
    "new_url": "/images/animals/japanese-macaque.png"
  },
  {
    "name": "Kangaroo",
    "old_url": "https://static.vecteezy.com/system/resources/previews/023/839/454/non_2x/kangaroo-isolated-on-a-transparent-background-free-png.png",
    "new_url": "/images/animals/kangaroo.png"
  },
  {
    "name": "King Cobra",
    "old_url": "https://png.pngtree.com/png-clipart/20250703/original/pngtree-king-cobra-isolated-on-a-transparent-background-png-image_21231602.png",
    "new_url": "/images/animals/king-cobra.png"
  },
  {
    "name": "King Crab",
    "old_url": "https://png.pngtree.com/png-vector/20240729/ourmid/pngtree-alaskan-king-crab-png-image_13272819.png",
    "new_url": "/images/animals/king-crab.png"
  },
  {
    "name": "Kiwi",
    "old_url": "https://pngimg.com/d/kiwi_bird_PNG10.png",
    "new_url": "/images/animals/kiwi.png"
  },
  {
    "name": "Koala",
    "old_url": "https://pngimg.com/d/koala_PNG114262.png",
    "new_url": "/images/animals/koala.png"
  },
  {
    "name": "Komodo Dragon",
    "old_url": "https://png.pngtree.com/png-clipart/20241011/original/pngtree-beautiful-komodo-dragon-on-transparent-background-png-image_16273109.png",
    "new_url": "/images/animals/komodo-dragon.png"
  },
  {
    "name": "Kookaburra",
    "old_url": "https://png.pngtree.com/png-vector/20240509/ourmid/pngtree-a-laughing-kookaburra-up-close-against-a-dark-green-png-image_12387079.png",
    "new_url": "/images/animals/kookaburra.png"
  },
  {
    "name": "Kudu",
    "old_url": "https://png.pngtree.com/png-clipart/20240418/original/pngtree-greater-kudu-animal-character-png-image_14877772.png",
    "new_url": "/images/animals/kudu.png"
  },
  {
    "name": "Leatherback Sea Turtle",
    "old_url": "https://png.pngtree.com/png-vector/20250618/ourmid/pngtree-leatherback-sea-turtle-isolated-on-a-transparent-background-png-image_16546811.png",
    "new_url": "/images/animals/leatherback-sea-turtle.png"
  },
  {
    "name": "Leopard",
    "old_url": "https://pngimg.com/d/leopard_PNG14827.png",
    "new_url": "/images/animals/leopard.png"
  },
  {
    "name": "Lionfish",
    "old_url": "https://static.vecteezy.com/system/resources/previews/042/840/741/non_2x/lion-fish-on-transparent-background-png.png",
    "new_url": "/images/animals/lionfish.png"
  },
  {
    "name": "Llama",
    "old_url": "https://png.pngtree.com/png-clipart/20250528/original/pngtree-llama-isolated-on-a-transparent-background-png-image_21085769.png",
    "new_url": "/images/animals/llama.png"
  },
  {
    "name": "Lobster",
    "old_url": "https://pngimg.com/d/lobster_PNG14234.png",
    "new_url": "/images/animals/lobster.png"
  },
  {
    "name": "Lynx",
    "old_url": "https://pngimg.com/uploads/lynx/lynx_PNG3.png",
    "new_url": "/images/animals/lynx.png"
  },
  {
    "name": "Macaw",
    "old_url": "https://png.pngtree.com/png-clipart/20230429/ourmid/pngtree-isolated-scarlet-macaw-parrot-flying-on-transparent-png-image_6745591.png",
    "new_url": "/images/animals/macaw.png"
  },
  {
    "name": "Magpie",
    "old_url": "https://static.vecteezy.com/system/resources/previews/054/572/793/non_2x/black-and-white-magpie-perched-attentively-isolated-on-transparent-background-free-png.png",
    "new_url": "/images/animals/magpie.png"
  },
  {
    "name": "Manatee",
    "old_url": "https://png.pngtree.com/png-vector/20240717/ourmid/pngtree-manatee-on-a-transparent-background-png-image_13128953.png",
    "new_url": "/images/animals/manatee.png"
  },
  {
    "name": "Mandrill",
    "old_url": "https://png.pngtree.com/png-clipart/20250606/original/pngtree-mandrill-monkey-png-image_21132782.png",
    "new_url": "/images/animals/mandrill.png"
  },
  {
    "name": "Maned Wolf",
    "old_url": "https://www.vhv.rs/dpng/d/477-4778323_transparent-wolf-png-maned-wolf-no-background-png.png",
    "new_url": "/images/animals/maned-wolf.png"
  },
  {
    "name": "Manta Ray",
    "old_url": "https://png.pngtree.com/png-clipart/20250714/original/pngtree-manta-ray-isolated-on-a-transparent-background-png-image_21296254.png",
    "new_url": "/images/animals/manta-ray.png"
  },
  {
    "name": "Mantis Shrimp",
    "old_url": "https://png.pngtree.com/png-clipart/20231120/original/pngtree-mantis-shrimp-fresh-mantis-photo-png-image_13658294.png",
    "new_url": "/images/animals/mantis-shrimp.png"
  },
  {
    "name": "Marlin",
    "old_url": "https://png.pngtree.com/png-clipart/20240923/original/pngtree-beautiful-blue-marlin-on-transparent-background-png-image_16075083.png",
    "new_url": "/images/animals/marlin.png"
  },
  {
    "name": "Meerkat",
    "old_url": "https://static.vecteezy.com/system/resources/previews/056/249/040/non_2x/meerkat-on-transparent-background-free-png.png",
    "new_url": "/images/animals/meerkat.png"
  },
  {
    "name": "Megalodon",
    "old_url": "https://png.pngtree.com/png-clipart/20231115/original/pngtree-megalodon-on-white-gigantic-picture-image_13263250.png",
    "new_url": "/images/animals/megalodon.png"
  },
  {
    "name": "Monarch Butterfly",
    "old_url": "https://png.pngtree.com/png-clipart/20240819/original/pngtree-monarch-butterfly-transparent-png-image_15804597.png",
    "new_url": "/images/animals/monarch-butterfly.png"
  },
  {
    "name": "Mongoose",
    "old_url": "https://png.pngtree.com/png-vector/20241231/ourmid/pngtree-mongoose-image-png-image_15001548.png",
    "new_url": "/images/animals/mongoose.png"
  },
  {
    "name": "Monitor Lizard",
    "old_url": "https://static.vecteezy.com/system/resources/previews/050/246/382/non_2x/monitor-lizard-illustration-on-transparent-background-free-png.png",
    "new_url": "/images/animals/monitor-lizard.png"
  },
  {
    "name": "Moose",
    "old_url": "https://png.pngtree.com/png-vector/20230928/ourmid/pngtree-wild-moose-color-drawn-png-image_10149505.png",
    "new_url": "/images/animals/moose.png"
  },
  {
    "name": "Moray Eel",
    "old_url": "https://png.pngtree.com/png-clipart/20250704/original/pngtree-green-moray-eel-isolated-on-a-transparent-background-png-image_21220581.png",
    "new_url": "/images/animals/moray-eel.png"
  },
  {
    "name": "Mountain Goat",
    "old_url": "https://png.pngtree.com/png-clipart/20240903/original/pngtree-mountain-goat-png-image_15925012.png",
    "new_url": "/images/animals/mountain-goat.png"
  },
  {
    "name": "Naked Mole Rat",
    "old_url": "https://png.pngtree.com/png-vector/20220706/ourmid/pngtree-cartoon-naked-mole-rat-smiling-png-image_5763603.png",
    "new_url": "/images/animals/naked-mole-rat.png"
  },
  {
    "name": "Narwhal",
    "old_url": "https://png.pngtree.com/png-clipart/20240831/original/pngtree-narwhal-illustration-png-image_15898276.png",
    "new_url": "/images/animals/narwhal.png"
  },
  {
    "name": "Nautilus",
    "old_url": "https://png.pngtree.com/png-vector/20231015/ourmid/pngtree-nautilus-cartoon-shell-png-image_10164548.png",
    "new_url": "/images/animals/nautilus.png"
  },
  {
    "name": "Ocelot",
    "old_url": "https://png.pngtree.com/png-clipart/20241102/original/pngtree-cute-ocelot-isolated-on-white-background-png-image_16606654.png",
    "new_url": "/images/animals/ocelot.png"
  },
  {
    "name": "Octopus",
    "old_url": "https://png.pngtree.com/png-vector/20240207/ourmid/pngtree-octopus-sealife-animal-png-image_11711694.png",
    "new_url": "/images/animals/octopus.png"
  },
  {
    "name": "Okapi",
    "old_url": "https://png.pngtree.com/png-vector/20240923/ourmid/pngtree-okapi-animal-on-transparent-background-png-image_13887806.png",
    "new_url": "/images/animals/okapi.png"
  },
  {
    "name": "Opossum",
    "old_url": "https://png.pngtree.com/png-vector/20231019/ourmid/pngtree-possum-on-branch-png-image_10216004.png",
    "new_url": "/images/animals/opossum.png"
  },
  {
    "name": "Orangutan",
    "old_url": "https://pngimg.com/d/orangutan_PNG24.png",
    "new_url": "/images/animals/orangutan.png"
  },
  {
    "name": "Orca",
    "old_url": "https://pngimg.com/d/killer_whale_PNG21.png",
    "new_url": "/images/animals/orca.png"
  },
  {
    "name": "Oryx",
    "old_url": "https://png.pngtree.com/png-vector/20250210/ourmid/pngtree-arabian-oryx-in-format-with-transparent-background-1-png-image_15436437.png",
    "new_url": "/images/animals/oryx.png"
  },
  {
    "name": "Osprey",
    "old_url": "https://png.pngtree.com/png-vector/20250319/ourmid/pngtree-realistic-osprey-perched-with-detailed-feathers-on-white-background-png-image_15767297.png",
    "new_url": "/images/animals/osprey.png"
  },
  {
    "name": "Ostrich",
    "old_url": "https://pngimg.com/d/ostrich_PNG76983.png",
    "new_url": "/images/animals/ostrich.png"
  },
  {
    "name": "Otter",
    "old_url": "https://png.pngtree.com/png-vector/20240805/ourmid/pngtree-charming-otter-wall-art-bringing-nature-png-image_13387007.png",
    "new_url": "/images/animals/otter.png"
  },
  {
    "name": "Pangolin",
    "old_url": "https://png.pngtree.com/png-clipart/20231006/ourmid/pngtree-indian-pangolin-transparent-background-png-image_10194716.png",
    "new_url": "/images/animals/pangolin.png"
  },
  {
    "name": "Peacock",
    "old_url": "https://png.pngtree.com/png-clipart/20231006/original/pngtree-elegant-peacock-bird---transparent-background-png-image_13280249.png",
    "new_url": "/images/animals/peacock.png"
  },
  {
    "name": "Pelican",
    "old_url": "https://static.vecteezy.com/system/resources/thumbnails/068/620/176/small/pelican-open-mouth-isolated-transparency-background-large-bird-long-beak-standing-wildlife-detailed-feather-texture-expressive-nature-animal-side-view-png.png",
    "new_url": "/images/animals/pelican.png"
  },
  {
    "name": "Peregrine Falcon",
    "old_url": "https://png.pngtree.com/png-vector/20250530/ourmid/pngtree-falcon-isolated-on-a-transparent-background-png-image_16424038.png",
    "new_url": "/images/animals/peregrine-falcon.png"
  },
  {
    "name": "Platypus",
    "old_url": "https://purepng.com/public/uploads/large/platypus-on-the-ground-gw2.png",
    "new_url": "/images/animals/platypus.png"
  },
  {
    "name": "Poison Dart Frog",
    "old_url": "https://static.vecteezy.com/system/resources/previews/056/947/472/non_2x/vibrant-blue-poison-dart-frog-isolated-on-transparent-background-free-png.png",
    "new_url": "/images/animals/poison-dart-frog.png"
  },
  {
    "name": "Polar Bear",
    "old_url": "https://pngimg.com/uploads/polar_bear/polar_bear_PNG14.png",
    "new_url": "/images/animals/polar-bear.png"
  },
  {
    "name": "Porcupine",
    "old_url": "https://static.vecteezy.com/system/resources/previews/055/397/838/non_2x/porcupine-standing-with-quills-on-transparent-background-free-png.png",
    "new_url": "/images/animals/porcupine.png"
  },
  {
    "name": "Praying Mantis",
    "old_url": "https://static.vecteezy.com/system/resources/previews/024/249/345/non_2x/praying-mantis-isolated-on-a-transparent-background-free-png.png",
    "new_url": "/images/animals/praying-mantis.png"
  },
  {
    "name": "Proboscis Monkey",
    "old_url": "https://png.pngtree.com/png-clipart/20250118/original/pngtree-proboscis-monkey-wildlife-vector-art-png-image_19781684.png",
    "new_url": "/images/animals/proboscis-monkey.png"
  },
  {
    "name": "Pronghorn",
    "old_url": "https://png.pngtree.com/png-vector/20250529/ourmid/pngtree-antelope-isolated-on-a-transparent-background-png-image_16406723.png",
    "new_url": "/images/animals/pronghorn.png"
  },
  {
    "name": "Pufferfish",
    "old_url": "https://static.vecteezy.com/system/resources/previews/067/221/377/non_2x/pufferfish-on-a-transparent-background-free-png.png",
    "new_url": "/images/animals/pufferfish.png"
  },
  {
    "name": "Python",
    "old_url": "https://static.vecteezy.com/system/resources/previews/047/828/387/non_2x/python-snake-on-transparent-background-free-png.png",
    "new_url": "/images/animals/python.png"
  },
  {
    "name": "Quokka",
    "old_url": "https://png.pngtree.com/png-vector/20250506/ourmid/pngtree-cute-quokka-standing-on-hind-legs-with-friendly-expression-png-image_16165978.png",
    "new_url": "/images/animals/quokka.png"
  },
  {
    "name": "Quoll",
    "old_url": "https://cdn.pixabay.com/photo/2022/12/14/21/47/quoll-7656363_1280.png",
    "new_url": "/images/animals/quoll.png"
  },
  {
    "name": "Raccoon",
    "old_url": "https://pngimg.com/d/raccoon_PNG16965.png",
    "new_url": "/images/animals/raccoon.png"
  },
  {
    "name": "Rattlesnake",
    "old_url": "https://png.pngtree.com/png-vector/20231101/ourmid/pngtree-portrait-of-a-rattlesnake-animal-png-image_10387215.png",
    "new_url": "/images/animals/rattlesnake.png"
  },
  {
    "name": "Raven",
    "old_url": "https://static.vecteezy.com/system/resources/previews/060/054/534/non_2x/inspired-coastal-a-raven-common-raven-no-background-with-transparent-background-flawless-free-png.png",
    "new_url": "/images/animals/raven.png"
  },
  {
    "name": "Red Fox",
    "old_url": "https://png.pngtree.com/png-clipart/20241103/original/pngtree-a-beautiful-fox-on-transparent-background-png-image_16670328.png",
    "new_url": "/images/animals/red-fox.png"
  },
  {
    "name": "Red Panda",
    "old_url": "https://static.vecteezy.com/system/resources/previews/049/235/608/non_2x/red-panda-on-transparent-background-free-png.png",
    "new_url": "/images/animals/red-panda.png"
  },
  {
    "name": "Red-Eyed Tree Frog",
    "old_url": "https://png.pngtree.com/png-clipart/20231017/original/pngtree-red-eyed-tree-frog-png-image_13339584.png",
    "new_url": "/images/animals/red-eyed-tree-frog.png"
  },
  {
    "name": "Red-tailed Hawk",
    "old_url": "https://png.pngtree.com/png-clipart/20230914/original/pngtree-red-tailed-hawk-vector-png-image_12163349.png",
    "new_url": "/images/animals/red-tailed-hawk.png"
  },
  {
    "name": "Reindeer",
    "old_url": "https://png.pngtree.com/png-clipart/20250420/original/pngtree-a-deer-isolated-with-transparent-background-png-image_20857866.png",
    "new_url": "/images/animals/reindeer.png"
  },
  {
    "name": "Reticulated Python",
    "old_url": "https://png.pngtree.com/png-clipart/20250620/original/pngtree-reticulated-python-isolated-on-a-transparent-background-png-image_21193785.png",
    "new_url": "/images/animals/reticulated-python.png"
  },
  {
    "name": "Rhinoceros",
    "old_url": "https://png.pngtree.com/png-vector/20240131/ourmid/pngtree-rhino-isolated-on-transparent-background-png-image_11636816.png",
    "new_url": "/images/animals/rhinoceros.png"
  },
  {
    "name": "Ring-tailed Lemur",
    "old_url": "https://static.vecteezy.com/system/resources/previews/046/437/488/non_2x/ring-tailed-lemur-side-view-isolated-on-transparent-background-free-png.png",
    "new_url": "/images/animals/ring-tailed-lemur.png"
  },
  {
    "name": "Sable Antelope",
    "old_url": "https://png.pngtree.com/png-clipart/20250528/original/pngtree-black-sable-antelope-with-horns-png-image_21085899.png",
    "new_url": "/images/animals/sable-antelope.png"
  },
  {
    "name": "Sailfish",
    "old_url": "https://png.pngtree.com/png-clipart/20250515/original/pngtree-blue-and-white-sailfish-png-image_20978677.png",
    "new_url": "/images/animals/sailfish.png"
  },
  {
    "name": "Salamander",
    "old_url": "https://static.vecteezy.com/system/resources/previews/060/068/721/non_2x/intense-beautiful-a-salamander-no-background-with-transparent-background-masterfully-captured-free-png.png",
    "new_url": "/images/animals/salamander.png"
  },
  {
    "name": "Saltwater Crocodile",
    "old_url": "https://pngimg.com/d/crocodile_PNG13185.png",
    "new_url": "/images/animals/saltwater-crocodile.png"
  },
  {
    "name": "Sawfish",
    "old_url": "https://png.pngtree.com/png-vector/20250321/ourmid/pngtree-sawfish-fish-isolated-on-transparent-background-png-image_15814118.png",
    "new_url": "/images/animals/sawfish.png"
  },
  {
    "name": "Sea Lion",
    "old_url": "https://static.vecteezy.com/system/resources/previews/046/400/351/non_2x/sea-lion-on-transparent-background-free-png.png",
    "new_url": "/images/animals/sea-lion.png"
  },
  {
    "name": "Sea Otter",
    "old_url": "https://static.vecteezy.com/system/resources/thumbnails/053/775/918/small/playful-otter-holding-a-shell-for-creative-use-on-transparent-background-png.png",
    "new_url": "/images/animals/sea-otter.png"
  },
  {
    "name": "Seal",
    "old_url": "https://static.vecteezy.com/system/resources/previews/049/667/958/non_2x/adorable-baby-seal-with-transparent-background-curious-sea-pup-with-black-background-adorable-marine-animal-with-transparent-background-png.png",
    "new_url": "/images/animals/seal.png"
  },
  {
    "name": "Secretary Bird",
    "old_url": "https://png.pngtree.com/png-clipart/20250105/original/pngtree-majestic-secretary-bird-isolated-on-transparent-background-png-image_18748927.png",
    "new_url": "/images/animals/secretary-bird.png"
  },
  {
    "name": "Serval",
    "old_url": "https://png.pngtree.com/png-clipart/20250520/original/pngtree-vintage-serval-wild-cat-clipart-png-image_21044988.png",
    "new_url": "/images/animals/serval.png"
  },
  {
    "name": "Shoebill",
    "old_url": "https://png.pngtree.com/png-clipart/20250606/original/pngtree-shoebill-standing-exotic-bird-with-transparent-background-png-image_21131112.png",
    "new_url": "/images/animals/shoebill.png"
  },
  {
    "name": "Siberian Tiger",
    "old_url": "https://pngimg.com/uploads/tiger/tiger_PNG23234.png",
    "new_url": "/images/animals/siberian-tiger.png"
  },
  {
    "name": "Skunk",
    "old_url": "https://static.vecteezy.com/system/resources/previews/059/952/883/non_2x/striped-skunk-animal-isolated-on-the-transparent-background-free-png.png",
    "new_url": "/images/animals/skunk.png"
  },
  {
    "name": "Sloth",
    "old_url": "https://static.vecteezy.com/system/resources/previews/048/743/850/non_2x/sloth-perched-on-a-branch-all-by-itself-against-a-transparent-background-png.png",
    "new_url": "/images/animals/sloth.png"
  },
  {
    "name": "Sloth Bear",
    "old_url": "https://png.pngtree.com/png-vector/20250519/ourmid/pngtree-png-sloth-bear-vintage-animal-clipart-png-image_16313847.png",
    "new_url": "/images/animals/sloth-bear.png"
  },
  {
    "name": "Snapping Turtle",
    "old_url": "https://png.pngtree.com/png-vector/20250619/ourmid/pngtree-snapping-turtle-isolated-on-a-transparent-background-png-image_16549683.png",
    "new_url": "/images/animals/snapping-turtle.png"
  },
  {
    "name": "Snow Leopard",
    "old_url": "https://png.pngtree.com/png-clipart/20231008/original/pngtree-snow-leopard-transparent-background-png-image_13290636.png",
    "new_url": "/images/animals/snow-leopard.png"
  },
  {
    "name": "Snowy Owl",
    "old_url": "https://png.pngtree.com/png-vector/20240326/ourmid/pngtree-snowy-owl-in-flight-colored-drawing-realistic-png-image_12204950.png",
    "new_url": "/images/animals/snowy-owl.png"
  },
  {
    "name": "Spectacled Bear",
    "old_url": "https://png.pngtree.com/png-vector/20240221/ourmid/pngtree-spectacled-bear-spectacled-bear-zoo-austria-png-image_11760603.png",
    "new_url": "/images/animals/spectacled-bear.png"
  },
  {
    "name": "Spider Monkey",
    "old_url": "https://pngimg.com/d/monkey_PNG18725.png",
    "new_url": "/images/animals/spider-monkey.png"
  },
  {
    "name": "Stag Beetle",
    "old_url": "https://png.pngtree.com/png-clipart/20250128/original/pngtree-stag-beetle-png-image_20342640.png",
    "new_url": "/images/animals/stag-beetle.png"
  },
  {
    "name": "Stingray",
    "old_url": "https://static.vecteezy.com/system/resources/previews/024/064/362/non_2x/stingray-fish-isolated-on-a-transparent-background-free-png.png",
    "new_url": "/images/animals/stingray.png"
  },
  {
    "name": "Stoat",
    "old_url": "https://static.vecteezy.com/system/resources/previews/071/094/211/non_2x/watercolor-stoat-animal-illustration-on-transparent-background-free-png.png",
    "new_url": "/images/animals/stoat.png"
  },
  {
    "name": "Stork",
    "old_url": "https://png.pngtree.com/png-vector/20240809/ourmid/pngtree-abdims-stork-bird-in-migration-tracking-its-seasonal-movements-png-image_13421084.png",
    "new_url": "/images/animals/stork.png"
  },
  {
    "name": "Sugar Glider",
    "old_url": "https://png.pngtree.com/png-vector/20231018/ourmid/pngtree-sugar-glider-on-white-background-animal-png-image_10243535.png",
    "new_url": "/images/animals/sugar-glider.png"
  },
  {
    "name": "Sun Bear",
    "old_url": "https://png.pngtree.com/png-vector/20240104/ourmid/pngtree-malayan-sunbear-isolated-isolated-png-image_10889116.png",
    "new_url": "/images/animals/sun-bear.png"
  },
  {
    "name": "Swan",
    "old_url": "https://png.pngtree.com/png-vector/20240205/ourmid/pngtree-swan-little-bird-png-image_11623895.png",
    "new_url": "/images/animals/swan.png"
  },
  {
    "name": "Swordfish",
    "old_url": "https://png.pngtree.com/png-clipart/20250417/original/pngtree-swordfish-isolated-on-transparent-background-png-image_20716783.png",
    "new_url": "/images/animals/swordfish.png"
  },
  {
    "name": "Tapir",
    "old_url": "https://png.pngtree.com/png-vector/20250605/ourmid/pngtree-wildlife-tapir-for-digital-design-png-image_16462735.png",
    "new_url": "/images/animals/tapir.png"
  },
  {
    "name": "Tarantula Hawk",
    "old_url": "https://texas.bugoutservice.com/wp-content/uploads/tarantula-hawk-on-white.png",
    "new_url": "/images/animals/tarantula-hawk.png"
  },
  {
    "name": "Tasmanian Devil",
    "old_url": "https://static.vecteezy.com/system/resources/previews/059/466/509/non_2x/a-tasmanian-devil-standing-and-looking-up-with-a-clear-isolated-background-in-a-wildlife-setting-transparent-background-free-png.png",
    "new_url": "/images/animals/tasmanian-devil.png"
  },
  {
    "name": "Tiger Shark",
    "old_url": "https://png.pngtree.com/png-vector/20240315/ourmid/pngtree-tiger-shark-on-white-seawater-underwater-macropredator-png-image_11852038.png",
    "new_url": "/images/animals/tiger-shark.png"
  },
  {
    "name": "Toucan",
    "old_url": "https://png.pngtree.com/png-clipart/20231007/ourmid/pngtree-keel-billed-toucan-transparent-background-png-image_10196216.png",
    "new_url": "/images/animals/toucan.png"
  },
  {
    "name": "Tuna",
    "old_url": "https://png.pngtree.com/png-vector/20231017/ourmid/pngtree-bluefin-tuna-fish-png-image_10202750.png",
    "new_url": "/images/animals/tuna.png"
  },
  {
    "name": "Vulture",
    "old_url": "https://png.pngtree.com/png-clipart/20250521/original/pngtree-realistic-vulture-png-image_21049936.png",
    "new_url": "/images/animals/vulture.png"
  },
  {
    "name": "Wallaby",
    "old_url": "https://www.pngmart.com/files/12/Kangaroo-Wallaby-PNG-Transparent-Image.png",
    "new_url": "/images/animals/wallaby.png"
  },
  {
    "name": "Walrus",
    "old_url": "https://pngimg.com/d/walrus_PNG111771.png",
    "new_url": "/images/animals/walrus.png"
  },
  {
    "name": "Warthog",
    "old_url": "https://static.vecteezy.com/system/resources/thumbnails/057/732/439/small/a-full-body-warthog-isolated-on-transparent-background-png.png",
    "new_url": "/images/animals/warthog.png"
  },
  {
    "name": "Wild Boar",
    "old_url": "https://pngimg.com/d/boar_PNG2.png",
    "new_url": "/images/animals/wild-boar.png"
  },
  {
    "name": "Wild Horse",
    "old_url": "https://www.nicepng.com/png/full/85-852292_running-horse-no-background-transparent-png-image-web.png",
    "new_url": "/images/animals/wild-horse.png"
  },
  {
    "name": "Wildebeest",
    "old_url": "https://png.pngtree.com/png-vector/20231224/ourmid/pngtree-wildebeest-isolated-on-white-background-wild-png-image_11221442.png",
    "new_url": "/images/animals/wildebeest.png"
  },
  {
    "name": "Wolverine",
    "old_url": "https://www.pngkey.com/png/full/97-973354_tierpark-hellabrunn-wolverine-animal-transparent.png",
    "new_url": "/images/animals/wolverine.png"
  },
  {
    "name": "Wombat",
    "old_url": "https://static.vecteezy.com/system/resources/previews/053/648/166/non_2x/a-brown-and-white-wombat-on-a-transparent-background-png.png",
    "new_url": "/images/animals/wombat.png"
  }
];

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in environment');
        process.exit(1);
    }
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('animal_stats');
        const collection = db.collection('animals');
        
        let updated = 0;
        let errors = 0;
        
        for (const update of updates) {
            try {
                const result = await collection.updateOne(
                    { name: update.name },
                    { $set: { image: update.new_url } }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`✅ Updated: ${update.name}`);
                    updated++;
                } else {
                    console.log(`⚠️  Not found or unchanged: ${update.name}`);
                }
            } catch (err) {
                console.error(`❌ Error updating ${update.name}:`, err.message);
                errors++;
            }
        }
        
        console.log(`\nDone! Updated: ${updated}, Errors: ${errors}`);
        
    } finally {
        await client.close();
    }
}

main().catch(console.error);
